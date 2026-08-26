import { Injectable, Inject } from "@nestjs/common";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import type { RequestUser } from "../auth/auth.guard";
import { buildLessonContents } from "./lesson-contents";

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

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
}

export class TitleDto {
  @IsString()
  @MinLength(1)
  title!: string;
}

export class CreateLessonDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;

  @IsOptional()
  @IsString()
  body?: string;
}

export class PutLessonContentDto {
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
}

export class CreateCourseDocumentDto {
  @IsString()
  @MinLength(2)
  title!: string;
}

@Injectable()
export class TeacherStudioService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private assertTeacher(user: RequestUser) {
    if (!hasAnyRole(user as never, ["teacher", "admin", "super_admin"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Teacher only", 403);
    }
  }

  private async ownedCourse(user: RequestUser, courseId: string) {
    this.assertTeacher(user);
    const course = await this.prisma.course.findFirst({
      where: {
        id: String(courseId),
        creatorUserId: String(user.userId),
        appId: String(user.appId),
      },
      include: {
        product: { include: { prices: { orderBy: { validFrom: "desc" }, take: 1 } } },
        sections: {
          include: { lessons: { orderBy: { position: "asc" } } },
          orderBy: { position: "asc" },
        },
      },
    });
    if (!course) throw new AppError(ErrorCodes.NOT_FOUND, "Course not found", 404);
    return course;
  }

  private async assertOwnedVideos(user: RequestUser, videoIds: string[]) {
    const unique = [...new Set(videoIds.map((id) => id.trim()).filter(Boolean))];
    if (unique.length === 0) return;
    const videos = await this.prisma.video.findMany({
      where: { id: { in: unique }, appId: user.appId, ownerUserId: user.userId },
      select: { id: true },
    });
    if (videos.length !== unique.length) {
      throw new AppError(ErrorCodes.NOT_FOUND, "One or more videos were not found", 404);
    }
  }

  private async assertOwnedDocuments(user: RequestUser, documentIds: string[]) {
    const unique = [...new Set(documentIds.map((id) => id.trim()).filter(Boolean))];
    if (unique.length === 0) return;
    const documents = await this.prisma.document.findMany({
      where: { id: { in: unique }, appId: user.appId, ownerUserId: user.userId },
      select: { id: true },
    });
    if (documents.length !== unique.length) {
      throw new AppError(ErrorCodes.NOT_FOUND, "One or more documents were not found", 404);
    }
  }

  private async writeLessonPolicies(
    tx: {
      accessPolicy: PrismaService["accessPolicy"];
    },
    lessonId: string,
    isPreview: boolean,
    productId: string,
  ) {
    await tx.accessPolicy.deleteMany({ where: { lessonId } });
    await tx.accessPolicy.create({
      data: {
        resourceType: "lesson",
        resourceId: lessonId,
        lessonId,
        policyType: isPreview ? "FREE" : "PURCHASE_REQUIRED",
        paramsJson: isPreview ? {} : { productId },
        priority: isPreview ? 10 : 20,
      },
    });
    if (!isPreview) {
      await tx.accessPolicy.create({
        data: {
          resourceType: "lesson",
          resourceId: lessonId,
          lessonId,
          policyType: "REWARDED_AD",
          paramsJson: { policyCode: "lesson_unlock_24h" },
          priority: 30,
        },
      });
    }
  }

  async updateCourse(user: RequestUser, courseId: string, dto: UpdateCourseDto) {
    const course = await this.ownedCourse(user, courseId);
    if (dto.slug && dto.slug !== course.product.slug) {
      const clash = await this.prisma.product.findFirst({
        where: {
          appId: user.appId,
          slug: dto.slug,
          NOT: { id: course.productId },
        },
      });
      if (clash) {
        throw new AppError(ErrorCodes.CONFLICT, "Slug already in use", 409);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.title) {
        await tx.course.update({
          where: { id: course.id },
          data: { title: dto.title },
        });
      }
      await tx.product.update({
        where: { id: course.productId },
        data: {
          ...(dto.title ? { name: dto.title } : {}),
          ...(dto.slug ? { slug: dto.slug } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
        },
      });
      if (dto.priceMinor !== undefined) {
        const price = course.product.prices[0];
        if (price) {
          await tx.productPrice.update({
            where: { id: price.id },
            data: { amountMinor: dto.priceMinor },
          });
        } else {
          await tx.productPrice.create({
            data: {
              productId: course.productId,
              currency: "VND",
              amountMinor: dto.priceMinor,
            },
          });
        }
      }
    });
    return { ok: true as const };
  }

  async addSection(user: RequestUser, courseId: string, dto: TitleDto) {
    const course = await this.ownedCourse(user, courseId);
    const position = course.sections.reduce((max, section) => Math.max(max, section.position), 0) + 1;
    await this.prisma.courseSection.create({
      data: {
        courseId: course.id,
        title: dto.title.trim(),
        position,
      },
    });
    return { ok: true as const };
  }

  async updateSection(user: RequestUser, courseId: string, sectionId: string, dto: TitleDto) {
    const course = await this.ownedCourse(user, courseId);
    const section = course.sections.find((row) => row.id === sectionId);
    if (!section) throw new AppError(ErrorCodes.NOT_FOUND, "Section not found", 404);
    await this.prisma.courseSection.update({
      where: { id: section.id },
      data: { title: dto.title.trim() },
    });
    return { ok: true as const };
  }

  async deleteSection(user: RequestUser, courseId: string, sectionId: string) {
    const course = await this.ownedCourse(user, courseId);
    const section = course.sections.find((row) => row.id === sectionId);
    if (!section) throw new AppError(ErrorCodes.NOT_FOUND, "Section not found", 404);
    const lessonIds = section.lessons.map((lesson) => lesson.id);
    await this.prisma.$transaction(async (tx) => {
      if (lessonIds.length > 0) {
        await tx.lesson.updateMany({
          where: { prerequisiteLessonId: { in: lessonIds } },
          data: { prerequisiteLessonId: null },
        });
      }
      await tx.courseSection.delete({ where: { id: section.id } });
    });
    return { ok: true as const };
  }

  async addLesson(user: RequestUser, courseId: string, sectionId: string, dto: CreateLessonDto) {
    const course = await this.ownedCourse(user, courseId);
    const section = course.sections.find((row) => row.id === sectionId);
    if (!section) throw new AppError(ErrorCodes.NOT_FOUND, "Section not found", 404);
    const position = section.lessons.reduce((max, lesson) => Math.max(max, lesson.position), 0) + 1;
    const contents = buildLessonContents({ body: dto.body });
    const isPreview = Boolean(dto.isPreview);
    await this.prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.create({
        data: {
          sectionId: section.id,
          title: dto.title.trim(),
          position,
          isPreview,
          contents: contents.length ? { create: contents } : undefined,
        },
      });
      await this.writeLessonPolicies(tx, lesson.id, isPreview, course.productId);
    });
    return { ok: true as const };
  }

  async deleteLesson(user: RequestUser, courseId: string, lessonId: string) {
    const course = await this.ownedCourse(user, courseId);
    const lesson = course.sections.flatMap((section) => section.lessons).find((row) => row.id === lessonId);
    if (!lesson) throw new AppError(ErrorCodes.NOT_FOUND, "Lesson not found", 404);
    await this.prisma.$transaction(async (tx) => {
      await tx.lesson.updateMany({
        where: { prerequisiteLessonId: lesson.id },
        data: { prerequisiteLessonId: null },
      });
      await tx.lesson.delete({ where: { id: lesson.id } });
    });
    return { ok: true as const };
  }

  async putLessonContent(
    user: RequestUser,
    courseId: string,
    lessonId: string,
    dto: PutLessonContentDto,
  ) {
    const course = await this.ownedCourse(user, courseId);
    const lesson = course.sections.flatMap((section) => section.lessons).find((row) => row.id === lessonId);
    if (!lesson) throw new AppError(ErrorCodes.NOT_FOUND, "Lesson not found", 404);
    if (dto.videoId?.trim()) {
      await this.assertOwnedVideos(user, [dto.videoId]);
    }
    if (dto.documentIds?.length) {
      await this.assertOwnedDocuments(user, dto.documentIds);
    }
    const contents = buildLessonContents({
      body: dto.body,
      videoId: dto.videoId,
      documentIds: dto.documentIds,
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.lessonContent.deleteMany({ where: { lessonId: lesson.id } });
      if (contents.length > 0) {
        await tx.lessonContent.createMany({
          data: contents.map((content) => ({
            lessonId: lesson.id,
            contentType: content.contentType,
            body: content.body,
            refId: content.refId,
            position: content.position,
          })),
        });
      }
    });
    return { ok: true as const };
  }

  async createCourseDocument(user: RequestUser, courseId: string, dto: CreateCourseDocumentDto) {
    await this.ownedCourse(user, courseId);
    const document = await this.prisma.document.create({
      data: {
        appId: user.appId,
        ownerUserId: user.userId,
        title: dto.title.trim(),
        status: "DRAFT",
      },
    });
    return { document };
  }
}
