import { Body, Controller, Get, Injectable, Module, Param, Put, UseGuards, Inject } from "@nestjs/common";
import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";
import { computeCoursePercent, isLessonComplete, makeCertificatePublicId } from "@edu/education-core";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AccessService } from "../access/access.module";
import { AccessModule } from "../access/access.module";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

class ProgressDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  videoPositionMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentMs?: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

@Injectable()
export class ProgressService {
  constructor(
  @Inject(PrismaService) private readonly prisma: PrismaService,
  @Inject(AccessService) private readonly access: AccessService,
) {}

  async continueLearning(user: RequestUser) {
    const rows = await this.prisma.lessonProgress.findMany({
      where: { userId: user.userId, status: { in: ["IN_PROGRESS", "NOT_STARTED"] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        lesson: {
          include: { section: { include: { course: { include: { product: true } } } } },
        },
      },
    });
    return rows.map((r) => ({
      lessonId: r.lessonId,
      lessonTitle: r.lesson.title,
      courseId: r.lesson.section.courseId,
      courseTitle: r.lesson.section.course.title,
      productSlug: r.lesson.section.course.product.slug,
      videoPositionMs: r.videoPositionMs,
      status: r.status,
      updatedAt: r.updatedAt,
    }));
  }

  async updateLessonProgress(user: RequestUser, lessonId: string, dto: ProgressDto) {
    const decision = await this.access.evaluateLesson(user, lessonId);
    if (decision.code !== "CAN_ACCESS") {
      throw new AppError(decision.code, "Cannot update progress without access", 403);
    }

    const lesson = await this.prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      include: { section: true },
    });

    const existing = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.userId, lessonId } },
    });
    const videoPositionMs = dto.videoPositionMs ?? existing?.videoPositionMs ?? 0;
    const timeSpentMs = dto.timeSpentMs ?? existing?.timeSpentMs ?? 0;

    const complete = Boolean(
      dto.completed ||
        isLessonComplete({
          videoPositionMs,
          durationMs: lesson.durationSec * 1000,
        }),
    );

    const progress = await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.userId, lessonId } },
      update: {
        videoPositionMs,
        timeSpentMs,
        status: complete ? "COMPLETED" : "IN_PROGRESS",
        completedAt: complete ? new Date() : null,
      },
      create: {
        userId: user.userId,
        lessonId,
        videoPositionMs,
        timeSpentMs,
        status: complete ? "COMPLETED" : "IN_PROGRESS",
        completedAt: complete ? new Date() : null,
      },
    });

    const courseId = lesson.section.courseId;
    const allLessons = await this.prisma.lesson.findMany({
      where: { section: { courseId } },
      select: { id: true },
    });
    const completed = await this.prisma.lessonProgress.count({
      where: {
        userId: user.userId,
        status: "COMPLETED",
        lessonId: { in: allLessons.map((l) => l.id) },
      },
    });
    const percent = computeCoursePercent(allLessons.length, completed);
    await this.prisma.courseProgress.upsert({
      where: { userId_courseId: { userId: user.userId, courseId } },
      update: {
        percentBasisPoints: percent,
        lastLessonId: lessonId,
        completedAt: percent >= 10_000 ? new Date() : null,
      },
      create: {
        userId: user.userId,
        courseId,
        percentBasisPoints: percent,
        lastLessonId: lessonId,
        completedAt: percent >= 10_000 ? new Date() : null,
      },
    });

    if (percent >= 10_000) {
      const existing = await this.prisma.certificate.findFirst({
        where: { userId: user.userId, courseId },
      });
      if (!existing) {
        await this.prisma.certificate.create({
          data: {
            publicId: makeCertificatePublicId(),
            userId: user.userId,
            courseId,
          },
        });
      }
    }

    return progress;
  }

  async library(user: RequestUser) {
    const entitlements = await this.prisma.entitlement.findMany({
      where: { userId: user.userId, status: "ACTIVE", resourceType: "product" },
    });
    const productIds = entitlements.map((e) => e.resourceId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        course: {
          include: {
            sections: {
              orderBy: { position: "asc" },
              include: {
                lessons: { orderBy: { position: "asc" }, take: 1, select: { id: true } },
              },
            },
          },
        },
        document: true,
      },
    });
    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        type: p.type,
        course: p.course ? { id: p.course.id } : null,
        document: p.document ? { id: p.document.id } : null,
        firstLessonId: p.course?.sections.find((s) => s.lessons[0])?.lessons[0]?.id ?? null,
      })),
      entitlements,
    };
  }

  myCertificates(user: RequestUser) {
    return this.prisma.certificate.findMany({
      where: { userId: user.userId },
      include: { course: { select: { title: true, product: { select: { slug: true } } } } },
      orderBy: { issuedAt: "desc" },
    });
  }
}

@Controller()
export class ProgressController {
  constructor(
  @Inject(ProgressService) private readonly progress: ProgressService,
) {}

  @Get("me/continue")
  @UseGuards(AuthGuard)
  continueLearning(@CurrentUser() user: RequestUser) {
    return this.progress.continueLearning(user);
  }

  @Get("me/library")
  @UseGuards(AuthGuard)
  library(@CurrentUser() user: RequestUser) {
    return this.progress.library(user);
  }

  @Get("me/certificates")
  @UseGuards(AuthGuard)
  certificates(@CurrentUser() user: RequestUser) {
    return this.progress.myCertificates(user);
  }

  @Put("lessons/:id/progress")
  @UseGuards(AuthGuard)
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: ProgressDto,
  ) {
    return this.progress.updateLessonProgress(user, id, dto);
  }
}

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
