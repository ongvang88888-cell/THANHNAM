import {
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Module,
  Param,
  Post,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

const ATTR_WINDOW_MS = 30 * 24 * 3600_000;
const MIN_PAYOUT_MINOR = Number(process.env.AFFILIATE_MIN_PAYOUT_MINOR || 500_000);

class TrackDto {
  @IsString()
  @MinLength(3)
  code!: string;

  @IsString()
  @MinLength(8)
  visitorKey!: string;
}

class PayoutRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amountMinor?: number;

  @IsOptional()
  bankInfoJson?: Record<string, unknown>;
}

class ResolvePayoutDto {
  @IsString()
  status!: "APPROVED" | "PAID" | "REJECTED";

  @IsOptional()
  @IsString()
  adminNote?: string;
}

@Injectable()
export class AffiliateService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resolveAppId(header?: string) {
    const slug = header || process.env.APP_ID || "education_app";
    const app = await this.prisma.app.findFirst({
      where: { OR: [{ id: slug }, { slug }] },
    });
    if (!app) throw new AppError(ErrorCodes.NOT_FOUND, "App not found", 404);
    return app.id;
  }

  async track(appId: string, dto: TrackDto, userId?: string) {
    const code = dto.code.trim().toUpperCase();
    const aff = await this.prisma.affiliateCode.findUnique({
      where: { appId_code: { appId, code } },
    });
    if (!aff || !aff.active) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Affiliate code not found", 404);
    }
    if (userId && aff.ownerUserId === userId) {
      throw new AppError(ErrorCodes.VALIDATION, "Cannot attribute your own code", 400);
    }
    const expiresAt = new Date(Date.now() + ATTR_WINDOW_MS);
    return this.prisma.affiliateAttribution.upsert({
      where: { appId_visitorKey: { appId, visitorKey: dto.visitorKey } },
      update: {
        affiliateCodeId: aff.id,
        userId: userId ?? undefined,
        expiresAt,
      },
      create: {
        appId,
        visitorKey: dto.visitorKey,
        userId: userId ?? null,
        affiliateCodeId: aff.id,
        expiresAt,
      },
    });
  }

  async resolveCodeId(
    appId: string,
    opts: { affiliateCode?: string; visitorKey?: string; userId?: string },
  ): Promise<string | undefined> {
    if (opts.affiliateCode?.trim()) {
      const aff = await this.prisma.affiliateCode.findUnique({
        where: {
          appId_code: { appId, code: opts.affiliateCode.trim().toUpperCase() },
        },
      });
      if (aff?.active) {
        if (opts.userId && aff.ownerUserId === opts.userId) {
          throw new AppError(ErrorCodes.VALIDATION, "Cannot use your own affiliate code", 400);
        }
        return aff.id;
      }
      throw new AppError(ErrorCodes.NOT_FOUND, "Affiliate code not found", 404);
    }

    if (!opts.visitorKey && !opts.userId) return undefined;

    const now = new Date();
    const attr = await this.prisma.affiliateAttribution.findFirst({
      where: {
        appId,
        expiresAt: { gt: now },
        OR: [
          ...(opts.visitorKey ? [{ visitorKey: opts.visitorKey }] : []),
          ...(opts.userId ? [{ userId: opts.userId }] : []),
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: { affiliateCode: true },
    });
    if (!attr?.affiliateCode.active) return undefined;
    if (opts.userId && attr.affiliateCode.ownerUserId === opts.userId) return undefined;
    return attr.affiliateCodeId;
  }

  async balance(user: RequestUser) {
    const codes = await this.prisma.affiliateCode.findMany({
      where: { appId: user.appId, ownerUserId: user.userId },
    });
    const codeIds = codes.map((c) => c.id);
    const earned = await this.prisma.affiliateCommission.aggregate({
      where: { affiliateCodeId: { in: codeIds }, status: "EARNED" },
      _sum: { amountMinor: true },
    });
    const paid = await this.prisma.affiliatePayout.aggregate({
      where: {
        ownerUserId: user.userId,
        appId: user.appId,
        status: { in: ["APPROVED", "PAID", "REQUESTED"] },
      },
      _sum: { amountMinor: true },
    });
    const earnedMinor = earned._sum.amountMinor ?? 0;
    const reservedMinor = paid._sum.amountMinor ?? 0;
    return {
      earnedMinor,
      reservedMinor,
      availableMinor: Math.max(0, earnedMinor - reservedMinor),
      minPayoutMinor: MIN_PAYOUT_MINOR,
      codes,
    };
  }

  async requestPayout(user: RequestUser, dto: PayoutRequestDto) {
    const bal = await this.balance(user);
    const amount = dto.amountMinor ?? bal.availableMinor;
    if (amount < MIN_PAYOUT_MINOR) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        `Minimum payout is ${MIN_PAYOUT_MINOR} minor units`,
        400,
      );
    }
    if (amount > bal.availableMinor) {
      throw new AppError(ErrorCodes.VALIDATION, "Insufficient available balance", 400);
    }
    const primary = bal.codes[0];
    return this.prisma.affiliatePayout.create({
      data: {
        appId: user.appId,
        ownerUserId: user.userId,
        affiliateCodeId: primary?.id,
        amountMinor: amount,
        currency: "VND",
        status: "REQUESTED",
        bankInfoJson: (dto.bankInfoJson ?? {}) as object,
      },
    });
  }

  myPayouts(user: RequestUser) {
    return this.prisma.affiliatePayout.findMany({
      where: { ownerUserId: user.userId, appId: user.appId },
      orderBy: { requestedAt: "desc" },
      take: 50,
    });
  }

  async listPayoutsAdmin(actor: RequestUser) {
    if (!hasAnyRole(actor as never, ["admin", "super_admin", "support_agent"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Admin only", 403);
    }
    return this.prisma.affiliatePayout.findMany({
      where: { appId: actor.appId },
      include: { owner: { select: { email: true, displayName: true } } },
      orderBy: { requestedAt: "desc" },
      take: 100,
    });
  }

  async resolvePayout(actor: RequestUser, id: string, dto: ResolvePayoutDto) {
    if (!hasAnyRole(actor as never, ["admin", "super_admin"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Admin only", 403);
    }
    const row = await this.prisma.affiliatePayout.findFirst({
      where: { id, appId: actor.appId },
    });
    if (!row) throw new AppError(ErrorCodes.NOT_FOUND, "Payout not found", 404);
    const now = new Date();
    const updated = await this.prisma.affiliatePayout.update({
      where: { id },
      data: {
        status: dto.status,
        adminNote: dto.adminNote,
        resolvedAt: now,
        paidAt: dto.status === "PAID" ? now : row.paidAt,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        appId: actor.appId,
        actorUserId: actor.userId,
        action: "affiliate.payout.resolve",
        resourceType: "affiliate_payout",
        resourceId: id,
        metaJson: { status: dto.status, amountMinor: row.amountMinor },
      },
    });
    await this.prisma.notification.create({
      data: {
        userId: row.ownerUserId,
        channel: "in_app",
        title: `Affiliate payout ${dto.status.toLowerCase()}`,
        body: `Yêu cầu rút ${row.amountMinor.toLocaleString("vi-VN")}₫ → ${dto.status}`,
        metaJson: { payoutId: id },
      },
    });
    return updated;
  }
}

@Controller()
export class AffiliateController {
  constructor(@Inject(AffiliateService) private readonly affiliate: AffiliateService) {}

  @Post("affiliate/track")
  async track(
    @Headers("x-app-id") appHeader: string | undefined,
    @Body() dto: TrackDto,
  ) {
    const appId = await this.affiliate.resolveAppId(appHeader);
    return this.affiliate.track(appId, dto);
  }

  @Post("affiliate/track/me")
  @UseGuards(AuthGuard)
  async trackMe(@CurrentUser() user: RequestUser, @Body() dto: TrackDto) {
    return this.affiliate.track(user.appId, dto, user.userId);
  }

  @Get("affiliate/balance")
  @UseGuards(AuthGuard)
  balance(@CurrentUser() user: RequestUser) {
    return this.affiliate.balance(user);
  }

  @Post("affiliate/payouts")
  @UseGuards(AuthGuard)
  requestPayout(@CurrentUser() user: RequestUser, @Body() dto: PayoutRequestDto) {
    return this.affiliate.requestPayout(user, dto);
  }

  @Get("affiliate/payouts")
  @UseGuards(AuthGuard)
  myPayouts(@CurrentUser() user: RequestUser) {
    return this.affiliate.myPayouts(user);
  }

  @Get("admin/affiliate-payouts")
  @UseGuards(AuthGuard)
  adminList(@CurrentUser() user: RequestUser) {
    return this.affiliate.listPayoutsAdmin(user);
  }

  @Post("admin/affiliate-payouts/:id/resolve")
  @UseGuards(AuthGuard)
  adminResolve(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: ResolvePayoutDto,
  ) {
    return this.affiliate.resolvePayout(user, id, dto);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [AffiliateController],
  providers: [AffiliateService],
  exports: [AffiliateService],
})
export class AffiliateModule {}
