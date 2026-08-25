import { Body, Controller, Get, Injectable, Module, Post, UseGuards, Inject } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
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
    const entitlement = await this.prisma.entitlement.create({
      data: {
        appId: user.appId,
        userId: dto.userId,
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
}

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
