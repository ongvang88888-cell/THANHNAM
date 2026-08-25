import { Controller, Injectable, Module, Post, UseGuards, Inject } from "@nestjs/common";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

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

  /** Recover AWAITING_PAYMENT carts older than threshold (Kajabi-style nudge). */
  async abandonedCheckout(actor: RequestUser) {
    this.assertAdmin(actor);
    const cutoff = new Date(Date.now() - ABANDON_AFTER_MS);
    const orders = await this.prisma.order.findMany({
      where: {
        appId: actor.appId,
        status: "AWAITING_PAYMENT",
        updatedAt: { lt: cutoff },
      },
      take: 50,
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
      sent += 1;
    }
    return { scanned: orders.length, sent };
  }

  /** Nudge learners idle on an in-progress lesson (P4-B). */
  async idleLearning(actor: RequestUser) {
    this.assertAdmin(actor);
    const cutoff = new Date(Date.now() - IDLE_AFTER_MS);
    const rows = await this.prisma.lessonProgress.findMany({
      where: {
        status: "IN_PROGRESS",
        updatedAt: { lt: cutoff },
        user: { appId: actor.appId },
      },
      include: {
        lesson: { select: { id: true, title: true } },
      },
      take: 50,
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
      sent += 1;
    }
    return { scanned: rows.length, sent };
  }
}

@Controller("admin/jobs")
@UseGuards(AuthGuard)
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobs: JobsService) {}

  @Post("abandoned-checkout")
  abandoned(@CurrentUser() user: RequestUser) {
    return this.jobs.abandonedCheckout(user);
  }

  @Post("idle-learning")
  idle(@CurrentUser() user: RequestUser) {
    return this.jobs.idleLearning(user);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
