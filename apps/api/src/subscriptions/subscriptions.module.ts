import { Body, Controller, Get, Injectable, Module, Post, UseGuards, Inject } from "@nestjs/common";
import { IsString } from "class-validator";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

class SubscribeDto {
  @IsString()
  planProductId!: string;
}

@Injectable()
export class SubscriptionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async my(user: RequestUser) {
    return this.prisma.subscription.findMany({
      where: { userId: user.userId, appId: user.appId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * MVP subscription: creates INCOMPLETE then activates with entitlement when mock/payment succeeds.
   * Real Stripe Billing / VNPay recurring can plug in later via provider adapters.
   */
  async start(user: RequestUser, dto: SubscribeDto) {
    const enabled = await this.prisma.appConfig.findUnique({
      where: { appId_key: { appId: user.appId, key: "subscription_enabled" } },
    });
    if (enabled?.valueJson === false) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Subscriptions disabled for this app", 403);
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.planProductId, appId: user.appId, status: "PUBLISHED" },
      include: { prices: { take: 1, orderBy: { validFrom: "desc" } } },
    });
    if (!product) throw new AppError(ErrorCodes.NOT_FOUND, "Plan not found", 404);

    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 3600_000);

    const sub = await this.prisma.$transaction(async (tx) => {
      const created = await tx.subscription.create({
        data: {
          appId: user.appId,
          userId: user.userId,
          planProductId: product.id,
          status: "ACTIVE",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: created.id,
          type: "activated",
          payloadJson: { mock: true },
        },
      });
      await tx.entitlement.upsert({
        where: {
          userId_resourceType_resourceId_source_sourceRef: {
            userId: user.userId,
            resourceType: "product",
            resourceId: product.id,
            source: "SUBSCRIPTION",
            sourceRef: created.id,
          },
        },
        update: { status: "ACTIVE", expiresAt: periodEnd },
        create: {
          appId: user.appId,
          userId: user.userId,
          resourceType: "product",
          resourceId: product.id,
          source: "SUBSCRIPTION",
          sourceRef: created.id,
          status: "ACTIVE",
          expiresAt: periodEnd,
        },
      });
      await tx.notification.create({
        data: {
          userId: user.userId,
          channel: "in_app",
          title: "Subscription active",
          body: `Gói ${product.name} đã kích hoạt đến ${periodEnd.toISOString()}.`,
          metaJson: { subscriptionId: created.id },
        },
      });
      return created;
    });

    return { subscription: sub };
  }
}

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(
    @Inject(SubscriptionsService) private readonly subscriptions: SubscriptionsService,
  ) {}

  @Get("me")
  @UseGuards(AuthGuard)
  mine(@CurrentUser() user: RequestUser) {
    return this.subscriptions.my(user);
  }

  @Post("start")
  @UseGuards(AuthGuard)
  start(@CurrentUser() user: RequestUser, @Body() dto: SubscribeDto) {
    return this.subscriptions.start(user, dto);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
