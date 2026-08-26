import { Body, Controller, Get, Injectable, Module, Param, Post, UseGuards, Inject } from "@nestjs/common";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

class AdminGrantDto {
  @IsString()
  userId!: string;

  @IsString()
  resourceType!: string;

  @IsString()
  resourceId!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

class CreateCouponDto {
  @IsString()
  @MinLength(3)
  code!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountOffMinor?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

class CreateAffiliateCodeDto {
  @IsString()
  @MinLength(3)
  code!: string;

  @IsString()
  ownerUserId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  commissionBps?: number;
}

@Injectable()
export class AdminService {
  constructor(
  @Inject(PrismaService) private readonly prisma: PrismaService,
) {}

  assertAdmin(user: RequestUser) {
    if (!hasAnyRole(user as never, ["admin", "super_admin", "support_agent"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Admin only", 403);
    }
  }

  async dashboard(user: RequestUser) {
    this.assertAdmin(user);
    const [users, products, orders, entitlements] = await Promise.all([
      this.prisma.user.count({ where: { appId: user.appId } }),
      this.prisma.product.count({ where: { appId: user.appId } }),
      this.prisma.order.count({ where: { appId: user.appId, status: { in: ["PAID", "FULFILLED"] } } }),
      this.prisma.entitlement.count({ where: { appId: user.appId, status: "ACTIVE" } }),
    ]);
    const revenue = await this.prisma.order.aggregate({
      where: { appId: user.appId, status: { in: ["PAID", "FULFILLED"] } },
      _sum: { totalMinor: true },
    });
    return {
      users,
      products,
      paidOrders: orders,
      activeEntitlements: entitlements,
      revenueMinor: revenue._sum.totalMinor ?? 0,
    };
  }

  async listUsers(user: RequestUser) {
    this.assertAdmin(user);
    return this.prisma.user.findMany({
      where: { appId: user.appId },
      select: { id: true, email: true, displayName: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async listOrders(user: RequestUser) {
    this.assertAdmin(user);
    return this.prisma.order.findMany({
      where: { appId: user.appId },
      include: { items: true, payments: true, user: { select: { email: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async grant(user: RequestUser, dto: AdminGrantDto) {
    this.assertAdmin(user);
    const target = await this.prisma.user.findFirst({
      where: { id: dto.userId, appId: user.appId },
    });
    if (!target) {
      throw new AppError(ErrorCodes.NOT_FOUND, "User not found in this app", 404);
    }
    const entitlement = await this.prisma.entitlement.create({
      data: {
        appId: user.appId,
        userId: target.id,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        source: "ADMIN",
        sourceRef: `admin:${user.userId}:${Date.now()}`,
        status: "ACTIVE",
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        metadataJson: { reason: dto.reason },
      },
    });
    await this.prisma.auditLog.create({
      data: {
        appId: user.appId,
        actorUserId: user.userId,
        action: "entitlement.grant",
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        metaJson: { reason: dto.reason, targetUserId: dto.userId },
      },
    });
    return entitlement;
  }

  async auditLogs(user: RequestUser) {
    this.assertAdmin(user);
    return this.prisma.auditLog.findMany({
      where: { appId: user.appId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async reviewQueue(user: RequestUser) {
    this.assertAdmin(user);
    return this.prisma.product.findMany({
      where: { appId: user.appId, status: "IN_REVIEW" },
      include: {
        prices: { take: 1, orderBy: { validFrom: "desc" } },
        course: true,
        document: true,
        creator: { select: { email: true, displayName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  }

  async publishProduct(user: RequestUser, productId: string) {
    this.assertAdmin(user);
    if (!hasAnyRole(user as never, ["admin", "super_admin"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Admin publish only", 403);
    }
    const product = await this.prisma.product.findFirst({
      where: { id: String(productId), appId: user.appId },
      include: { course: true, document: true },
    });
    if (!product) throw new AppError(ErrorCodes.NOT_FOUND, "Product not found", 404);
    await this.prisma.product.update({
      where: { id: product.id },
      data: { status: "PUBLISHED", visibility: "PUBLIC" },
    });
    if (product.course) {
      await this.prisma.course.update({
        where: { id: product.course.id },
        data: { status: "PUBLISHED" },
      });
    }
    if (product.document) {
      await this.prisma.document.update({
        where: { id: product.document.id },
        data: { status: "PUBLISHED" },
      });
    }
    await this.prisma.auditLog.create({
      data: {
        appId: user.appId,
        actorUserId: user.userId,
        action: "product.publish",
        resourceType: "product",
        resourceId: product.id,
        metaJson: { type: product.type },
      },
    });
    return { ok: true, productId: product.id };
  }

  async listCoupons(user: RequestUser) {
    this.assertAdmin(user);
    return this.prisma.coupon.findMany({
      where: { appId: user.appId },
      include: { _count: { select: { redemptions: true } } },
      orderBy: { code: "asc" },
    });
  }

  async createCoupon(user: RequestUser, dto: CreateCouponDto) {
    this.assertAdmin(user);
    if (!dto.percentOff && !dto.amountOffMinor) {
      throw new AppError(ErrorCodes.VALIDATION, "percentOff or amountOffMinor required", 400);
    }
    return this.prisma.coupon.upsert({
      where: { appId_code: { appId: user.appId, code: dto.code.trim().toUpperCase() } },
      update: {
        percentOff: dto.percentOff ?? null,
        amountOffMinor: dto.amountOffMinor ?? null,
        currency: dto.currency || "VND",
        maxRedemptions: dto.maxRedemptions ?? null,
        enabled: dto.enabled ?? true,
      },
      create: {
        appId: user.appId,
        code: dto.code.trim().toUpperCase(),
        percentOff: dto.percentOff ?? null,
        amountOffMinor: dto.amountOffMinor ?? null,
        currency: dto.currency || "VND",
        maxRedemptions: dto.maxRedemptions ?? null,
        enabled: dto.enabled ?? true,
      },
    });
  }

  async listAffiliateCodes(user: RequestUser) {
    this.assertAdmin(user);
    return this.prisma.affiliateCode.findMany({
      where: { appId: user.appId },
      include: {
        owner: { select: { email: true, displayName: true } },
        _count: { select: { commissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createAffiliateCode(user: RequestUser, dto: CreateAffiliateCodeDto) {
    this.assertAdmin(user);
    const owner = await this.prisma.user.findFirst({
      where: { id: dto.ownerUserId, appId: user.appId },
    });
    if (!owner) throw new AppError(ErrorCodes.NOT_FOUND, "Owner user not found", 404);
    return this.prisma.affiliateCode.upsert({
      where: { appId_code: { appId: user.appId, code: dto.code.trim().toUpperCase() } },
      update: {
        ownerUserId: dto.ownerUserId,
        commissionBps: dto.commissionBps ?? 1000,
        active: true,
      },
      create: {
        appId: user.appId,
        code: dto.code.trim().toUpperCase(),
        ownerUserId: dto.ownerUserId,
        commissionBps: dto.commissionBps ?? 1000,
      },
    });
  }

  async listAffiliateCommissions(user: RequestUser) {
    this.assertAdmin(user);
    return this.prisma.affiliateCommission.findMany({
      where: { appId: user.appId },
      include: {
        affiliateCode: { select: { code: true, ownerUserId: true } },
        order: { select: { id: true, totalMinor: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}

@Controller("admin")
@UseGuards(AuthGuard)
export class AdminController {
  constructor(
  @Inject(AdminService) private readonly admin: AdminService,
) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: RequestUser) {
    return this.admin.dashboard(user);
  }

  @Get("users")
  users(@CurrentUser() user: RequestUser) {
    return this.admin.listUsers(user);
  }

  @Get("orders")
  orders(@CurrentUser() user: RequestUser) {
    return this.admin.listOrders(user);
  }

  @Post("entitlements/grant")
  grant(@CurrentUser() user: RequestUser, @Body() dto: AdminGrantDto) {
    return this.admin.grant(user, dto);
  }

  @Get("audit-logs")
  logs(@CurrentUser() user: RequestUser) {
    return this.admin.auditLogs(user);
  }

  @Get("review-queue")
  reviewQueue(@CurrentUser() user: RequestUser) {
    return this.admin.reviewQueue(user);
  }

  @Post("products/:id/publish")
  publishProduct(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.admin.publishProduct(user, id);
  }

  @Get("coupons")
  coupons(@CurrentUser() user: RequestUser) {
    return this.admin.listCoupons(user);
  }

  @Post("coupons")
  createCoupon(@CurrentUser() user: RequestUser, @Body() dto: CreateCouponDto) {
    return this.admin.createCoupon(user, dto);
  }

  @Get("affiliates")
  affiliates(@CurrentUser() user: RequestUser) {
    return this.admin.listAffiliateCodes(user);
  }

  @Post("affiliates")
  createAffiliate(@CurrentUser() user: RequestUser, @Body() dto: CreateAffiliateCodeDto) {
    return this.admin.createAffiliateCode(user, dto);
  }

  @Get("affiliate-commissions")
  affiliateCommissions(@CurrentUser() user: RequestUser) {
    return this.admin.listAffiliateCommissions(user);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
