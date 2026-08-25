import { Body, Controller, Get, Injectable, Module, Param, Patch, Post, UseGuards, Inject } from "@nestjs/common";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

class CreateCourseDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMinor?: number;
}

class LessonInput {
  @IsString()
  title!: string;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;

  @IsOptional()
  @IsString()
  body?: string;
}

class SectionInput {
  @IsString()
  title!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonInput)
  lessons!: LessonInput[];
}

class UpdateCurriculumDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionInput)
  sections!: SectionInput[];
}

@Injectable()
export class TeacherService {
  constructor(
  @Inject(PrismaService) private readonly prisma: PrismaService,
) {}

  assertTeacher(user: RequestUser) {
    if (!hasAnyRole(user as never, ["teacher", "admin", "super_admin"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Teacher only", 403);
    }
  }

  async myCourses(user: RequestUser) {
    this.assertTeacher(user);
    return this.prisma.course.findMany({
      where: { appId: user.appId, creatorUserId: user.userId },
      include: { product: { include: { prices: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createCourse(user: RequestUser, dto: CreateCourseDto) {
    this.assertTeacher(user);
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          appId: user.appId,
          type: "VIDEO_COURSE",
          name: dto.title,
          slug: dto.slug,
          description: dto.description ?? "",
          status: "DRAFT",
          visibility: "PRIVATE",
          creatorUserId: user.userId,
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
          title: dto.title,
          status: "DRAFT",
          creatorUserId: user.userId,
        },
      });
      return { course, product };
    });
  }

  async replaceCurriculum(user: RequestUser, courseId: string, dto: UpdateCurriculumDto) {
    this.assertTeacher(user);
    const safeCourseId = String(courseId);
    const course = await this.prisma.course.findFirst({
      where: {
        id: safeCourseId,
        creatorUserId: String(user.userId),
        appId: String(user.appId),
      },
      include: { product: true },
    });
    if (!course) throw new AppError(ErrorCodes.NOT_FOUND, "Course not found", 404);

    await this.prisma.$transaction(async (tx) => {
      await tx.courseSection.deleteMany({ where: { courseId: safeCourseId } });
      let sectionPos = 1;
      for (const section of dto.sections) {
        const created = await tx.courseSection.create({
          data: {
            courseId: safeCourseId,
            title: section.title,
            position: sectionPos++,
          },
        });
        let lessonPos = 1;
        for (const lesson of section.lessons) {
          const createdLesson = await tx.lesson.create({
            data: {
              sectionId: created.id,
              title: lesson.title,
              position: lessonPos++,
              isPreview: Boolean(lesson.isPreview),
              contents: lesson.body
                ? {
                    create: {
                      contentType: "TEXT",
                      body: lesson.body,
                      position: 1,
                    },
                  }
                : undefined,
            },
          });
          await tx.accessPolicy.create({
            data: {
              resourceType: "lesson",
              resourceId: createdLesson.id,
              lessonId: createdLesson.id,
              policyType: lesson.isPreview ? "FREE" : "PURCHASE_REQUIRED",
              paramsJson: lesson.isPreview ? {} : { productId: course.productId },
              priority: lesson.isPreview ? 10 : 20,
            },
          });
          if (!lesson.isPreview) {
            await tx.accessPolicy.create({
              data: {
                resourceType: "lesson",
                resourceId: createdLesson.id,
                lessonId: createdLesson.id,
                policyType: "REWARDED_AD",
                paramsJson: { policyCode: "lesson_unlock_24h" },
                priority: 30,
              },
            });
          }
        }
      }
    });

    return this.prisma.course.findUnique({
      where: { id: courseId },
      include: { sections: { include: { lessons: true }, orderBy: { position: "asc" } } },
    });
  }

  async submitReview(user: RequestUser, courseId: string) {
    this.assertTeacher(user);
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, creatorUserId: user.userId },
    });
    if (!course) throw new AppError(ErrorCodes.NOT_FOUND, "Course not found", 404);
    await this.prisma.course.update({ where: { id: courseId }, data: { status: "IN_REVIEW" } });
    await this.prisma.product.update({
      where: { id: course.productId },
      data: { status: "IN_REVIEW" },
    });
    return { ok: true };
  }

  async publish(user: RequestUser, courseId: string) {
    if (!hasAnyRole(user as never, ["admin", "super_admin"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Admin publish only", 403);
    }
    const course = await this.prisma.course.findUniqueOrThrow({ where: { id: courseId } });
    await this.prisma.course.update({ where: { id: courseId }, data: { status: "PUBLISHED" } });
    await this.prisma.product.update({
      where: { id: course.productId },
      data: { status: "PUBLISHED", visibility: "PUBLIC" },
    });
    return { ok: true };
  }
}

@Controller("teacher")
@UseGuards(AuthGuard)
export class TeacherController {
  constructor(
  @Inject(TeacherService) private readonly teacher: TeacherService,
) {}

  @Get("courses")
  list(@CurrentUser() user: RequestUser) {
    return this.teacher.myCourses(user);
  }

  @Post("courses")
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCourseDto) {
    return this.teacher.createCourse(user, dto);
  }

  @Patch("courses/:id/curriculum")
  curriculum(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateCurriculumDto,
  ) {
    return this.teacher.replaceCurriculum(user, id, dto);
  }

  @Post("courses/:id/submit")
  submit(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.teacher.submitReview(user, id);
  }

  @Post("courses/:id/publish")
  publish(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.teacher.publish(user, id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [TeacherController],
  providers: [TeacherService],
})
export class TeacherModule {}
