import { Body, Controller, Get, Headers, Injectable, Module, Param, Post, Req, UseGuards, Inject } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import {
  assertChargeAmountMatches,
  assertCouponRedeemable,
  assertFullRefundOnly,
  assertProviderAllowedForPlatform,
  assertSkuMatchesExpected,
  buildEntitlementGrants,
  canFulfillOrder,
  canRefundOrder,
  computeAffiliateCommissionMinor,
  computeCouponDiscountMinor,
  isAlreadyFulfilled,
  isAlreadyRefunded,
  normalizeRefundAmount,
  resolveStoreSku,
  stableProviderEventId,
  type PaymentProvider,
  type VerifiedPaymentEvent,
} from "@edu/monetization-core";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";
import { MockPaymentProvider } from "./providers/mock.provider";
import { StripePaymentProvider } from "./providers/stripe.provider";
import { VnpayPaymentProvider } from "./providers/vnpay.provider";
import { MomoPaymentProvider } from "./providers/momo.provider";
import { ZalopayPaymentProvider } from "./providers/zalopay.provider";
import { GooglePlayPaymentProvider } from "./providers/google-play.provider";
import { AppleIapPaymentProvider } from "./providers/apple-iap.provider";
import { CampaignsModule, CampaignsService } from "../campaigns/campaigns.module";
import {
  allowMockPayments,
  assertProviderForEnvironment,
  computeInvoiceAmounts,
  defaultPaymentProvider,
} from "../common/runtime";
import { sendReceiptEmail } from "../common/mailer";
import { AffiliateModule, AffiliateService } from "../affiliate/affiliate.module";

class CheckoutDto {
  @IsString()
  productId!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;

  @IsOptional()
  @IsIn(["mock", "stripe", "vnpay", "momo", "zalopay", "google_play", "apple_iap"])
  provider?: "mock" | "stripe" | "vnpay" | "momo" | "zalopay" | "google_play" | "apple_iap";

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsIn(["web", "android", "ios", "unknown"])
  platform?: "web" | "android" | "ios" | "unknown";

  @IsOptional()
  @IsString()
  couponCode?: string;

  /** Affiliate referral code (`ref` query / body) */
  @IsOptional()
  @IsString()
  affiliateCode?: string;

  /** Last-click visitor cookie key (30-day attribution window) */
  @IsOptional()
  @IsString()
  visitorKey?: string;
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

class AppleIapConfirmDto {
  @IsString()
  orderId!: string;

  @IsString()
  @MinLength(8)
  transactionId!: string;

  @IsOptional()
  @IsString()
  signedTransaction?: string;

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
  @Inject(CampaignsService) private readonly campaigns: CampaignsService,
  @Inject(AffiliateService) private readonly affiliate: AffiliateService,
) {
    this.providers = {
      mock: new MockPaymentProvider(),
      stripe: new StripePaymentProvider(),
      vnpay: new VnpayPaymentProvider(),
      momo: new MomoPaymentProvider(),
      zalopay: new ZalopayPaymentProvider(),
      google_play: new GooglePlayPaymentProvider(),
      apple_iap: new AppleIapPaymentProvider(),
    };
  }

  private provider(name?: string): PaymentProvider {
    const key = name || defaultPaymentProvider();
    try {
      assertProviderForEnvironment(key);
    } catch (e) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        e instanceof Error ? e.message : "Provider not allowed",
        400,
      );
    }
    const p = this.providers[key];
    if (!p) throw new AppError(ErrorCodes.VALIDATION, `Unknown payment provider: ${key}`);
    return p;
  }

  async checkout(user: RequestUser, dto: CheckoutDto) {
    const platform = dto.platform ?? "unknown";
    const providerName = dto.provider || defaultPaymentProvider();
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

    const listPrice = product.prices[0].amountMinor;
    const currency = product.prices[0].currency;
    const provider = this.provider(providerName);
    const meta = (product.metadataJson ?? {}) as Record<string, unknown>;
    const storeSku = resolveStoreSku(provider.name, meta, product.slug);

    let couponId: string | undefined;
    let discountMinor = 0;
    if (dto.couponCode?.trim()) {
      const coupon = await this.prisma.coupon.findUnique({
        where: {
          appId_code: { appId: user.appId, code: dto.couponCode.trim().toUpperCase() },
        },
      });
      if (!coupon) throw new AppError(ErrorCodes.NOT_FOUND, "Coupon not found", 404);
      const redemptionCount = await this.prisma.couponRedemption.count({
        where: { couponId: coupon.id },
      });
      try {
        assertCouponRedeemable({ ...coupon, redemptionCount }, currency);
      } catch (e) {
        throw new AppError(
          ErrorCodes.VALIDATION,
          e instanceof Error ? e.message : "Coupon not redeemable",
          400,
        );
      }
      discountMinor = computeCouponDiscountMinor(coupon, listPrice);
      couponId = coupon.id;
    }

    const campaign = await this.campaigns.activeForProduct(user.appId, product.id);
    if (campaign) {
      const campDisc = this.campaigns.discountForCampaign(campaign, listPrice);
      if (campDisc > discountMinor) {
        discountMinor = campDisc;
        // Campaign wins on amount; keep couponId if also present for analytics
      }
    }

    let affiliateCodeId: string | undefined;
    try {
      affiliateCodeId = await this.affiliate.resolveCodeId(user.appId, {
        affiliateCode: dto.affiliateCode,
        visitorKey: dto.visitorKey,
        userId: user.userId,
      });
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw e;
    }

    const amount = Math.max(0, listPrice - discountMinor);

    const order = await this.prisma.$transaction(async (tx) => {
      if (couponId) {
        await tx.$queryRaw`SELECT id FROM "Coupon" WHERE id = ${couponId} FOR UPDATE`;
        const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
        if (coupon?.maxRedemptions) {
          const used = await tx.couponRedemption.count({ where: { couponId } });
          const pending = await tx.order.count({
            where: { couponId, status: { in: ["AWAITING_PAYMENT", "PAID", "FULFILLED"] } },
          });
          if (used + pending >= coupon.maxRedemptions) {
            throw new AppError(ErrorCodes.VALIDATION, "Coupon redemption limit reached", 400);
          }
        }
      }
      const created = await tx.order.create({
        data: {
          appId: user.appId,
          userId: user.userId,
          status: "AWAITING_PAYMENT",
          currency,
          totalMinor: amount,
          discountMinor,
          couponId: couponId ?? null,
          affiliateCodeId: affiliateCodeId ?? null,
          idempotencyKey: dto.idempotencyKey,
          items: {
            create: {
              productId: product.id,
              quantity: 1,
              unitAmountMinor: listPrice,
              metadataJson: {
                listPriceMinor: listPrice,
                discountMinor,
                couponId: couponId ?? null,
              },
            },
          },
        },
        include: { items: true },
      });

      if (affiliateCodeId) {
        await tx.affiliateCommission.create({
          data: {
            appId: user.appId,
            affiliateCodeId,
            orderId: created.id,
            amountMinor: 0,
            currency,
            status: "PENDING",
          },
        });
      }

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
          playSku: storeSku,
          appleSku: storeSku,
          sku: storeSku,
          platform,
          couponId: couponId ?? "",
          affiliateCodeId: affiliateCodeId ?? "",
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
          normalizedJson: {
            ...intent,
            expectedSku: storeSku,
            appAccountToken: intent.clientAction.appAccountToken,
            discountMinor,
            couponId: couponId ?? null,
            affiliateCodeId: affiliateCodeId ?? null,
          } as object,
        },
      });

      return { created, intent };
    });

    // Dev convenience: mock provider auto-fulfills — never in production unless allowed.
    if (provider.name === "mock" && allowMockPayments()) {
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
      return { order: fulfilled, intent: order.intent, fulfilled: true, discountMinor };
    }

    return { order: order.created, intent: order.intent, discountMinor };
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
    // Never mutate order to FAILED on REFUNDED/unknown — refund path owns REFUNDED.
    if (event.status !== "SUCCEEDED") {
      return { ok: false, reason: `event_status_${event.status}` };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Serialize concurrent webhook/confirm for the same order (Postgres).
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;

      const existingTx = await tx.transaction.findUnique({
        where: { providerEventId: event.providerEventId },
      });
      if (existingTx) return { ok: true, replayed: true };

      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          items: { include: { product: { include: { bundle: { include: { items: true } } } } } },
          payments: true,
          user: true,
        },
      });

      if (isAlreadyFulfilled(order.status)) {
        return { ok: true, already: true };
      }
      if (isAlreadyRefunded(order.status)) {
        throw new AppError(ErrorCodes.VALIDATION, "Cannot fulfill a refunded order", 409);
      }
      if (!canFulfillOrder(order.status)) {
        throw new AppError(
          ErrorCodes.VALIDATION,
          `Cannot fulfill order in status ${order.status}`,
          409,
        );
      }

      const payment = order.payments[0];
      if (!payment) throw new AppError(ErrorCodes.NOT_FOUND, "Payment missing", 404);

      try {
        assertChargeAmountMatches(event.amountMinor, payment.amountMinor);
      } catch (e) {
        throw new AppError(
          ErrorCodes.PAYMENT_FAILED,
          e instanceof Error ? e.message : "Payment amount mismatch",
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

      if (order.couponId) {
        const alreadyRedeemed = await tx.couponRedemption.findFirst({
          where: { couponId: order.couponId, orderId: order.id },
        });
        if (!alreadyRedeemed) {
          await tx.couponRedemption.create({
            data: {
              couponId: order.couponId,
              userId: order.userId,
              orderId: order.id,
            },
          });
        }
      }

      if (order.affiliateCodeId) {
        const aff = await tx.affiliateCode.findUnique({
          where: { id: order.affiliateCodeId },
        });
        const commissionAmount = computeAffiliateCommissionMinor(
          order.totalMinor,
          aff?.commissionBps ?? Number(process.env.AFFILIATE_DEFAULT_BPS || 1000),
        );
        await tx.affiliateCommission.upsert({
          where: { orderId: order.id },
          update: {
            amountMinor: commissionAmount,
            status: "EARNED",
          },
          create: {
            appId: order.appId,
            affiliateCodeId: order.affiliateCodeId,
            orderId: order.id,
            amountMinor: commissionAmount,
            currency: order.currency,
            status: "EARNED",
          },
        });
      }

      const periodEnd = new Date(Date.now() + 30 * 24 * 3600_000);
      for (const item of order.items) {
        if (item.product.type === "SUBSCRIPTION" || item.product.type === "PREMIUM_LIBRARY") {
          const sub = await tx.subscription.create({
            data: {
              appId: order.appId,
              userId: order.userId,
              planProductId: item.productId,
              status: "ACTIVE",
              currentPeriodStart: new Date(),
              currentPeriodEnd: periodEnd,
            },
          });
          await tx.subscriptionEvent.create({
            data: {
              subscriptionId: sub.id,
              type: "activated",
              payloadJson: { orderId: order.id, provider: event.provider },
            },
          });
          await tx.entitlement.updateMany({
            where: {
              userId: order.userId,
              resourceType: "subscription",
              resourceId: item.productId,
              sourceRef: item.id,
            },
            data: { expiresAt: periodEnd, sourceRef: sub.id },
          });
        }
      }

      const amounts = computeInvoiceAmounts(order.totalMinor, order.discountMinor);
      const number = `INV-${new Date().getUTCFullYear()}-${order.id.slice(-8).toUpperCase()}`;
      await tx.invoice.create({
        data: {
          appId: order.appId,
          orderId: order.id,
          userId: order.userId,
          number,
          currency: order.currency,
          subtotalMinor: amounts.subtotalMinor,
          vatBps: amounts.vatBps,
          vatMinor: amounts.vatMinor,
          totalMinor: amounts.totalMinor,
          buyerName: order.user.displayName,
          buyerEmail: order.user.email,
        },
      });

      await tx.notification.create({
        data: {
          userId: order.userId,
          channel: "in_app",
          title: "Purchase successful",
          body: "Quyền truy cập nội dung đã được kích hoạt.",
          metaJson: { orderId: order.id, invoiceNumber: number },
        },
      });

      await tx.analyticsEvent.create({
        data: {
          appId: order.appId,
          userId: order.userId,
          name: "payment_success",
          propsJson: {
            orderId: order.id,
            amountMinor: event.amountMinor || payment.amountMinor,
            providerEventId: event.providerEventId,
            discountMinor: order.discountMinor,
            couponId: order.couponId,
            affiliateCodeId: order.affiliateCodeId,
          },
        },
      });

      return { ok: true, invoiceNumber: number, buyerEmail: order.user.email };
    });

    if (result && "invoiceNumber" in result && result.invoiceNumber && "buyerEmail" in result && result.buyerEmail) {
      void sendReceiptEmail(result.buyerEmail, result.invoiceNumber, orderId);
    }
    return result;
  }

  async myOrders(user: RequestUser) {
    return this.prisma.order.findMany({
      where: { userId: user.userId, appId: user.appId },
      include: { items: true, payments: true, invoice: true },
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
        invoice: true,
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
    const orderId = await this.resolveOrderIdForEvent(provider.name, event);
    if (!orderId) throw new AppError(ErrorCodes.NOT_FOUND, "Order not found for webhook", 404);
    if (event.status === "REFUNDED") {
      return this.refundOrderInternal(orderId, {
        reason: "provider_webhook",
        providerEventId: event.providerEventId,
        // ASN/RTDN often omit amount — treat 0 as "full refund of payment"
        amountMinor: event.amountMinor > 0 ? event.amountMinor : undefined,
        skipProviderCall: true,
      });
    }
    await this.assertProviderRefNotReused(provider.name, event.providerRef, orderId);
    await this.assertEventSkuMatchesPayment(orderId, event);
    return this.fulfillPaidOrder(orderId, event);
  }

  async confirmGooglePlay(user: RequestUser, dto: GooglePlayConfirmDto) {
    return this.confirmStorePurchase(user, {
      provider: "google_play",
      orderId: dto.orderId,
      body: {
        orderId: dto.orderId,
        purchaseToken: dto.purchaseToken,
        productId: dto.productId,
      },
    });
  }

  async confirmAppleIap(user: RequestUser, dto: AppleIapConfirmDto) {
    return this.confirmStorePurchase(user, {
      provider: "apple_iap",
      orderId: dto.orderId,
      body: {
        orderId: dto.orderId,
        transactionId: dto.transactionId,
        signedTransaction: dto.signedTransaction,
        productId: dto.productId,
      },
    });
  }

  private async confirmStorePurchase(
    user: RequestUser,
    input: { provider: "google_play" | "apple_iap"; orderId: string; body: Record<string, unknown> },
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: String(input.orderId), userId: user.userId, appId: user.appId },
      include: { payments: true, items: true },
    });
    if (!order) throw new AppError(ErrorCodes.NOT_FOUND, "Order not found", 404);
    const payment = order.payments[0];
    if (!payment || payment.provider !== input.provider) {
      throw new AppError(ErrorCodes.VALIDATION, `Order is not a ${input.provider} payment`, 400);
    }
    if (isAlreadyFulfilled(order.status)) {
      return { ok: true, already: true, order };
    }
    if (!canFulfillOrder(order.status)) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        `Cannot confirm payment for order in status ${order.status}`,
        409,
      );
    }

    const normalized = (payment.normalizedJson ?? {}) as Record<string, unknown>;
    const expectedSku =
      (typeof normalized.expectedSku === "string" && normalized.expectedSku) ||
      (typeof (normalized.clientAction as { sku?: string } | undefined)?.sku === "string"
        ? (normalized.clientAction as { sku: string }).sku
        : undefined);

    const event = await this.provider(input.provider).verifyWebhook(
      {},
      JSON.stringify({
        ...input.body,
        productId: input.body.productId || expectedSku,
        amountMinor: payment.amountMinor,
        eventId:
          input.provider === "google_play"
            ? stableProviderEventId(
                "gp_confirm",
                String(input.body.purchaseToken || ""),
              )
            : stableProviderEventId(
                "apple_confirm",
                String(input.body.transactionId || ""),
              ),
      }),
    );

    try {
      assertSkuMatchesExpected(expectedSku, event.sku);
    } catch (e) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        e instanceof Error ? e.message : "SKU mismatch",
        400,
      );
    }

    await this.assertProviderRefNotReused(input.provider, event.providerRef, order.id);

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: event.providerRef },
    });

    await this.fulfillPaidOrder(order.id, {
      ...event,
      amountMinor: event.amountMinor || payment.amountMinor,
    });
    const updated = await this.prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true, payments: true },
    });
    return { ok: true, order: updated, fulfilled: true };
  }

  private async resolveOrderIdForEvent(
    providerName: string,
    event: VerifiedPaymentEvent,
  ): Promise<string | undefined> {
    if (event.orderId) return event.orderId;

    if (event.appAccountToken) {
      const byToken = await this.prisma.payment.findFirst({
        where: {
          provider: providerName,
          // Prisma JSON path filter
          normalizedJson: { path: ["appAccountToken"], equals: event.appAccountToken },
        },
      });
      if (byToken) return byToken.orderId;
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: providerName,
        OR: [{ providerRef: event.providerRef }],
      },
      orderBy: { createdAt: "desc" },
    });
    return payment?.orderId;
  }

  /** Prevent the same store purchase token/transaction from fulfilling two orders. */
  private async assertProviderRefNotReused(
    provider: string,
    providerRef: string,
    currentOrderId: string,
  ) {
    if (!providerRef) return;
    const existing = await this.prisma.payment.findFirst({
      where: {
        provider,
        providerRef,
        status: { in: ["SUCCEEDED", "REFUNDED", "PARTIALLY_REFUNDED"] },
        orderId: { not: currentOrderId },
      },
    });
    if (existing) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        "Store purchase token already used for another order",
        409,
      );
    }
  }

  private async assertEventSkuMatchesPayment(orderId: string, event: VerifiedPaymentEvent) {
    const payment = await this.prisma.payment.findFirst({ where: { orderId } });
    if (!payment) return;
    const normalized = (payment.normalizedJson ?? {}) as Record<string, unknown>;
    const expectedSku =
      typeof normalized.expectedSku === "string" ? normalized.expectedSku : undefined;
    try {
      assertSkuMatchesExpected(expectedSku, event.sku);
    } catch (e) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        e instanceof Error ? e.message : "SKU mismatch",
        400,
      );
    }
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
    const orderPeek = await this.prisma.order.findUnique({
      where: { id: String(orderId) },
      include: { payments: true, items: true },
    });
    if (!orderPeek) throw new AppError(ErrorCodes.NOT_FOUND, "Order not found", 404);
    if (isAlreadyRefunded(orderPeek.status)) {
      return { ok: true, already: true };
    }
    if (!canRefundOrder(orderPeek.status)) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        `Cannot refund order in status ${orderPeek.status}`,
        400,
      );
    }

    const paymentPeek = orderPeek.payments[0];
    if (!paymentPeek) throw new AppError(ErrorCodes.NOT_FOUND, "Payment missing", 404);

    const amount = normalizeRefundAmount(opts.amountMinor, paymentPeek.amountMinor);
    try {
      assertFullRefundOnly(amount, paymentPeek.amountMinor);
    } catch (e) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        e instanceof Error ? e.message : "Partial refund not allowed",
        400,
      );
    }

    const providerEventId = opts.providerEventId || `local_refund_${orderPeek.id}`;

    // Fast idempotent path for webhook replays (unique Transaction.providerEventId)
    const existingRefundTx = await this.prisma.transaction.findUnique({
      where: { providerEventId },
    });
    if (existingRefundTx) {
      return {
        ok: true,
        already: true,
        replayed: true,
        orderId: orderPeek.id,
        providerRefundId: providerEventId,
        amountMinor: amount,
      };
    }

    const provider = this.provider(paymentPeek.provider);
    let providerRefundId = providerEventId;
    let externalRefundId: string | undefined;
    if (!opts.skipProviderCall && provider.refund) {
      const result = await provider.refund({
        providerRef: paymentPeek.providerRef || paymentPeek.id,
        amountMinor: amount,
        reason: opts.reason,
        orderId: orderPeek.id,
      });
      externalRefundId = result.providerRefundId;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;

      const again = await tx.transaction.findUnique({ where: { providerEventId } });
      if (again) {
        return {
          ok: true,
          already: true,
          replayed: true,
          orderId,
          providerRefundId: providerEventId,
          amountMinor: amount,
        };
      }

      const order = await tx.order.findUniqueOrThrow({
        where: { id: String(orderId) },
        include: { payments: true, items: true },
      });
      if (isAlreadyRefunded(order.status)) {
        return { ok: true, already: true, orderId: order.id, providerRefundId, amountMinor: amount };
      }
      if (!canRefundOrder(order.status)) {
        throw new AppError(
          ErrorCodes.VALIDATION,
          `Cannot refund order in status ${order.status}`,
          400,
        );
      }

      const payment = order.payments[0];
      if (!payment) throw new AppError(ErrorCodes.NOT_FOUND, "Payment missing", 404);

      await tx.transaction.create({
        data: {
          paymentId: payment.id,
          type: "REFUND",
          amountMinor: amount,
          providerEventId,
        },
      });

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
        data: { status: "REFUNDED" },
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

      await tx.affiliateCommission.updateMany({
        where: { orderId: order.id, status: { in: ["PENDING", "EARNED"] } },
        data: { status: "REVERSED" },
      });

      await tx.notification.create({
        data: {
          userId: order.userId,
          channel: "in_app",
          title: "Refund processed",
          body: "Đơn hàng đã được hoàn tiền; quyền truy cập liên quan đã bị thu hồi.",
          metaJson: {
            orderId: order.id,
            providerRefundId,
            externalRefundId,
            reason: opts.reason,
          },
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
            metaJson: {
              amountMinor: amount,
              reason: opts.reason,
              providerRefundId,
              externalRefundId,
            },
          },
        });
      }

      await tx.analyticsEvent.create({
        data: {
          appId: order.appId,
          userId: order.userId,
          name: "payment_refunded",
          propsJson: { orderId: order.id, amountMinor: amount, providerEventId },
        },
      });

      return { ok: true, orderId: order.id, providerRefundId, amountMinor: amount };
    });
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

  @Post("payments/apple-iap/confirm")
  @UseGuards(AuthGuard)
  confirmApple(@CurrentUser() user: RequestUser, @Body() dto: AppleIapConfirmDto) {
    return this.commerce.confirmAppleIap(user, dto);
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

  @SkipThrottle()
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
  imports: [AuthModule, CampaignsModule, AffiliateModule],
  controllers: [CommerceController],
  providers: [CommerceService],
  exports: [CommerceService],
})
export class CommerceModule {}
