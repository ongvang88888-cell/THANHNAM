import { Body, Controller, Get, Injectable, Module, Post, UseGuards, Inject } from "@nestjs/common";
import { IsIn, IsOptional, IsString } from "class-validator";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";
import { CommerceModule, CommerceService } from "../commerce/commerce.module";
import { defaultPaymentProvider, isProduction, vnSubscriptionProviders } from "../common/runtime";

class SubscribeDto {
  @IsString()
  planProductId!: string;

  @IsOptional()
  @IsIn(["vnpay", "momo", "zalopay", "mock", "stripe"])
  provider?: "vnpay" | "momo" | "zalopay" | "mock" | "stripe";

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CommerceService) private readonly commerce: CommerceService,
  ) {}

  async my(user: RequestUser) {
    return this.prisma.subscription.findMany({
      where: { userId: user.userId, appId: user.appId },
      orderBy: { createdAt: "desc" },
    });
  }

  async start(user: RequestUser, dto: SubscribeDto) {
    const enabled = await this.prisma.appConfig.findUnique({
      where: { appId_key: { appId: user.appId, key: "subscription_enabled" } },
    });
    if (enabled?.valueJson === false) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Subscriptions disabled for this app", 403);
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.planProductId, appId: user.appId, status: "PUBLISHED" },
    });
    if (!product || (product.type !== "SUBSCRIPTION" && product.type !== "PREMIUM_LIBRARY")) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Subscription plan not found", 404);
    }

    const allowed = ["vnpay", "momo", "zalopay", "mock", "stripe"] as const;
    const raw = dto.provider || (isProduction() ? "vnpay" : defaultPaymentProvider());
    if (!allowed.includes(raw as (typeof allowed)[number])) {
      throw new AppError(ErrorCodes.VALIDATION, "Unsupported subscription provider", 400);
    }
    const provider = raw as (typeof allowed)[number];
    if (isProduction() && !vnSubscriptionProviders().includes(provider)) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        "VN membership must use VNPay, MoMo, or ZaloPay",
        400,
      );
    }

    return this.commerce.checkout(user, {
      productId: product.id,
      provider,
      platform: "web",
      returnUrl: dto.returnUrl,
      idempotencyKey: dto.idempotencyKey || `sub-${user.userId}-${product.id}-${Date.now()}`,
    });
  }
}

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(@Inject(SubscriptionsService) private readonly subscriptions: SubscriptionsService) {}

  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: RequestUser) {
    return this.subscriptions.my(user);
  }

  @Post("start")
  @UseGuards(AuthGuard)
  start(@CurrentUser() user: RequestUser, @Body() dto: SubscribeDto) {
    return this.subscriptions.start(user, dto);
  }
}

@Module({
  imports: [AuthModule, CommerceModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
