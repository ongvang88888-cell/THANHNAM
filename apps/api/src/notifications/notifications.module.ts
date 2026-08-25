import { Controller, Get, Injectable, Module, Param, Patch, UseGuards, Inject } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";
import { AppError, ErrorCodes } from "@edu/shared-core";

@Injectable()
export class NotificationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(user: RequestUser) {
    return this.prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async markRead(user: RequestUser, id: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== user.userId) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Notification not found", 404);
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(user: RequestUser) {
    await this.prisma.notification.updateMany({
      where: { userId: user.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}

@Controller("notifications")
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  list(@CurrentUser() user: RequestUser) {
    return this.notifications.list(user);
  }

  @Patch("read-all")
  @UseGuards(AuthGuard)
  readAll(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user);
  }

  @Patch(":id/read")
  @UseGuards(AuthGuard)
  read(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.notifications.markRead(user, id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
