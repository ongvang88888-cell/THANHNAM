import { Controller, Injectable, Module, Post, UseGuards, Inject } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";
import { sendAbandonedCheckoutEmail, sendIdleLearningEmail } from "../common/mailer";

const ABANDON_AFTER_MS = Number(process.env.ABANDON_CHECKOUT_MS || 30 * 60_000);
const IDLE_AFTER_MS = Number(process.env.IDLE_LEARNING_MS || 3 * 24 * 3600_000);

@Injectable()
export class JobsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  assertAdmin(user: RequestUser) {
    if (!hasAnyRole(user as never, ["admin", "super_admin", "support_agent"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Admin only", 403);
    }
  }

  async expireEntitlementsAndSubs() {
    const now = new Date();
    const entitlements = await this.prisma.entitlement.updateMany({
      where: { status: "ACTIVE", expiresAt: { lte: now } },
      data: { status: "EXPIRED" },
    });
    const subs = await this.prisma.subscription.updateMany({
      where: { status: "ACTIVE", currentPeriodEnd: { lte: now } },
      data: { status: "EXPIRED" },
    });
    return { entitlements: entitlements.count, subscriptions: subs.count };
  }

  async abandonedCheckout(appId?: string) {
    const cutoff = new Date(Date.now() - ABANDON_AFTER_MS);
    const orders = await this.prisma.order.findMany({
      where: {
        ...(appId ? { appId } : {}),
        status: "AWAITING_PAYMENT",
        updatedAt: { lt: cutoff },
      },
      include: { user: { select: { email: true } } },
      take: 80,
      orderBy: { updatedAt: "asc" },
    });

    let sent = 0;
    for (const order of orders) {
      const recent = await this.prisma.notification.findFirst({
        where: {
          userId: order.userId,
          title: "Hoàn tất thanh toán",
          createdAt: { gt: cutoff },
          metaJson: { path: ["orderId"], equals: order.id },
        },
      });
      if (recent) continue;
      await this.prisma.notification.create({
        data: {
          userId: order.userId,
          channel: "in_app",
          title: "Hoàn tất thanh toán",
          body: "Bạn còn đơn chưa thanh toán. Quay lại để giữ ưu đãi / tiếp tục học.",
          metaJson: { orderId: order.id, kind: "abandoned_checkout" },
        },
      });
      void sendAbandonedCheckoutEmail(order.user.email, order.id);
      sent += 1;
    }
    return { scanned: orders.length, sent };
  }

  async idleLearning(appId?: string) {
    const cutoff = new Date(Date.now() - IDLE_AFTER_MS);
    const rows = await this.prisma.lessonProgress.findMany({
      where: {
        status: "IN_PROGRESS",
        updatedAt: { lt: cutoff },
        ...(appId ? { user: { appId } } : {}),
      },
      include: {
        lesson: { select: { id: true, title: true } },
        user: { select: { email: true } },
      },
      take: 80,
      orderBy: { updatedAt: "asc" },
    });

    let sent = 0;
    for (const row of rows) {
      const recent = await this.prisma.notification.findFirst({
        where: {
          userId: row.userId,
          title: "Tiếp tục học",
          createdAt: { gt: cutoff },
          metaJson: { path: ["lessonId"], equals: row.lessonId },
        },
      });
      if (recent) continue;
      await this.prisma.notification.create({
        data: {
          userId: row.userId,
          channel: "in_app",
          title: "Tiếp tục học",
          body: `Bạn đang học dở: ${row.lesson.title}. Học tiếp chỉ mất vài phút.`,
          metaJson: { lessonId: row.lessonId, kind: "idle_learning" },
        },
      });
      void sendIdleLearningEmail(row.user.email, row.lessonId, row.lesson.title);
      sent += 1;
    }
    return { scanned: rows.length, sent };
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async cronNudgeAndExpire() {
    const expired = await this.expireEntitlementsAndSubs();
    const abandoned = await this.abandonedCheckout();
    const idle = await this.idleLearning();
    console.log("[jobs:cron]", { expired, abandoned, idle });
  }
}

@Controller("admin/jobs")
@UseGuards(AuthGuard)
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobs: JobsService) {}

  @Post("abandoned-checkout")
  abandoned(@CurrentUser() user: RequestUser) {
    this.jobs.assertAdmin(user);
    return this.jobs.abandonedCheckout(user.appId);
  }

  @Post("idle-learning")
  idle(@CurrentUser() user: RequestUser) {
    this.jobs.assertAdmin(user);
    return this.jobs.idleLearning(user.appId);
  }

  @Post("expire")
  expire(@CurrentUser() user: RequestUser) {
    this.jobs.assertAdmin(user);
    return this.jobs.expireEntitlementsAndSubs();
  }
}

@Module({
  imports: [AuthModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
