import { Controller, Get, Injectable, Module, Param, UseGuards, Inject } from "@nestjs/common";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AccessService } from "../access/access.module";
import { AccessModule } from "../access/access.module";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

@Injectable()
export class CurriculumService {
  constructor(
  @Inject(PrismaService) private readonly prisma: PrismaService,
  @Inject(AccessService) private readonly access: AccessService,
) {}

  async getCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        product: { include: { prices: { take: 1, orderBy: { validFrom: "desc" } } } },
        sections: {
          orderBy: { position: "asc" },
          include: {
            lessons: {
              orderBy: { position: "asc" },
              select: {
                id: true,
                title: true,
                position: true,
                durationSec: true,
                isPreview: true,
              },
            },
          },
        },
      },
    });
    if (!course) throw new AppError(ErrorCodes.NOT_FOUND, "Course not found", 404);
    return course;
  }

  async getLesson(user: RequestUser, lessonId: string) {
    const decision = await this.access.evaluateLesson(user, lessonId);
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        contents: { orderBy: { position: "asc" } },
        section: { include: { course: true } },
      },
    });
    if (!lesson) throw new AppError(ErrorCodes.NOT_FOUND, "Lesson not found", 404);

    if (decision.code !== "CAN_ACCESS") {
      return {
        id: lesson.id,
        title: lesson.title,
        access: decision,
        contents: [],
      };
    }

    return {
      id: lesson.id,
      title: lesson.title,
      durationSec: lesson.durationSec,
      isPreview: lesson.isPreview,
      access: decision,
      contents: lesson.contents,
      courseId: lesson.section.courseId,
    };
  }
}

@Controller("courses")
export class CurriculumController {
  constructor(
  @Inject(CurriculumService) private readonly curriculum: CurriculumService,
) {}

  @Get(":id")
  getCourse(@Param("id") id: string) {
    return this.curriculum.getCourse(id);
  }

  @Get(":id/curriculum")
  getCurriculum(@Param("id") id: string) {
    return this.curriculum.getCourse(id);
  }
}

@Controller("lessons")
export class LessonsController {
  constructor(
  @Inject(CurriculumService) private readonly curriculum: CurriculumService,
) {}

  @Get(":id")
  @UseGuards(AuthGuard)
  getLesson(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.curriculum.getLesson(user, id);
  }
}

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [CurriculumController, LessonsController],
  providers: [CurriculumService],
})
export class CurriculumModule {}
