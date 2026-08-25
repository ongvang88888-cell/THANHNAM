import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
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
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
        creatorUserId: String(user.userId),
        appId: String(user.appId),
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
      }
    }

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
          const contents: Array<{
            contentType: "TEXT" | "VIDEO";
            body?: string;
            refId?: string;
            position: number;
          }> = [];
          if (lesson.body) {
            contents.push({ contentType: "TEXT", body: lesson.body, position: 1 });
          }
          if (lesson.videoId) {
            contents.push({
              contentType: "VIDEO",
              refId: String(lesson.videoId),
              position: contents.length + 1,
            });
          }
          const createdLesson = await tx.lesson.create({
            data: {
              sectionId: created.id,
              title: lesson.title,
              position: lessonPos++,
              isPreview: Boolean(lesson.isPreview),
              contents: contents.length
                ? { create: contents }
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
      where: { id: safeCourseId },
      include: {
        sections: {
          include: { lessons: { include: { contents: true }, orderBy: { position: "asc" } } },
          orderBy: { position: "asc" },
        },
      },
    });
  }

  async submitReview(user: RequestUser, courseId: string) {
    this.assertTeacher(user);
    const course = await this.prisma.course.findFirst({
      where: { id: String(courseId), creatorUserId: user.userId },
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
      where: { id: String(productId), creatorUserId: user.userId, appId: user.appId },
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
  constructor(@Inject(TeacherService) private readonly teacher: TeacherService) {}

  @Get("courses")
  list(@CurrentUser() user: RequestUser) {
    return this.teacher.myCourses(user);
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
  providers: [TeacherService],
})
export class TeacherModule {}
