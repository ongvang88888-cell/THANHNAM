import { Body, Controller, Get, Headers, Injectable, Module, Param, Post, Req, UseGuards, Inject } from "@nestjs/common";
import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import {
  assertProviderAllowedForPlatform,
  buildEntitlementGrants,
  type PaymentProvider,
} from "@edu/monetization-core";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";
import { MockPaymentProvider } from "./providers/mock.provider";
import { StripePaymentProvider } from "./providers/stripe.provider";
import { VnpayPaymentProvider } from "./providers/vnpay.provider";
import { GooglePlayPaymentProvider } from "./providers/google-play.provider";

class CheckoutDto {
  @IsString()
  productId!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;

  @IsOptional()
  @IsIn(["mock", "stripe", "vnpay", "google_play"])
  provider?: "mock" | "stripe" | "vnpay" | "google_play";

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsIn(["web", "android", "ios", "unknown"])
  platform?: "web" | "android" | "ios" | "unknown";
}

class GooglePlayConfirmDto {
  @IsString()
  orderId!: string;

  @IsString()
  @MinLength(8)
  purchaseToken!: string;

  @IsOptional()
  @IsString()
  productId?: string;
}

class RefundDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountMinor?: number;
}

@Injectable()
export class CommerceService {
  private providers: Record<string, PaymentProvider>;

  constructor(
  @Inject(PrismaService) private readonly prisma: PrismaService,
) {
    this.providers = {
      mock: new MockPaymentProvider(),
      stripe: new StripePaymentProvider(),
      vnpay: new VnpayPaymentProvider(),
      google_play: new GooglePlayPaymentProvider(),
    };
  }

  private provider(name?: string): PaymentProvider {
    const key = name || (process.env.DEFAULT_PAYMENT_PROVIDER ?? "mock");
    const p = this.providers[key];
    if (!p) throw new AppError(ErrorCodes.VALIDATION, `Unknown payment provider: ${key}`);
    return p;
  }

  async checkout(user: RequestUser, dto: CheckoutDto) {
    const platform = dto.platform ?? "unknown";
    const providerName = dto.provider || (process.env.DEFAULT_PAYMENT_PROVIDER ?? "mock");
    try {
      assertProviderAllowedForPlatform(providerName, platform);
    } catch (e) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        e instanceof Error ? e.message : "Provider not allowed",
        400,
      );
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, appId: user.appId, status: "PUBLISHED" },
      include: {
        prices: { orderBy: { validFrom: "desc" }, take: 1 },
        bundle: { include: { items: true } },
      },
    });
    if (!product || !product.prices[0]) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Product not available", 404);
    }

    const existing = await this.prisma.order.findUnique({
      where: { appId_idempotencyKey: { appId: user.appId, idempotencyKey: dto.idempotencyKey } },
      include: { payments: true, items: true },
    });
    if (existing) {
      return { order: existing, replayed: true };
    }

    const amount = product.prices[0].amountMinor;
    const currency = product.prices[0].currency;
    const provider = this.provider(providerName);
    const meta = (product.metadataJson ?? {}) as Record<string, unknown>;
    const playSku =
      typeof meta.playSku === "string" && meta.playSku.length > 0 ? meta.playSku : product.slug;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          appId: user.appId,
          userId: user.userId,
          status: "AWAITING_PAYMENT",
          currency,
          totalMinor: amount,
          idempotencyKey: dto.idempotencyKey,
          items: {
            create: {
              productId: product.id,
              quantity: 1,
              unitAmountMinor: amount,
            },
          },
        },
        include: { items: true },
      });

      const returnUrl = (dto.returnUrl || "http://localhost:3000/checkout/return")
        .replace(/ORDER_PLACEHOLDER|PENDING/g, created.id)
        .replace(/([?&]orderId=)[^&]*/i, `$1${created.id}`);
      const withOrder = returnUrl.includes("orderId=")
        ? returnUrl
        : `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}orderId=${created.id}`;

      const intent = await provider.createIntent({
        orderId: created.id,
        amountMinor: amount,
        currency,
        idempotencyKey: dto.idempotencyKey,
        returnUrl: withOrder,
        metadata: {
          productId: product.id,
          userId: user.userId,
          playSku,
          sku: playSku,
          platform,
        },
      });

      await tx.payment.create({
        data: {
          orderId: created.id,
          provider: provider.name,
          providerRef: intent.providerRef,
          status: "PENDING",
          amountMinor: amount,
          currency,
          normalizedJson: intent as object,
        },
      });

      return { created, intent };
    });

    // Dev convenience: mock provider auto-fulfills
    if (provider.name === "mock") {
      await this.fulfillPaidOrder(order.created.id, {
        provider: "mock",
        providerEventId: `mock_evt_${order.created.id}`,
        providerRef: order.intent.providerRef,
        status: "SUCCEEDED",
        amountMinor: amount,
        raw: {},
      });
      const fulfilled = await this.prisma.order.findUniqueOrThrow({
        where: { id: order.created.id },
        include: { items: true, payments: true },
      });
      return { order: fulfilled, intent: order.intent, fulfilled: true };
    }

    return { order: order.created, intent: order.intent };
  }

  async fulfillPaidOrder(
    orderId: string,
    event: {
      provider: string;
      providerEventId: string;
      providerRef: string;
      status: "SUCCEEDED" | "FAILED" | "REFUNDED";
      amountMinor: number;
      raw: Record<string, unknown>;
    },
  ) {
    if (event.status !== "SUCCEEDED") {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: "FAILED" },
      });
      return { ok: false };
    }

    return this.prisma.$transaction(async (tx) => {
      const existingTx = await tx.transaction.findUnique({
        where: { providerEventId: event.providerEventId },
      });
      if (existingTx) return { ok: true, replayed: true };

      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          items: { include: { product: { include: { bundle: { include: { items: true } } } } } },
          payments: true,
        },
      });

      if (order.status === "FULFILLED" || order.status === "PAID") {
        return { ok: true, already: true };
      }

      const payment = order.payments[0];
      if (!payment) throw new AppError(ErrorCodes.NOT_FOUND, "Payment missing", 404);

      if (event.amountMinor > 0 && event.amountMinor !== payment.amountMinor) {
        throw new AppError(
          ErrorCodes.PAYMENT_FAILED,
          `Payment amount mismatch: expected ${payment.amountMinor}, got ${event.amountMinor}`,
          400,
        );
      }

      await tx.transaction.create({
        data: {
          paymentId: payment.id,
          type: "CHARGE",
          amountMinor: event.amountMinor || payment.amountMinor,
          providerEventId: event.providerEventId,
        },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCEEDED", providerRef: event.providerRef },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });

      const grantInputs = order.items.map((item) => ({
        orderItemId: item.id,
        productId: item.productId,
        productType: item.product.type,
        childProductIds: item.product.bundle?.items.map((i) => i.productId) ?? [],
      }));

      const grants = buildEntitlementGrants(grantInputs);
      for (const g of grants) {
        await tx.entitlement.upsert({
          where: {
            userId_resourceType_resourceId_source_sourceRef: {
              userId: order.userId,
              resourceType: g.resourceType,
              resourceId: g.resourceId,
              source: g.source,
              sourceRef: g.sourceRef,
            },
          },
          update: { status: "ACTIVE", expiresAt: g.expiresAt ?? null },
          create: {
            appId: order.appId,
            userId: order.userId,
            resourceType: g.resourceType,
            resourceId: g.resourceId,
            source: g.source,
            sourceRef: g.sourceRef,
            status: "ACTIVE",
            expiresAt: g.expiresAt ?? null,
          },
        });
      }

      await tx.order.update({ where: { id: order.id }, data: { status: "FULFILLED" } });

      await tx.notification.create({
        data: {
          userId: order.userId,
          channel: "in_app",
          title: "Purchase successful",
          body: "Quyền truy cập nội dung đã được kích hoạt.",
          metaJson: { orderId: order.id },
        },
      });

      await tx.analyticsEvent.create({
        data: {
          appId: order.appId,
          userId: order.userId,
          name: "payment_success",
          propsJson: { orderId: order.id, amountMinor: event.amountMinor },
        },
      });

      return { ok: true };
    });
  }

  async myOrders(user: RequestUser) {
    return this.prisma.order.findMany({
      where: { userId: user.userId, appId: user.appId },
      include: { items: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getOrder(user: RequestUser, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: String(orderId), userId: user.userId, appId: user.appId },
      include: {
        items: { include: { product: true } },
        payments: true,
      },
    });
    if (!order) throw new AppError(ErrorCodes.NOT_FOUND, "Order not found", 404);
    return order;
  }

  async myEntitlements(user: RequestUser) {
    return this.prisma.entitlement.findMany({
      where: { userId: user.userId, appId: user.appId, status: "ACTIVE" },
      orderBy: { grantedAt: "desc" },
    });
  }

  async handleWebhook(providerName: string, headers: Record<string, string | undefined>, rawBody: string) {
    const provider = this.provider(providerName);
    const event = await provider.verifyWebhook(headers, rawBody);
    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: provider.name,
        OR: [
          { providerRef: event.providerRef },
          ...(event.orderId ? [{ orderId: event.orderId }] : []),
        ],
      },
    });
    const orderId = event.orderId || payment?.orderId;
    if (!orderId) throw new AppError(ErrorCodes.NOT_FOUND, "Order not found for webhook", 404);
    if (event.status === "REFUNDED") {
      return this.refundOrderInternal(orderId, {
        reason: "provider_webhook",
        providerEventId: event.providerEventId,
        amountMinor: event.amountMinor || payment?.amountMinor,
        skipProviderCall: true,
      });
    }
    return this.fulfillPaidOrder(orderId, event);
  }

  async confirmGooglePlay(user: RequestUser, dto: GooglePlayConfirmDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: String(dto.orderId), userId: user.userId, appId: user.appId },
      include: { payments: true, items: true },
    });
    if (!order) throw new AppError(ErrorCodes.NOT_FOUND, "Order not found", 404);
    const payment = order.payments[0];
    if (!payment || payment.provider !== "google_play") {
      throw new AppError(ErrorCodes.VALIDATION, "Order is not a Google Play payment", 400);
    }
    if (order.status === "FULFILLED" || order.status === "PAID") {
      return { ok: true, already: true, order };
    }

    const productId = dto.productId || order.items[0]?.productId;
    const event = await this.provider("google_play").verifyWebhook(
      {},
      JSON.stringify({
        orderId: order.id,
        purchaseToken: dto.purchaseToken,
        productId,
        amountMinor: payment.amountMinor,
        eventId: `gp_confirm_${dto.purchaseToken.slice(0, 16)}`,
      }),
    );

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: dto.purchaseToken },
    });

    await this.fulfillPaidOrder(order.id, event);
    const updated = await this.prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true, payments: true },
    });
    return { ok: true, order: updated, fulfilled: true };
  }

  async refundOrder(actor: RequestUser, orderId: string, dto: RefundDto) {
    if (!hasAnyRole(actor as never, ["admin", "super_admin", "support_agent"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Admin refund only", 403);
    }
    return this.refundOrderInternal(orderId, {
      reason: dto.reason || "admin_refund",
      amountMinor: dto.amountMinor,
      actorUserId: actor.userId,
      skipProviderCall: false,
    });
  }

  private async refundOrderInternal(
    orderId: string,
    opts: {
      reason: string;
      amountMinor?: number;
      actorUserId?: string;
      providerEventId?: string;
      skipProviderCall?: boolean;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: String(orderId) },
      include: {
        payments: { include: { refunds: true } },
        items: true,
      },
    });
    if (!order) throw new AppError(ErrorCodes.NOT_FOUND, "Order not found", 404);
    if (order.status === "REFUNDED") {
      return { ok: true, already: true };
    }
    if (order.status !== "PAID" && order.status !== "FULFILLED" && order.status !== "REFUND_PENDING") {
      throw new AppError(ErrorCodes.VALIDATION, `Cannot refund order in status ${order.status}`, 400);
    }

    const payment = order.payments[0];
    if (!payment) throw new AppError(ErrorCodes.NOT_FOUND, "Payment missing", 404);
    const amount = opts.amountMinor ?? payment.amountMinor;
    const provider = this.provider(payment.provider);

    let providerRefundId = opts.providerEventId || `local_refund_${order.id}`;
    if (!opts.skipProviderCall && provider.refund) {
      const result = await provider.refund({
        providerRef: payment.providerRef || payment.id,
        amountMinor: amount,
        reason: opts.reason,
        orderId: order.id,
      });
      providerRefundId = result.providerRefundId;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.refund.create({
        data: {
          paymentId: payment.id,
          amountMinor: amount,
          reason: opts.reason,
          status: "SUCCEEDED",
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: amount >= payment.amountMinor ? "REFUNDED" : "PARTIALLY_REFUNDED" },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "REFUNDED" },
      });

      const sourceRefs = order.items.map((i) => i.id);
      await tx.entitlement.updateMany({
        where: {
          userId: order.userId,
          sourceRef: { in: sourceRefs },
          status: "ACTIVE",
        },
        data: { status: "REVOKED" },
      });

      await tx.notification.create({
        data: {
          userId: order.userId,
          channel: "in_app",
          title: "Refund processed",
          body: "Đơn hàng đã được hoàn tiền; quyền truy cập liên quan đã bị thu hồi.",
          metaJson: { orderId: order.id, providerRefundId },
        },
      });

      if (opts.actorUserId) {
        await tx.auditLog.create({
          data: {
            appId: order.appId,
            actorUserId: opts.actorUserId,
            action: "order.refund",
            resourceType: "order",
            resourceId: order.id,
            metaJson: { amountMinor: amount, reason: opts.reason, providerRefundId },
          },
        });
      }
    });

    return { ok: true, orderId: order.id, providerRefundId, amountMinor: amount };
  }
}

@Controller()
export class CommerceController {
  constructor(
  @Inject(CommerceService) private readonly commerce: CommerceService,
) {}

  @Post("checkout/sessions")
  @UseGuards(AuthGuard)
  checkout(@CurrentUser() user: RequestUser, @Body() dto: CheckoutDto) {
    return this.commerce.checkout(user, dto);
  }

  @Get("orders")
  @UseGuards(AuthGuard)
  orders(@CurrentUser() user: RequestUser) {
    return this.commerce.myOrders(user);
  }

  @Get("orders/:id")
  @UseGuards(AuthGuard)
  order(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.commerce.getOrder(user, id);
  }

  @Get("entitlements/me")
  @UseGuards(AuthGuard)
  entitlements(@CurrentUser() user: RequestUser) {
    return this.commerce.myEntitlements(user);
  }

  @Post("payments/google-play/confirm")
  @UseGuards(AuthGuard)
  confirmPlay(@CurrentUser() user: RequestUser, @Body() dto: GooglePlayConfirmDto) {
    return this.commerce.confirmGooglePlay(user, dto);
  }

  @Post("orders/:id/refund")
  @UseGuards(AuthGuard)
  refund(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: RefundDto,
  ) {
    return this.commerce.refundOrder(user, id, dto);
  }

  @Post("payments/webhooks/:provider")
  webhook(
    @Param("provider") provider: string,
    @Headers() headers: Record<string, string | undefined>,
    @Req() req: { body: Buffer | object; rawBody?: Buffer },
  ) {
    const raw =
      req.rawBody?.toString("utf8") ??
      (Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body));
    return this.commerce.handleWebhook(provider, headers, raw);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [CommerceController],
  providers: [CommerceService],
  exports: [CommerceService],
})
export class CommerceModule {}
