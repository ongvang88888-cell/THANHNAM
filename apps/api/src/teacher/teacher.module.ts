import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  Inject,
} from "@nestjs/common";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";
import { buildLessonContents } from "./lesson-contents";
import {
  CreateCourseDocumentDto,
  CreateLessonDto,
  PutLessonContentDto,
  TeacherStudioService,
  TitleDto,
  UpdateCourseDto,
} from "./teacher-studio.service";

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

class CreateDocumentDto {
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

class CreateBundleDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(["COURSE_BUNDLE", "DOCUMENT_BUNDLE", "MIXED_BUNDLE"])
  type!: "COURSE_BUNDLE" | "DOCUMENT_BUNDLE" | "MIXED_BUNDLE";

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMinor?: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  childProductIds!: string[];
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

  @IsOptional()
  @IsString()
  videoId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  prerequisiteKey?: string;

  @IsOptional()
  @IsInt()
  dripDaysAfterPurchase?: number;

  @IsOptional()
  @IsString()
  dripUnlockAt?: string;
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

class PatchLessonDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  dripDaysAfterPurchase?: number;

  @IsOptional()
  @IsString()
  dripUnlockAt?: string;

  @IsOptional()
  @IsString()
  prerequisiteLessonId?: string;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}

class ApplyDripDto {
  @IsInt()
  @Min(0)
  dripDaysAfterPurchase!: number;

  @IsOptional()
  @IsBoolean()
  setPreviewAsPrerequisite?: boolean;
}

@Injectable()
export class TeacherService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  assertTeacher(user: RequestUser) {
    if (!hasAnyRole(user as never, ["teacher", "admin", "super_admin"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Teacher only", 403);
    }
  }

  private ownerScope(user: RequestUser) {
    return hasAnyRole(user as never, ["admin", "super_admin"])
      ? {}
      : { creatorUserId: String(user.userId) };
  }

  async myCourses(user: RequestUser) {
    this.assertTeacher(user);
    return this.prisma.course.findMany({
      where: { appId: user.appId, creatorUserId: user.userId },
      include: { product: { include: { prices: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async myDocuments(user: RequestUser) {
    this.assertTeacher(user);
    return this.prisma.document.findMany({
      where: { appId: user.appId, ownerUserId: user.userId },
      include: {
        product: { include: { prices: true } },
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async myBundles(user: RequestUser) {
    this.assertTeacher(user);
    return this.prisma.product.findMany({
      where: {
        appId: user.appId,
        creatorUserId: user.userId,
        type: { in: ["COURSE_BUNDLE", "DOCUMENT_BUNDLE", "MIXED_BUNDLE"] },
      },
      include: {
        prices: true,
        bundle: { include: { items: { include: { product: true }, orderBy: { position: "asc" } } } },
      },
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
      await tx.courseSection.create({
        data: {
          courseId: course.id,
          title: "Chương 1",
          position: 1,
        },
      });
      return { course, product };
    });
  }

  async createDocumentProduct(user: RequestUser, dto: CreateDocumentDto) {
    this.assertTeacher(user);
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          appId: user.appId,
          type: "DIGITAL_DOCUMENT",
          name: dto.title,
          slug: dto.slug,
          description: dto.description ?? "",
          status: "DRAFT",
          visibility: "PRIVATE",
          creatorUserId: user.userId,
          prices: {
            create: { currency: "VND", amountMinor: dto.priceMinor ?? 0 },
          },
        },
      });
      const document = await tx.document.create({
        data: {
          appId: user.appId,
          productId: product.id,
          ownerUserId: user.userId,
          title: dto.title,
          status: "DRAFT",
        },
      });
      return { document, product };
    });
  }

  async createBundle(user: RequestUser, dto: CreateBundleDto) {
    this.assertTeacher(user);
    const children = await this.prisma.product.findMany({
      where: {
        appId: user.appId,
        id: { in: dto.childProductIds },
        status: { in: ["PUBLISHED", "DRAFT", "IN_REVIEW"] },
      },
    });
    if (children.length !== dto.childProductIds.length) {
      throw new AppError(ErrorCodes.VALIDATION, "One or more child products not found", 400);
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          appId: user.appId,
          type: dto.type,
          name: dto.title,
          slug: dto.slug,
          description: dto.description ?? "",
          status: "DRAFT",
          visibility: "PRIVATE",
          creatorUserId: user.userId,
          prices: {
            create: { currency: "VND", amountMinor: dto.priceMinor ?? 0 },
          },
        },
      });
      const bundle = await tx.bundle.create({
        data: {
          productId: product.id,
          items: {
            create: dto.childProductIds.map((productId, index) => ({
              productId: String(productId),
              position: index + 1,
            })),
          },
        },
        include: { items: true },
      });
      return { product, bundle };
    });
  }

  async replaceCurriculum(user: RequestUser, courseId: string, dto: UpdateCurriculumDto) {
    this.assertTeacher(user);
    const safeCourseId = String(courseId);
    const course = await this.prisma.course.findFirst({
      where: {
        id: safeCourseId,
        appId: String(user.appId),
        ...this.ownerScope(user),
      },
      include: { product: true },
    });
    if (!course) throw new AppError(ErrorCodes.NOT_FOUND, "Course not found", 404);

    for (const section of dto.sections) {
      for (const lesson of section.lessons) {
        if (lesson.videoId) {
          const video = await this.prisma.video.findFirst({
            where: {
              id: String(lesson.videoId),
              appId: user.appId,
              ownerUserId: user.userId,
            },
          });
          if (!video) {
            throw new AppError(ErrorCodes.NOT_FOUND, `Video ${lesson.videoId} not found`, 404);
          }
        }
        for (const documentId of lesson.documentIds ?? []) {
          const document = await this.prisma.document.findFirst({
            where: {
              id: String(documentId),
              appId: user.appId,
              ownerUserId: user.userId,
            },
          });
          if (!document) {
            throw new AppError(ErrorCodes.NOT_FOUND, `Document ${documentId} not found`, 404);
          }
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.courseSection.deleteMany({ where: { courseId: safeCourseId } });
      const keyToId = new Map<string, string>();
      const pendingPrereq: Array<{ id: string; key: string }> = [];
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
          const contents = buildLessonContents({
            body: lesson.body,
            videoId: lesson.videoId,
            documentIds: lesson.documentIds,
          });
          const createdLesson = await tx.lesson.create({
            data: {
              sectionId: created.id,
              title: lesson.title,
              position: lessonPos++,
              isPreview: Boolean(lesson.isPreview),
              dripDaysAfterPurchase: lesson.dripDaysAfterPurchase ?? null,
              dripUnlockAt: lesson.dripUnlockAt ? new Date(lesson.dripUnlockAt) : null,
              contents: contents.length
                ? { create: contents }
                : undefined,
            },
          });
          if (lesson.key) keyToId.set(lesson.key, createdLesson.id);
          if (lesson.prerequisiteKey) pendingPrereq.push({ id: createdLesson.id, key: lesson.prerequisiteKey });
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
      for (const row of pendingPrereq) {
        const prereqId = keyToId.get(row.key);
        if (prereqId) {
          await tx.lesson.update({
            where: { id: row.id },
            data: { prerequisiteLessonId: prereqId },
          });
        }
      }
    });

    return this.prisma.course.findUnique({
      where: { id: safeCourseId },
      include: {
        sections: {
          include: { lessons: { include: { contents: true }, orderBy: { position: "asc" } } },
          orderBy: { position: "asc" },
        },
      },
    });
  }

  private async ownedCourse(user: RequestUser, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id: String(courseId),
        appId: String(user.appId),
        ...this.ownerScope(user),
      },
      include: {
        sections: {
          include: { lessons: { orderBy: { position: "asc" } } },
          orderBy: { position: "asc" },
        },
      },
    });
    if (!course) throw new AppError(ErrorCodes.NOT_FOUND, "Course not found", 404);
    return course;
  }

  async patchLesson(user: RequestUser, courseId: string, lessonId: string, dto: PatchLessonDto) {
    this.assertTeacher(user);
    const course = await this.ownedCourse(user, courseId);
    const lesson = course.sections.flatMap((s) => s.lessons).find((l) => l.id === lessonId);
    if (!lesson) throw new AppError(ErrorCodes.NOT_FOUND, "Lesson not found", 404);

    if (dto.prerequisiteLessonId) {
      const prereq = course.sections.flatMap((s) => s.lessons).find((l) => l.id === dto.prerequisiteLessonId);
      if (!prereq) throw new AppError(ErrorCodes.VALIDATION, "Prerequisite lesson is not in this course", 400);
      if (prereq.id === lesson.id) {
        throw new AppError(ErrorCodes.VALIDATION, "A lesson cannot require itself", 400);
      }
    }

    const nextPreview = dto.isPreview ?? lesson.isPreview;
    await this.prisma.$transaction(async (tx) => {
      await tx.lesson.update({
        where: { id: lesson.id },
        data: {
          title: dto.title !== undefined ? dto.title.trim() : lesson.title,
          dripDaysAfterPurchase:
            dto.dripDaysAfterPurchase !== undefined ? dto.dripDaysAfterPurchase : lesson.dripDaysAfterPurchase,
          dripUnlockAt:
            dto.dripUnlockAt !== undefined
              ? dto.dripUnlockAt
                ? new Date(dto.dripUnlockAt)
                : null
              : lesson.dripUnlockAt,
          prerequisiteLessonId:
            dto.prerequisiteLessonId !== undefined ? dto.prerequisiteLessonId || null : lesson.prerequisiteLessonId,
          isPreview: nextPreview,
        },
      });
      if (dto.isPreview !== undefined) {
        await tx.accessPolicy.deleteMany({ where: { lessonId: lesson.id } });
        await tx.accessPolicy.create({
          data: {
            resourceType: "lesson",
            resourceId: lesson.id,
            lessonId: lesson.id,
            policyType: nextPreview ? "FREE" : "PURCHASE_REQUIRED",
            paramsJson: nextPreview ? {} : { productId: course.productId },
            priority: nextPreview ? 10 : 20,
          },
        });
        if (!nextPreview) {
          await tx.accessPolicy.create({
            data: {
              resourceType: "lesson",
              resourceId: lesson.id,
              lessonId: lesson.id,
              policyType: "REWARDED_AD",
              paramsJson: { policyCode: "lesson_unlock_24h" },
              priority: 30,
            },
          });
        }
      }
    });
    return this.getCourse(user, courseId);
  }

  async applyDrip(user: RequestUser, courseId: string, dto: ApplyDripDto) {
    this.assertTeacher(user);
    const course = await this.ownedCourse(user, courseId);
    const lessons = course.sections.flatMap((s) => s.lessons);
    const preview = lessons.find((l) => l.isPreview) ?? lessons[0];
    for (const lesson of lessons) {
      if (lesson.isPreview) continue;
      await this.prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          dripDaysAfterPurchase: dto.dripDaysAfterPurchase,
          prerequisiteLessonId:
            dto.setPreviewAsPrerequisite !== false && preview && preview.id !== lesson.id
              ? preview.id
              : lesson.prerequisiteLessonId,
        },
      });
    }
    return this.getCourse(user, courseId);
  }

  async submitReview(user: RequestUser, courseId: string) {
    this.assertTeacher(user);
    const course = await this.prisma.course.findFirst({
      where: { id: String(courseId), appId: user.appId, ...this.ownerScope(user) },
    });
    if (!course) throw new AppError(ErrorCodes.NOT_FOUND, "Course not found", 404);
    await this.prisma.course.update({ where: { id: course.id }, data: { status: "IN_REVIEW" } });
    await this.prisma.product.update({
      where: { id: course.productId },
      data: { status: "IN_REVIEW" },
    });
    return { ok: true };
  }

  async submitProductReview(user: RequestUser, productId: string) {
    this.assertTeacher(user);
    const product = await this.prisma.product.findFirst({
      where: { id: String(productId), appId: user.appId, ...this.ownerScope(user) },
      include: { document: true, course: true },
    });
    if (!product) throw new AppError(ErrorCodes.NOT_FOUND, "Product not found", 404);
    if (product.document) {
      const versions = await this.prisma.documentVersion.count({
        where: { documentId: product.document.id },
      });
      if (versions < 1) {
        throw new AppError(ErrorCodes.VALIDATION, "Upload a document version before submit", 400);
      }
      await this.prisma.document.update({
        where: { id: product.document.id },
        data: { status: "IN_REVIEW" },
      });
    }
    if (product.course) {
      await this.prisma.course.update({
        where: { id: product.course.id },
        data: { status: "IN_REVIEW" },
      });
    }
    await this.prisma.product.update({
      where: { id: product.id },
      data: { status: "IN_REVIEW" },
    });
    return { ok: true };
  }

  async publish(user: RequestUser, courseId: string) {
    if (!hasAnyRole(user as never, ["admin", "super_admin"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Admin publish only", 403);
    }
    const course = await this.prisma.course.findUniqueOrThrow({ where: { id: String(courseId) } });
    await this.prisma.course.update({ where: { id: course.id }, data: { status: "PUBLISHED" } });
    await this.prisma.product.update({
      where: { id: course.productId },
      data: { status: "PUBLISHED", visibility: "PUBLIC" },
    });
    return { ok: true };
  }

  async getCourse(user: RequestUser, courseId: string) {
    this.assertTeacher(user);
    const course = await this.prisma.course.findFirst({
      where: { id: String(courseId), appId: user.appId, ...this.ownerScope(user) },
      include: {
        product: { include: { prices: true } },
        sections: {
          orderBy: { position: "asc" },
          include: { lessons: { include: { contents: true }, orderBy: { position: "asc" } } },
        },
        quizzes: { include: { _count: { select: { questions: true } } } },
        announcements: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!course) throw new AppError(ErrorCodes.NOT_FOUND, "Course not found", 404);
    const documentIds = [
      ...new Set(
        course.sections.flatMap((section) =>
          section.lessons.flatMap((lesson) =>
            lesson.contents
              .filter((content) => content.contentType === "DOCUMENT" && content.refId)
              .map((content) => String(content.refId)),
          ),
        ),
      ),
    ];
    const attachedDocuments = documentIds.length
      ? await this.prisma.document.findMany({
          where: { id: { in: documentIds }, appId: user.appId },
          include: { versions: { orderBy: { version: "desc" }, take: 1 } },
        })
      : [];
    const researchDocuments = await this.prisma.document.findMany({
      where: { appId: user.appId, ownerUserId: user.userId, productId: null },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return { ...course, attachedDocuments, researchDocuments };
  }

  async createQuiz(
    user: RequestUser,
    courseId: string,
    dto: { title: string; questions: Array<{ stem: string; answers: Array<{ body: string; isCorrect?: boolean }> }> },
  ) {
    this.assertTeacher(user);
    const course = await this.prisma.course.findFirst({
      where: { id: String(courseId), appId: user.appId, ...this.ownerScope(user) },
    });
    if (!course) throw new AppError(ErrorCodes.NOT_FOUND, "Course not found", 404);
    return this.prisma.quiz.create({
      data: {
        courseId: course.id,
        title: dto.title,
        questions: {
          create: dto.questions.map((q, qi) => ({
            type: "MCQ",
            stem: q.stem,
            position: qi,
            answers: {
              create: q.answers.map((a, ai) => ({
                body: a.body,
                isCorrect: Boolean(a.isCorrect),
                position: ai,
              })),
            },
          })),
        },
      },
      include: { questions: { include: { answers: true } } },
    });
  }

  async publishProduct(user: RequestUser, productId: string) {
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
    return { ok: true };
  }
}

@Controller("teacher")
@UseGuards(AuthGuard)
export class TeacherController {
  constructor(
    @Inject(TeacherService) private readonly teacher: TeacherService,
    @Inject(TeacherStudioService) private readonly studio: TeacherStudioService,
  ) {}

  @Get("courses")
  list(@CurrentUser() user: RequestUser) {
    return this.teacher.myCourses(user);
  }

  @Get("courses/:id")
  getCourse(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.teacher.getCourse(user, id);
  }

  @Post("courses/:id/quizzes")
  createQuiz(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body()
    dto: {
      title: string;
      questions: Array<{ stem: string; answers: Array<{ body: string; isCorrect?: boolean }> }>;
    },
  ) {
    if (!dto.title || !dto.questions?.length) {
      throw new AppError(ErrorCodes.VALIDATION, "Quiz title and questions required", 400);
    }
    return this.teacher.createQuiz(user, id, dto);
  }

  @Get("documents")
  documents(@CurrentUser() user: RequestUser) {
    return this.teacher.myDocuments(user);
  }

  @Get("bundles")
  bundles(@CurrentUser() user: RequestUser) {
    return this.teacher.myBundles(user);
  }

  @Post("courses")
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCourseDto) {
    return this.teacher.createCourse(user, dto);
  }

  @Post("documents")
  createDocument(@CurrentUser() user: RequestUser, @Body() dto: CreateDocumentDto) {
    return this.teacher.createDocumentProduct(user, dto);
  }

  @Post("bundles")
  createBundle(@CurrentUser() user: RequestUser, @Body() dto: CreateBundleDto) {
    return this.teacher.createBundle(user, dto);
  }

  @Patch("courses/:id")
  async updateCourse(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    await this.studio.updateCourse(user, id, dto);
    return this.teacher.getCourse(user, id);
  }

  @Post("courses/:id/sections")
  async addSection(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: TitleDto,
  ) {
    await this.studio.addSection(user, id, dto);
    return this.teacher.getCourse(user, id);
  }

  @Patch("courses/:id/sections/:sectionId")
  async updateSection(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Param("sectionId") sectionId: string,
    @Body() dto: TitleDto,
  ) {
    await this.studio.updateSection(user, id, sectionId, dto);
    return this.teacher.getCourse(user, id);
  }

  @Delete("courses/:id/sections/:sectionId")
  async deleteSection(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Param("sectionId") sectionId: string,
  ) {
    await this.studio.deleteSection(user, id, sectionId);
    return this.teacher.getCourse(user, id);
  }

  @Post("courses/:id/sections/:sectionId/lessons")
  async addLesson(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Param("sectionId") sectionId: string,
    @Body() dto: CreateLessonDto,
  ) {
    await this.studio.addLesson(user, id, sectionId, dto);
    return this.teacher.getCourse(user, id);
  }

  @Delete("courses/:id/lessons/:lessonId")
  async deleteLesson(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Param("lessonId") lessonId: string,
  ) {
    await this.studio.deleteLesson(user, id, lessonId);
    return this.teacher.getCourse(user, id);
  }

  @Put("courses/:id/lessons/:lessonId/content")
  async putLessonContent(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Param("lessonId") lessonId: string,
    @Body() dto: PutLessonContentDto,
  ) {
    await this.studio.putLessonContent(user, id, lessonId, dto);
    return this.teacher.getCourse(user, id);
  }

  @Post("courses/:id/documents")
  createCourseDocument(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: CreateCourseDocumentDto,
  ) {
    return this.studio.createCourseDocument(user, id, dto);
  }

  @Patch("courses/:id/curriculum")
  curriculum(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateCurriculumDto,
  ) {
    return this.teacher.replaceCurriculum(user, id, dto);
  }

  @Patch("courses/:id/drip")
  applyDrip(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: ApplyDripDto,
  ) {
    return this.teacher.applyDrip(user, id, dto);
  }

  @Patch("courses/:id/lessons/:lessonId")
  patchLesson(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Param("lessonId") lessonId: string,
    @Body() dto: PatchLessonDto,
  ) {
    return this.teacher.patchLesson(user, id, lessonId, dto);
  }

  @Post("courses/:id/submit")
  submit(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.teacher.submitReview(user, id);
  }

  @Post("products/:id/submit")
  submitProduct(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.teacher.submitProductReview(user, id);
  }

  @Post("courses/:id/publish")
  publish(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.teacher.publish(user, id);
  }

  @Post("products/:id/publish")
  publishProduct(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.teacher.publishProduct(user, id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [TeacherController],
  providers: [TeacherService, TeacherStudioService],
})
export class TeacherModule {}
