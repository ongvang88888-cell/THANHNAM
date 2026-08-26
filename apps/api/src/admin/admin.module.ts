import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";
import { CourseImportController } from "./course-import.controller";
import { CourseImportService } from "./course-import.service";

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

const PRODUCT_STATUSES = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED", "REJECTED"] as const;
const VISIBILITIES = ["PUBLIC", "UNLISTED", "PRIVATE"] as const;
const PRODUCT_TYPES = [
  "VIDEO_COURSE",
  "DIGITAL_DOCUMENT",
  "COURSE_BUNDLE",
  "DOCUMENT_BUNDLE",
  "MIXED_BUNDLE",
  "SUBSCRIPTION",
  "PREMIUM_LIBRARY",
  "CERTIFICATE_PRODUCT",
  "OTHER_DIGITAL_PRODUCT",
] as const;

class AdminCreateCourseDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMinor?: number;

  @IsOptional()
  @IsString()
  creatorUserId?: string;

  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;
}

class AdminUpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtMinor?: number;

  @IsOptional()
  @IsIn(PRODUCT_STATUSES)
  status?: (typeof PRODUCT_STATUSES)[number];

  @IsOptional()
  @IsIn(VISIBILITIES)
  visibility?: (typeof VISIBILITIES)[number];

  @IsOptional()
  @IsString()
  creatorUserId?: string;
}

function slugifyTitle(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "khoa-hoc";
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

  assertPublisher(user: RequestUser) {
    this.assertAdmin(user);
    if (!hasAnyRole(user as never, ["admin", "super_admin"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Admin publish only", 403);
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
    const users = await this.prisma.user.findMany({
      where: { appId: user.appId },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        createdAt: true,
        roles: { select: { role: { select: { code: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return users.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      status: row.status,
      createdAt: row.createdAt,
      roles: row.roles.map((item) => item.role.code),
    }));
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
    this.assertPublisher(user);
    return this.setProductLifecycle(user, productId, "PUBLISHED", "PUBLIC", "product.publish");
  }

  async unpublishProduct(user: RequestUser, productId: string) {
    this.assertPublisher(user);
    return this.setProductLifecycle(user, productId, "DRAFT", "PRIVATE", "product.unpublish");
  }

  async rejectProduct(user: RequestUser, productId: string) {
    this.assertPublisher(user);
    return this.setProductLifecycle(user, productId, "REJECTED", "PRIVATE", "product.reject");
  }

  async archiveProduct(user: RequestUser, productId: string) {
    this.assertPublisher(user);
    return this.setProductLifecycle(user, productId, "ARCHIVED", "PRIVATE", "product.archive");
  }

  async listProducts(user: RequestUser, q?: string, status?: string, type?: string) {
    this.assertAdmin(user);
    const query = q?.trim();
    if (status && !PRODUCT_STATUSES.includes(status as (typeof PRODUCT_STATUSES)[number])) {
      throw new AppError(ErrorCodes.VALIDATION, "Invalid product status", 400);
    }
    if (type && !PRODUCT_TYPES.includes(type as (typeof PRODUCT_TYPES)[number])) {
      throw new AppError(ErrorCodes.VALIDATION, "Invalid product type", 400);
    }
    const products = await this.prisma.product.findMany({
      where: {
        appId: user.appId,
        ...(status ? { status: status as (typeof PRODUCT_STATUSES)[number] } : {}),
        ...(type ? { type: type as (typeof PRODUCT_TYPES)[number] } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { slug: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        prices: { take: 1, orderBy: { validFrom: "desc" } },
        course: { include: { _count: { select: { sections: true } } } },
        creator: { select: { id: true, email: true, displayName: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return products.map((product) => this.toCatalogRow(product));
  }

  async getProduct(user: RequestUser, productId: string) {
    this.assertAdmin(user);
    const product = await this.prisma.product.findFirst({
      where: { id: String(productId), appId: user.appId },
      include: {
        prices: { take: 1, orderBy: { validFrom: "desc" } },
        course: {
          include: {
            _count: { select: { sections: true } },
            sections: {
              include: { _count: { select: { lessons: true } } },
              orderBy: { position: "asc" },
            },
          },
        },
        creator: { select: { id: true, email: true, displayName: true } },
        _count: { select: { orderItems: true } },
      },
    });
    if (!product) throw new AppError(ErrorCodes.NOT_FOUND, "Product not found", 404);
    return {
      ...this.toCatalogRow(product),
      sections: product.course?.sections.map((section) => ({
        id: section.id,
        title: section.title,
        lessonCount: section._count.lessons,
      })) ?? [],
    };
  }

  async createCourse(user: RequestUser, dto: AdminCreateCourseDto) {
    this.assertPublisher(user);
    const creatorId = dto.creatorUserId?.trim() || user.userId;
    const creator = await this.prisma.user.findFirst({
      where: { id: creatorId, appId: user.appId },
    });
    if (!creator) throw new AppError(ErrorCodes.NOT_FOUND, "Creator user not found", 404);

    const slug = await this.uniqueSlug(user.appId, dto.slug || slugifyTitle(dto.title));
    const created = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          appId: user.appId,
          type: "VIDEO_COURSE",
          name: dto.title.trim(),
          slug,
          description: dto.description ?? "",
          status: "DRAFT",
          visibility: "PRIVATE",
          creatorUserId: creator.id,
          prices: {
            create: {
              currency: "VND",
              amountMinor: dto.priceMinor ?? 0,
            },
          },
        },
      });
      const course = await tx.course.create({
        data: {
          appId: user.appId,
          productId: product.id,
          title: dto.title.trim(),
          status: "DRAFT",
          creatorUserId: creator.id,
        },
      });
      await tx.courseSection.create({
        data: {
          courseId: course.id,
          title: "Chương 1",
          position: 1,
        },
      });
      await tx.auditLog.create({
        data: {
          appId: user.appId,
          actorUserId: user.userId,
          action: "product.create",
          resourceType: "product",
          resourceId: product.id,
          metaJson: { creatorUserId: creator.id, slug },
        },
      });
      return { productId: product.id, courseId: course.id };
    });

    if (dto.publishNow) {
      await this.setProductLifecycle(user, created.productId, "PUBLISHED", "PUBLIC", "product.publish");
    }
    return this.getProduct(user, created.productId);
  }

  async updateProduct(user: RequestUser, productId: string, dto: AdminUpdateProductDto) {
    this.assertPublisher(user);
    const product = await this.prisma.product.findFirst({
      where: { id: String(productId), appId: user.appId },
      include: { course: true, document: true, prices: { take: 1, orderBy: { validFrom: "desc" } } },
    });
    if (!product) throw new AppError(ErrorCodes.NOT_FOUND, "Product not found", 404);

    if (dto.slug && dto.slug !== product.slug) {
      const clash = await this.prisma.product.findFirst({
        where: { appId: user.appId, slug: dto.slug, NOT: { id: product.id } },
      });
      if (clash) throw new AppError(ErrorCodes.CONFLICT, "Slug already in use", 409);
    }

    let creatorUserId = product.creatorUserId;
    if (dto.creatorUserId) {
      const creator = await this.prisma.user.findFirst({
        where: { id: dto.creatorUserId, appId: user.appId },
      });
      if (!creator) throw new AppError(ErrorCodes.NOT_FOUND, "Creator user not found", 404);
      creatorUserId = creator.id;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.slug ? { slug: dto.slug.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.thumbnailUrl !== undefined ? { thumbnailUrl: dto.thumbnailUrl || null } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.visibility ? { visibility: dto.visibility } : {}),
          ...(creatorUserId ? { creatorUserId } : {}),
        },
      });
      if (product.course) {
        await tx.course.update({
          where: { id: product.course.id },
          data: {
            ...(dto.name ? { title: dto.name.trim() } : {}),
            ...(dto.status ? { status: dto.status } : {}),
            ...(creatorUserId ? { creatorUserId } : {}),
          },
        });
      }
      if (product.document && dto.name) {
        await tx.document.update({
          where: { id: product.document.id },
          data: { title: dto.name.trim() },
        });
      }
      if (dto.priceMinor !== undefined || dto.compareAtMinor !== undefined) {
        const price = product.prices[0];
        if (price) {
          await tx.productPrice.update({
            where: { id: price.id },
            data: {
              ...(dto.priceMinor !== undefined ? { amountMinor: dto.priceMinor } : {}),
              ...(dto.compareAtMinor !== undefined ? { compareAtMinor: dto.compareAtMinor } : {}),
            },
          });
        } else {
          await tx.productPrice.create({
            data: {
              productId: product.id,
              currency: "VND",
              amountMinor: dto.priceMinor ?? 0,
              compareAtMinor: dto.compareAtMinor ?? null,
            },
          });
        }
      }
      await tx.auditLog.create({
        data: {
          appId: user.appId,
          actorUserId: user.userId,
          action: "product.update",
          resourceType: "product",
          resourceId: product.id,
          metaJson: { fields: Object.keys(dto) },
        },
      });
    });
    return this.getProduct(user, product.id);
  }

  async deleteProduct(user: RequestUser, productId: string, hard?: boolean) {
    this.assertPublisher(user);
    if (!hard) {
      return this.archiveProduct(user, productId);
    }

    const product = await this.prisma.product.findFirst({
      where: { id: String(productId), appId: user.appId },
      include: {
        course: true,
        document: true,
        bundle: true,
        _count: { select: { orderItems: true, bundleItems: true } },
      },
    });
    if (!product) throw new AppError(ErrorCodes.NOT_FOUND, "Product not found", 404);
    if (!["DRAFT", "REJECTED", "ARCHIVED"].includes(product.status)) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        "Only draft, rejected, or archived products can be permanently deleted",
        400,
      );
    }
    if (product._count.orderItems > 0) {
      throw new AppError(ErrorCodes.VALIDATION, "Cannot delete a product that already has orders", 400);
    }
    if (product._count.bundleItems > 0) {
      throw new AppError(ErrorCodes.VALIDATION, "Remove this product from bundles before deleting", 400);
    }

    const entitlements = await this.prisma.entitlement.count({
      where: {
        appId: user.appId,
        resourceType: "product",
        resourceId: product.id,
        status: "ACTIVE",
      },
    });
    if (entitlements > 0) {
      throw new AppError(ErrorCodes.VALIDATION, "Cannot delete a product with active entitlements", 400);
    }

    if (product.course) {
      const certificates = await this.prisma.certificate.count({
        where: { courseId: product.course.id },
      });
      if (certificates > 0) {
        throw new AppError(ErrorCodes.VALIDATION, "Cannot delete a course that already issued certificates", 400);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (product.course) {
        const lessons = await tx.lesson.findMany({
          where: { section: { courseId: product.course.id } },
          select: { id: true },
        });
        const lessonIds = lessons.map((lesson) => lesson.id);
        if (lessonIds.length > 0) {
          await tx.lessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } });
        }
        await tx.courseProgress.deleteMany({ where: { courseId: product.course.id } });
        await tx.courseAnnouncement.deleteMany({ where: { courseId: product.course.id } });
        await tx.quiz.deleteMany({ where: { courseId: product.course.id } });
        await tx.courseSection.deleteMany({ where: { courseId: product.course.id } });
        await tx.course.delete({ where: { id: product.course.id } });
      }
      if (product.document) {
        await tx.document.delete({ where: { id: product.document.id } });
      }
      if (product.bundle) {
        await tx.bundleItem.deleteMany({ where: { bundleId: product.bundle.id } });
        await tx.bundle.delete({ where: { id: product.bundle.id } });
      }
      await tx.productPrice.deleteMany({ where: { productId: product.id } });
      await tx.productTag.deleteMany({ where: { productId: product.id } });
      await tx.review.deleteMany({ where: { productId: product.id } });
      await tx.wishlistItem.deleteMany({ where: { productId: product.id } });
      await tx.product.delete({ where: { id: product.id } });
      await tx.auditLog.create({
        data: {
          appId: user.appId,
          actorUserId: user.userId,
          action: "product.delete",
          resourceType: "product",
          resourceId: product.id,
          metaJson: { hard: true, name: product.name },
        },
      });
    });
    return { ok: true, deleted: true, productId: product.id };
  }

  private async setProductLifecycle(
    user: RequestUser,
    productId: string,
    status: (typeof PRODUCT_STATUSES)[number],
    visibility: (typeof VISIBILITIES)[number],
    action: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: String(productId), appId: user.appId },
      include: { course: true, document: true },
    });
    if (!product) throw new AppError(ErrorCodes.NOT_FOUND, "Product not found", 404);
    await this.prisma.product.update({
      where: { id: product.id },
      data: { status, visibility },
    });
    if (product.course) {
      await this.prisma.course.update({
        where: { id: product.course.id },
        data: { status },
      });
    }
    if (product.document) {
      await this.prisma.document.update({
        where: { id: product.document.id },
        data: { status },
      });
    }
    await this.prisma.auditLog.create({
      data: {
        appId: user.appId,
        actorUserId: user.userId,
        action,
        resourceType: "product",
        resourceId: product.id,
        metaJson: { type: product.type, status, visibility },
      },
    });
    return { ok: true, productId: product.id, status, visibility };
  }

  private async uniqueSlug(appId: string, raw: string): Promise<string> {
    const base = slugifyTitle(raw);
    for (let i = 0; i < 8; i += 1) {
      const candidate = i === 0 ? base : `${base}-${Date.now().toString(36).slice(-4)}${i}`;
      const existing = await this.prisma.product.findFirst({
        where: { appId, slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
    }
    return `${base}-${Date.now()}`;
  }

  private toCatalogRow(product: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    visibility: string;
    description: string;
    thumbnailUrl: string | null;
    creatorUserId: string | null;
    updatedAt: Date;
    createdAt: Date;
    prices: Array<{ amountMinor: number; compareAtMinor: number | null }>;
    creator: { id: string; email: string; displayName: string } | null;
    course: { id: string; title: string; status: string; _count?: { sections: number } } | null;
    _count: { orderItems: number };
  }) {
    const price = product.prices[0];
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      type: product.type,
      status: product.status,
      visibility: product.visibility,
      description: product.description,
      thumbnailUrl: product.thumbnailUrl,
      creatorUserId: product.creatorUserId,
      creator: product.creator,
      priceMinor: price?.amountMinor ?? 0,
      compareAtMinor: price?.compareAtMinor ?? null,
      courseId: product.course?.id ?? null,
      courseTitle: product.course?.title ?? null,
      sectionCount: product.course?._count?.sections ?? 0,
      orderCount: product._count.orderItems,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
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

  @Get("products")
  products(
    @CurrentUser() user: RequestUser,
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("type") type?: string,
  ) {
    return this.admin.listProducts(user, q, status, type);
  }

  @Get("products/:id")
  product(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.admin.getProduct(user, id);
  }

  @Post("courses")
  createCourse(@CurrentUser() user: RequestUser, @Body() dto: AdminCreateCourseDto) {
    return this.admin.createCourse(user, dto);
  }

  @Patch("products/:id")
  updateProduct(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: AdminUpdateProductDto,
  ) {
    return this.admin.updateProduct(user, id, dto);
  }

  @Post("products/:id/publish")
  publishProduct(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.admin.publishProduct(user, id);
  }

  @Post("products/:id/unpublish")
  unpublishProduct(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.admin.unpublishProduct(user, id);
  }

  @Post("products/:id/reject")
  rejectProduct(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.admin.rejectProduct(user, id);
  }

  @Post("products/:id/archive")
  archiveProduct(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.admin.archiveProduct(user, id);
  }

  @Delete("products/:id")
  deleteProduct(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Query("hard") hard?: string,
  ) {
    return this.admin.deleteProduct(user, id, hard === "1" || hard === "true");
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
  controllers: [AdminController, CourseImportController],
  providers: [AdminService, CourseImportService],
})
export class AdminModule {}
