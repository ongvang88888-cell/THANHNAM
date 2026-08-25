import { Body, Controller, Get, Headers, Injectable, Module, Param, Post, Req, UseGuards, Inject } from "@nestjs/common";
import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { buildEntitlementGrants, type PaymentProvider } from "@edu/monetization-core";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";
import { MockPaymentProvider } from "./providers/mock.provider";
import { StripePaymentProvider } from "./providers/stripe.provider";
import { VnpayPaymentProvider } from "./providers/vnpay.provider";

class CheckoutDto {
  @IsString()
  productId!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;

  @IsOptional()
  @IsIn(["mock", "stripe", "vnpay"])
  provider?: "mock" | "stripe" | "vnpay";
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
    };
  }

  private provider(name?: string): PaymentProvider {
    const key = name || (process.env.DEFAULT_PAYMENT_PROVIDER ?? "mock");
    const p = this.providers[key];
    if (!p) throw new AppError(ErrorCodes.VALIDATION, `Unknown payment provider: ${key}`);
    return p;
  }

  async checkout(user: RequestUser, dto: CheckoutDto) {
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
    const provider = this.provider(dto.provider);

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

      const intent = await provider.createIntent({
        orderId: created.id,
        amountMinor: amount,
        currency,
        idempotencyKey: dto.idempotencyKey,
        metadata: { productId: product.id, userId: user.userId },
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

      await tx.transaction.create({
        data: {
          paymentId: payment.id,
          type: "CHARGE",
          amountMinor: event.amountMinor,
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
      where: { provider: provider.name, providerRef: event.providerRef },
    });
    const orderId = event.orderId || payment?.orderId;
    if (!orderId) throw new AppError(ErrorCodes.NOT_FOUND, "Order not found for webhook", 404);
    return this.fulfillPaidOrder(orderId, event);
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

  @Get("entitlements/me")
  @UseGuards(AuthGuard)
  entitlements(@CurrentUser() user: RequestUser) {
    return this.commerce.myEntitlements(user);
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
