import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@edu/database";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import type { RequestUser } from "../auth/auth.guard";
import {
  MAX_COURSE_ROWS,
  MAX_LESSON_ROWS,
  parseCourseRows,
  parseLessonRows,
  type MappedCourseRow,
  type MappedLessonRow,
} from "./csv";

export type ImportConflict = "fail" | "skip";
export type ImportMode = "all" | "valid_only";

export type CourseImportInput = {
  csv: string;
  lessonsCsv?: string;
  onConflict?: ImportConflict;
  importMode?: ImportMode;
};

export type CoursePreviewRow = MappedCourseRow & {
  status: "ok" | "error" | "skip";
  teacherName: string | null;
  categoryName: string | null;
  lessonCount: number;
};

export type LessonPreviewRow = MappedLessonRow & {
  status: "ok" | "error";
};

export type ImportPreview = {
  summary: {
    total: number;
    valid: number;
    invalid: number;
    skipped: number;
    lessonTotal: number;
    lessonInvalid: number;
    canCommitAll: boolean;
    canCommitValid: boolean;
  };
  courses: CoursePreviewRow[];
  lessons: LessonPreviewRow[];
  teachers: Array<{ email: string; displayName: string; roles: string[] }>;
  categories: Array<{ slug: string; name: string }>;
};

export type ImportCommitResult = {
  ok: boolean;
  imported: number;
  skipped: number;
  blocked: number;
  courses: Array<{
    row: number;
    title: string;
    slug: string;
    productId: string;
    courseId: string;
    published: boolean;
  }>;
  preview: ImportPreview;
};

const PUBLISHER_ROLES = ["teacher", "admin", "super_admin"] as const;

type TeacherRecord = {
  id: string;
  email: string;
  displayName: string;
  status: string;
  roles: string[];
};

type PreparedCourse = CoursePreviewRow & {
  teacherId: string;
  categoryId: string | null;
  lessons: MappedLessonRow[];
};

@Injectable()
export class CourseImportService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  assertAdmin(user: RequestUser) {
    if (!hasAnyRole(user as never, ["admin", "super_admin", "support_agent"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Admin only", 403);
    }
  }

  assertPublisher(user: RequestUser) {
    if (!hasAnyRole(user as never, ["admin", "super_admin"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Chỉ quản trị mới được nhập hàng loạt", 403);
    }
  }

  async lookups(user: RequestUser) {
    this.assertAdmin(user);
    const [teachers, categories] = await Promise.all([
      this.loadTeachers(user.appId),
      this.loadCategories(user.appId),
    ]);
    return {
      teachers: teachers.map((row) => ({
        email: row.email,
        displayName: row.displayName,
        roles: row.roles,
      })),
      categories: categories.map((row) => ({ slug: row.slug, name: row.name })),
      limits: { maxCourses: MAX_COURSE_ROWS, maxLessons: MAX_LESSON_ROWS },
    };
  }

  async preview(user: RequestUser, input: CourseImportInput): Promise<ImportPreview> {
    this.assertAdmin(user);
    return (await this.prepare(user, input)).preview;
  }

  async commit(user: RequestUser, input: CourseImportInput): Promise<ImportCommitResult> {
    this.assertPublisher(user);
    const prepared = await this.prepare(user, input);
    const mode = input.importMode ?? "all";
    if (mode === "all" && !prepared.preview.summary.canCommitAll) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        "Chưa thể ghi: còn dòng lỗi. Sửa file hoặc chọn chỉ nhập các dòng đúng.",
        400,
        { preview: prepared.preview },
      );
    }
    if (prepared.accepted.length === 0) {
      throw new AppError(ErrorCodes.VALIDATION, "Không còn dòng hợp lệ để ghi.", 400, {
        preview: prepared.preview,
      });
    }

    let created: ImportCommitResult["courses"];
    try {
      created = await this.prisma.$transaction(
      async (tx) => {
        const out: ImportCommitResult["courses"] = [];
        for (const course of prepared.accepted) {
          const product = await tx.product.create({
            data: {
              appId: user.appId,
              type: "VIDEO_COURSE",
              name: course.title,
              slug: course.slug,
              description: course.description,
              thumbnailUrl: course.coverUrl,
              status: course.publish ? "PUBLISHED" : "DRAFT",
              visibility: course.visibility,
              creatorUserId: course.teacherId,
              categoryId: course.categoryId,
              prices: {
                create: {
                  currency: "VND",
                  amountMinor: course.priceVnd,
                  compareAtMinor: course.compareAtVnd,
                },
              },
            },
          });
          const createdCourse = await tx.course.create({
            data: {
              appId: user.appId,
              productId: product.id,
              title: course.title,
              status: course.publish ? "PUBLISHED" : "DRAFT",
              creatorUserId: course.teacherId,
              level: course.level,
              language: course.language,
            },
          });
          if (course.lessons.length === 0) {
            await tx.courseSection.create({
              data: { courseId: createdCourse.id, title: "Chương 1", position: 1 },
            });
          } else {
            const sections = groupLessons(course.lessons);
            let sectionPos = 1;
            for (const section of sections) {
              const createdSection = await tx.courseSection.create({
                data: {
                  courseId: createdCourse.id,
                  title: section.title,
                  position: section.position || sectionPos,
                },
              });
              sectionPos += 1;
              let lessonPos = 1;
              for (const lesson of section.lessons) {
                const createdLesson = await tx.lesson.create({
                  data: {
                    sectionId: createdSection.id,
                    title: lesson.lesson,
                    position: lesson.lessonOrder || lessonPos,
                    isPreview: lesson.preview,
                  },
                });
                lessonPos += 1;
                if (lesson.content) {
                  await tx.lessonContent.create({
                    data: {
                      lessonId: createdLesson.id,
                      contentType: "TEXT",
                      body: lesson.content,
                      position: 1,
                    },
                  });
                }
              }
            }
          }
          out.push({
            row: course.row,
            title: course.title,
            slug: course.slug,
            productId: product.id,
            courseId: createdCourse.id,
            published: course.publish,
          });
        }
        await tx.auditLog.create({
          data: {
            appId: user.appId,
            actorUserId: user.userId,
            action: "product.bulk_import",
            resourceType: "product",
            resourceId: out[0]?.productId ?? "bulk",
            metaJson: {
              imported: out.length,
              slugs: out.map((item) => item.slug),
              onConflict: input.onConflict ?? "fail",
              importMode: mode,
            },
          },
        });
        return out;
      },
      { timeout: 120_000, maxWait: 10_000 },
    );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(
          ErrorCodes.CONFLICT,
          "Đường dẫn bị trùng khi đang ghi. Kiểm tra lại hoặc chọn bỏ qua khóa trùng.",
          409,
        );
      }
      throw error;
    }

    return {
      ok: true,
      imported: created.length,
      skipped: prepared.preview.summary.skipped,
      blocked: prepared.preview.summary.invalid,
      courses: created,
      preview: prepared.preview,
    };
  }

  private async prepare(user: RequestUser, input: CourseImportInput): Promise<{
    preview: ImportPreview;
    accepted: PreparedCourse[];
  }> {
    let parsedCourses;
    let parsedLessons;
    try {
      parsedCourses = parseCourseRows(input.csv);
      parsedLessons = parseLessonRows(input.lessonsCsv ?? "");
    } catch (error) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        error instanceof Error ? error.message : "File CSV không đọc được",
        400,
      );
    }

    const onConflict = input.onConflict ?? "fail";
    const [teachers, categories, existing] = await Promise.all([
      this.loadTeachers(user.appId),
      this.loadCategories(user.appId),
      this.prisma.product.findMany({
        where: { appId: user.appId, slug: { in: parsedCourses.courses.map((row) => row.slug) } },
        select: { slug: true },
      }),
    ]);
    const teacherByEmail = new Map(teachers.map((row) => [row.email.toLowerCase(), row]));
    const categoryBySlug = new Map(categories.map((row) => [row.slug, row]));
    const existingSlugs = new Set(existing.map((row) => row.slug));
    const fileSlugs = new Set(parsedCourses.courses.map((row) => row.slug));

    const lessons: LessonPreviewRow[] = parsedLessons.lessons.map((lesson) => {
      const errors = [...lesson.errors];
      if (lesson.courseSlug && !fileSlugs.has(lesson.courseSlug)) {
        errors.push(`Không có khóa "${lesson.courseSlug}" trong file khóa học đang nhập.`);
      }
      return {
        ...lesson,
        errors,
        status: errors.length ? "error" : "ok",
      };
    });
    const lessonsBySlug = new Map<string, LessonPreviewRow[]>();
    for (const lesson of lessons) {
      const list = lessonsBySlug.get(lesson.courseSlug) ?? [];
      list.push(lesson);
      lessonsBySlug.set(lesson.courseSlug, list);
    }

    const courses: CoursePreviewRow[] = parsedCourses.courses.map((course) => {
      const errors = [...course.errors];
      const warnings = [...course.warnings];
      const teacher = teacherByEmail.get(course.teacherEmail);
      if (course.teacherEmail && !teacher) {
        errors.push(`Chưa có tài khoản ${course.teacherEmail}. Tạo giảng viên trước, rồi nhập lại.`);
      } else if (teacher && teacher.status !== "ACTIVE") {
        errors.push(`Tài khoản ${course.teacherEmail} đang không hoạt động.`);
      } else if (teacher && !teacher.roles.some((role) => PUBLISHER_ROLES.includes(role as (typeof PUBLISHER_ROLES)[number]))) {
        errors.push(`${course.teacherEmail} chưa có quyền giảng viên/quản trị.`);
      }
      let categoryName: string | null = null;
      if (course.categorySlug) {
        const category = categoryBySlug.get(course.categorySlug);
        if (!category) {
          errors.push(`Danh mục "${course.categorySlug}" chưa tồn tại. Tạo danh mục trước, không tự tạo khi nhập.`);
        } else {
          categoryName = category.name;
        }
      }
      const courseLessons = lessonsBySlug.get(course.slug) ?? [];
      if (courseLessons.some((item) => item.status === "error")) {
        errors.push("Có bài học lỗi gắn với khóa này.");
      }
      let status: CoursePreviewRow["status"] = errors.length ? "error" : "ok";
      if (status === "ok" && existingSlugs.has(course.slug)) {
        if (onConflict === "skip") {
          status = "skip";
          warnings.push("Đường dẫn đã có trên hệ thống — sẽ bỏ qua.");
        } else {
          status = "error";
          errors.push("Đường dẫn đã tồn tại. Đổi slug hoặc chọn bỏ qua khóa trùng.");
        }
      }
      return {
        ...course,
        errors,
        warnings,
        status,
        teacherName: teacher?.displayName ?? null,
        categoryName,
        lessonCount: courseLessons.filter((item) => item.status === "ok").length,
      };
    });

    const accepted: PreparedCourse[] = [];
    for (const course of courses) {
      if (course.status !== "ok") continue;
      const teacher = teacherByEmail.get(course.teacherEmail);
      if (!teacher) continue;
      accepted.push({
        ...course,
        teacherId: teacher.id,
        categoryId: course.categorySlug ? categoryBySlug.get(course.categorySlug)?.id ?? null : null,
        lessons: (lessonsBySlug.get(course.slug) ?? []).filter((item) => item.status === "ok"),
      });
    }

    const invalid = courses.filter((row) => row.status === "error").length;
    const skipped = courses.filter((row) => row.status === "skip").length;
    const valid = accepted.length;
    const lessonInvalid = lessons.filter((row) => row.status === "error").length;
    const preview: ImportPreview = {
      summary: {
        total: courses.length,
        valid,
        invalid,
        skipped,
        lessonTotal: lessons.length,
        lessonInvalid,
        canCommitAll: invalid === 0 && valid > 0,
        canCommitValid: valid > 0,
      },
      courses,
      lessons: lessons.filter((row) => row.status === "error"),
      teachers: teachers.map((row) => ({
        email: row.email,
        displayName: row.displayName,
        roles: row.roles,
      })),
      categories: categories.map((row) => ({ slug: row.slug, name: row.name })),
    };
    return { preview, accepted };
  }

  private async loadTeachers(appId: string): Promise<TeacherRecord[]> {
    const users = await this.prisma.user.findMany({
      where: {
        appId,
        status: "ACTIVE",
        roles: { some: { role: { code: { in: [...PUBLISHER_ROLES] } } } },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        roles: { select: { role: { select: { code: true } } } },
      },
      orderBy: { email: "asc" },
      take: 300,
    });
    return users.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      status: row.status,
      roles: row.roles.map((item) => item.role.code),
    }));
  }

  private async loadCategories(appId: string) {
    return this.prisma.category.findMany({
      where: { appId },
      select: { id: true, slug: true, name: true },
      orderBy: { name: "asc" },
      take: 300,
    });
  }
}

function groupLessons(lessons: MappedLessonRow[]): Array<{ title: string; position: number; lessons: MappedLessonRow[] }> {
  const groups = new Map<string, { title: string; position: number; lessons: MappedLessonRow[] }>();
  for (const lesson of lessons) {
    const key = lesson.section;
    const existing = groups.get(key);
    if (existing) {
      existing.lessons.push(lesson);
      existing.position = Math.min(existing.position, lesson.sectionOrder);
    } else {
      groups.set(key, { title: lesson.section, position: lesson.sectionOrder, lessons: [lesson] });
    }
  }
  return [...groups.values()]
    .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title, "vi"))
    .map((group) => ({
      ...group,
      lessons: [...group.lessons].sort((a, b) => a.lessonOrder - b.lessonOrder || a.row - b.row),
    }));
}
