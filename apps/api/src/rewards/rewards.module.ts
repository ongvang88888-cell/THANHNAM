import { createHash, randomBytes } from "node:crypto";
import { Body, Controller, Get, Injectable, Module, Post, Query, UseGuards, Inject } from "@nestjs/common";
import { IsString } from "class-validator";
import { evaluateRewardEligibility, verifyAdmobSsvSignature } from "@edu/monetization-core";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

class EligibilityDto {
  @IsString()
  resourceType!: string;

  @IsString()
  resourceId!: string;

  @IsString()
  policyCode!: string;
}

@Injectable()
export class RewardsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async rewardedEnabled(appId: string) {
    const cfg = await this.prisma.appConfig.findUnique({
      where: { appId_key: { appId, key: "rewarded_enabled" } },
    });
    return cfg?.valueJson !== false;
  }

  async eligibility(user: RequestUser, dto: EligibilityDto) {
    const policy = await this.prisma.rewardPolicy.findUnique({
      where: { appId_code: { appId: user.appId, code: dto.policyCode } },
    });
    if (!policy || !policy.enabled) {
      throw new AppError(ErrorCodes.REWARD_DENIED, "Reward policy unavailable", 403);
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const dailyCount = await this.prisma.rewardTransaction.count({
      where: {
        userId: user.userId,
        status: "GRANTED",
        createdAt: { gte: startOfDay },
      },
    });
    const last = await this.prisma.rewardTransaction.findFirst({
      where: { userId: user.userId, status: "GRANTED" },
      orderBy: { createdAt: "desc" },
    });

    const check = evaluateRewardEligibility({
      userId: user.userId,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      dailyCount,
      dailyLimit: policy.dailyLimit,
      lastGrantedAt: last?.createdAt,
      cooldownMinutes: policy.cooldownMinutes,
      now: new Date(),
      rewardedEnabled: await this.rewardedEnabled(user.appId),
    });

    if (!check.eligible) {
      return { eligible: false, reason: check.reason };
    }

    const nonce = randomBytes(24).toString("hex");
    const session = await this.prisma.rewardSession.create({
      data: {
        userId: user.userId,
        appId: user.appId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        policyId: policy.id,
        nonce,
        expiresAt: new Date(Date.now() + 15 * 60_000),
      },
    });

    return {
      eligible: true,
      rewardSessionId: session.id,
      customData: session.nonce,
      durationHours: policy.durationHours,
      dailyLimit: policy.dailyLimit,
      dailyUsed: dailyCount,
    };
  }

  async handleSsv(query: Record<string, string>) {
    const transactionId = query.transaction_id;
    const customData = query.custom_data;
    const userIdParam = query.user_id;

    if (!transactionId || !customData) {
      throw new AppError(ErrorCodes.VALIDATION, "Missing SSV params");
    }

    const verified = await verifyAdmobSsvSignature(query);
    if (!verified.ok) {
      throw new AppError(ErrorCodes.REWARD_DENIED, `SSV rejected: ${verified.reason}`, 401);
    }

    const session = await this.prisma.rewardSession.findUnique({ where: { nonce: customData } });
    if (!session || session.consumedAt || session.expiresAt.getTime() < Date.now()) {
      await this.prisma.analyticsEvent.create({
        data: {
          appId: session?.appId ?? "unknown",
          userId: session?.userId,
          name: "reward_denied",
          propsJson: { reason: "invalid_session", transactionId },
        },
      });
      throw new AppError(ErrorCodes.REWARD_DENIED, "Invalid reward session", 403);
    }

    if (userIdParam && userIdParam !== session.userId) {
      throw new AppError(ErrorCodes.REWARD_DENIED, "User mismatch", 403);
    }

    const existing = await this.prisma.rewardTransaction.findUnique({
      where: { provider_providerTxId: { provider: "admob", providerTxId: transactionId } },
    });
    if (existing) {
      return { ok: true, replayed: true };
    }

    const policy = await this.prisma.rewardPolicy.findUniqueOrThrow({
      where: { id: session.policyId },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.rewardSession.update({
        where: { id: session.id },
        data: { consumedAt: new Date() },
      });

      const expiresAt = new Date(Date.now() + policy.durationHours * 3600_000);
      const sourceRef = `reward:${transactionId}`;

      const entitlement = await tx.entitlement.upsert({
        where: {
          userId_resourceType_resourceId_source_sourceRef: {
            userId: session.userId,
            resourceType: session.resourceType,
            resourceId: session.resourceId,
            source: "REWARD",
            sourceRef,
          },
        },
        update: { status: "ACTIVE", expiresAt },
        create: {
          appId: session.appId,
          userId: session.userId,
          resourceType: session.resourceType,
          resourceId: session.resourceId,
          source: "REWARD",
          sourceRef,
          status: "ACTIVE",
          expiresAt,
        },
      });

      await tx.rewardTransaction.create({
        data: {
          appId: session.appId,
          userId: session.userId,
          provider: "admob",
          providerTxId: transactionId,
          policyId: policy.id,
          resourceType: session.resourceType,
          resourceId: session.resourceId,
          status: "GRANTED",
          rewardSessionId: session.id,
          verifiedAt: new Date(),
          grantEntitlementId: entitlement.id,
        },
      });

      await tx.analyticsEvent.create({
        data: {
          appId: session.appId,
          userId: session.userId,
          name: "reward_granted",
          propsJson: {
            transactionId,
            resourceType: session.resourceType,
            resourceId: session.resourceId,
            expiresAt,
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: session.userId,
          channel: "in_app",
          title: "Reward unlocked",
          body: "Bạn đã mở khóa nội dung tạm thời bằng quảng cáo thưởng.",
          metaJson: { entitlementId: entitlement.id, expiresAt },
        },
      });

      return { entitlementId: entitlement.id, expiresAt };
    });

    return { ok: true, ...result };
  }

  async devComplete(user: RequestUser, rewardSessionId: string) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError(ErrorCodes.FORBIDDEN, "Not available", 403);
    }
    const session = await this.prisma.rewardSession.findUnique({ where: { id: rewardSessionId } });
    if (!session || session.userId !== user.userId) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Session not found", 404);
    }
    const txId = `dev_${createHash("sha256").update(rewardSessionId + Date.now()).digest("hex").slice(0, 24)}`;
    return this.handleSsv({
      transaction_id: txId,
      custom_data: session.nonce,
      user_id: user.userId,
      signature: "dev",
    });
  }
}

@Controller("rewards")
export class RewardsController {
  constructor(@Inject(RewardsService) private readonly rewards: RewardsService) {}

  @Post("eligibility")
  @UseGuards(AuthGuard)
  eligibility(@CurrentUser() user: RequestUser, @Body() dto: EligibilityDto) {
    return this.rewards.eligibility(user, dto);
  }

  @Get("ssv/admob")
  ssv(@Query() query: Record<string, string>) {
    return this.rewards.handleSsv(query);
  }

  @Post("dev/complete")
  @UseGuards(AuthGuard)
  devComplete(@CurrentUser() user: RequestUser, @Body() body: { rewardSessionId: string }) {
    return this.rewards.devComplete(user, body.rewardSessionId);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [RewardsController],
  providers: [RewardsService],
})
export class RewardsModule {}
