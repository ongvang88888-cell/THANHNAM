import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Query,
  UseGuards,
  Inject,
} from "@nestjs/common";
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  getGplxExamRules,
  pickMockQuestionIds,
  pickCriticalOnlyQuestionIds,
  resolveFixedSetQuestionIds,
  scoreGplxMockByMode,
  gplxProgressStatus,
  gplxUtcDateString,
  applyGplxStudyStreak,
  rankWeakTopics,
  GPLX_TIPS,
  GPLX_SIGNS,
  buildGplxSevenDayPlan,
  GPLX_PRO_PRODUCT_SLUG,
  GPLX_FREE_MOCKS_PER_DAY,
  type GplxQuestionKey,
  type GplxMockMode,
} from "@edu/education-core";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

const LICENSE_CLASSES = [
  "A1",
  "A",
  "B1",
  "B",
  "C1",
  "C",
  "D1",
  "D2",
  "D",
  "BE",
  "CE",
  "DE",
  "E",
  "F",
] as const;
const MOCK_MODES = ["random", "fixed", "critical_only"] as const;

class AnswerDto {
  @IsString()
  questionId!: string;

  @IsArray()
  @IsString({ each: true })
  selectedAnswerIds!: string[];
}

class StartMockDto {
  @IsString()
  @IsIn(LICENSE_CLASSES)
  licenseClass!: string;

  @IsOptional()
  @IsIn(MOCK_MODES)
  mode?: string;

  @IsOptional()
  @IsString()
  fixedSetId?: string;
}

class BookmarkDto {
  @IsString()
  questionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class SubmitMockDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}

class PracticeAnswerDto {
  @IsString()
  questionId!: string;

  @IsArray()
  @IsString({ each: true })
  selectedAnswerIds!: string[];
}

function asStringArray(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((x): x is string => typeof x === "string");
}

@Injectable()
export class GplxService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listLicenseClasses() {
    return LICENSE_CLASSES.map((code) => {
      const rules = getGplxExamRules(code);
      return {
        code,
        questionCount: rules.questionCount,
        passCorrectCount: rules.passCorrectCount,
        durationSec: rules.durationSec,
        criticalFailEnabled: rules.criticalFailEnabled,
      };
    });
  }

  tips() {
    return { items: GPLX_TIPS };
  }

  signs(group?: string, q?: string) {
    let items = group
      ? GPLX_SIGNS.filter((s) => s.group === group)
      : GPLX_SIGNS;
    if (q) {
      const lower = q.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          s.code.toLowerCase().includes(lower) ||
          s.meaning.toLowerCase().includes(lower),
      );
    }
    return { items };
  }

  plan(licenseClass = "B") {
    return {
      licenseClass: licenseClass.toUpperCase(),
      days: buildGplxSevenDayPlan(licenseClass),
    };
  }

  private async hasGplxPro(user: RequestUser): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { appId_slug: { appId: user.appId, slug: GPLX_PRO_PRODUCT_SLUG } },
      select: { id: true },
    });
    if (!product) return false;
    const ent = await this.prisma.entitlement.findFirst({
      where: {
        userId: user.userId,
        appId: user.appId,
        status: "ACTIVE",
        resourceType: "product",
        resourceId: product.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    return !!ent;
  }

  private async mocksUsedToday(user: RequestUser): Promise<number> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return this.prisma.gplxMockAttempt.count({
      where: { userId: user.userId, appId: user.appId, startedAt: { gte: start } },
    });
  }

  private async touchStreak(user: RequestUser) {
    const today = gplxUtcDateString();
    const existing = await this.prisma.gplxStudyStreak.findUnique({
      where: { appId_userId: { appId: user.appId, userId: user.userId } },
    });
    const prev = existing
      ? {
          currentStreak: existing.currentStreak,
          longestStreak: existing.longestStreak,
          lastStudyDate: existing.lastStudyDate,
        }
      : { currentStreak: 0, longestStreak: 0, lastStudyDate: "" };
    const next = applyGplxStudyStreak(prev, today);
    const streak = await this.prisma.gplxStudyStreak.upsert({
      where: { appId_userId: { appId: user.appId, userId: user.userId } },
      create: {
        appId: user.appId,
        userId: user.userId,
        currentStreak: next.currentStreak,
        longestStreak: next.longestStreak,
        lastStudyDate: next.lastStudyDate,
      },
      update: {
        currentStreak: next.currentStreak,
        longestStreak: next.longestStreak,
        lastStudyDate: next.lastStudyDate,
      },
    });
    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastStudyDate: streak.lastStudyDate,
    };
  }

  private async getWeakTopicStats(user: RequestUser, licenseClass: string) {
    const cls = licenseClass.toUpperCase();
    const questions = await this.prisma.gplxBankQuestion.findMany({
      where: { appId: user.appId },
      select: {
        id: true,
        licenseClassesJson: true,
        topic: { select: { id: true, code: true, title: true } },
      },
    });
    const applicable = questions.filter((q) => {
      const classes = asStringArray(q.licenseClassesJson);
      return classes.length === 0 || classes.includes(cls);
    });
    const applicableIds = applicable.map((q) => q.id);
    const progress = await this.prisma.gplxStudyProgress.findMany({
      where: {
        userId: user.userId,
        questionId: { in: applicableIds },
      },
    });
    const qById = new Map(applicable.map((q) => [q.id, q]));
    const rows = progress.map((p) => {
      const q = qById.get(p.questionId)!;
      return {
        topicId: q.topic.id,
        topicCode: q.topic.code,
        topicTitle: q.topic.title,
        correctCount: p.correctCount,
        wrongCount: p.wrongCount,
      };
    });
    return rankWeakTopics(rows);
  }

  async overview(user: RequestUser, licenseClass = "B") {
    const rules = getGplxExamRules(licenseClass);
    const classesFilter = licenseClass.toUpperCase();
    const isPro = await this.hasGplxPro(user);
    const mocksUsedToday = await this.mocksUsedToday(user);
    const mocksRemainingToday = isPro
      ? null
      : Math.max(0, GPLX_FREE_MOCKS_PER_DAY - mocksUsedToday);

    const proProduct = await this.prisma.product.findUnique({
      where: { appId_slug: { appId: user.appId, slug: GPLX_PRO_PRODUCT_SLUG } },
      include: { prices: true },
    });

    const topics = await this.prisma.gplxTopic.findMany({
      where: { appId: user.appId },
      orderBy: { position: "asc" },
      include: {
        _count: { select: { questions: true } },
      },
    });

    const questions = await this.prisma.gplxBankQuestion.findMany({
      where: { appId: user.appId },
      select: { id: true, isCritical: true, licenseClassesJson: true, topicId: true },
    });

    const applicable = questions.filter((q) => {
      const classes = asStringArray(q.licenseClassesJson);
      return classes.length === 0 || classes.includes(classesFilter);
    });

    const progress = await this.prisma.gplxStudyProgress.findMany({
      where: {
        userId: user.userId,
        questionId: { in: applicable.map((q) => q.id) },
      },
    });
    const byQ = new Map(progress.map((p) => [p.questionId, p]));

    let mastered = 0;
    let wrong = 0;
    let learning = 0;
    for (const q of applicable) {
      const p = byQ.get(q.id);
      const status = p?.status ?? "unseen";
      if (status === "mastered") mastered += 1;
      else if (status === "wrong") wrong += 1;
      else if (status === "learning") learning += 1;
    }

    const recentAttempts = await this.prisma.gplxMockAttempt.findMany({
      where: { userId: user.userId, licenseClass: classesFilter },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true,
        passed: true,
        score: true,
        correctCount: true,
        total: true,
        failedCritical: true,
        mode: true,
        startedAt: true,
        submittedAt: true,
      },
    });

    const streakRow = await this.prisma.gplxStudyStreak.findUnique({
      where: { appId_userId: { appId: user.appId, userId: user.userId } },
    });
    const streak = streakRow
      ? {
          currentStreak: streakRow.currentStreak,
          longestStreak: streakRow.longestStreak,
          lastStudyDate: streakRow.lastStudyDate,
        }
      : { currentStreak: 0, longestStreak: 0, lastStudyDate: "" };

    const bookmarkCount = await this.prisma.gplxBookmark.count({
      where: { appId: user.appId, userId: user.userId },
    });

    const weakTopics = (await this.getWeakTopicStats(user, classesFilter)).slice(0, 3);

    return {
      licenseClass: classesFilter,
      rules,
      isPro,
      mocksUsedToday,
      mocksRemainingToday,
      freeMocksPerDay: GPLX_FREE_MOCKS_PER_DAY,
      proProduct: proProduct
        ? {
            id: proProduct.id,
            slug: proProduct.slug,
            name: proProduct.name,
            price: proProduct.prices[0]
              ? {
                  currency: proProduct.prices[0].currency,
                  amountMinor: proProduct.prices[0].amountMinor,
                }
              : null,
          }
        : null,
      stats: {
        totalQuestions: applicable.length,
        criticalCount: applicable.filter((q) => q.isCritical).length,
        mastered,
        learning,
        wrong,
        unseen: applicable.length - mastered - learning - wrong,
      },
      streak,
      bookmarkCount,
      weakTopics,
      topics: topics.map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        questionCount: t._count.questions,
      })),
      recentAttempts,
      planPreview: buildGplxSevenDayPlan(classesFilter).slice(0, 3),
    };
  }

  async search(user: RequestUser, q: string, licenseClass = "B") {
    const trimmed = q.trim();
    if (trimmed.length < 2) return { items: [] };

    const cls = licenseClass.toUpperCase();
    const officialNo = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : null;

    const questions = await this.prisma.gplxBankQuestion.findMany({
      where: {
        appId: user.appId,
        OR: [
          { stem: { contains: trimmed, mode: "insensitive" } },
          ...(officialNo !== null ? [{ officialNo }] : []),
        ],
      },
      include: { topic: true },
      take: 30,
    });

    const filtered = questions.filter((question) => {
      const classes = asStringArray(question.licenseClassesJson);
      return classes.length === 0 || classes.includes(cls);
    });

    const bookmarks = await this.prisma.gplxBookmark.findMany({
      where: {
        userId: user.userId,
        questionId: { in: filtered.map((question) => question.id) },
      },
      select: { questionId: true },
    });
    const bookmarkedIds = new Set(bookmarks.map((b) => b.questionId));

    return {
      items: filtered.map((question) => ({
        id: question.id,
        stem: question.stem,
        isCritical: question.isCritical,
        officialNo: question.officialNo,
        topicTitle: question.topic.title,
        bookmarked: bookmarkedIds.has(question.id),
      })),
    };
  }

  async listBookmarks(user: RequestUser, licenseClass = "B") {
    const cls = licenseClass.toUpperCase();
    const bookmarks = await this.prisma.gplxBookmark.findMany({
      where: { appId: user.appId, userId: user.userId },
      include: {
        question: {
          include: {
            topic: true,
            answers: { orderBy: { position: "asc" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const filtered = bookmarks.filter((b) => {
      const classes = asStringArray(b.question.licenseClassesJson);
      return classes.length === 0 || classes.includes(cls);
    });
    return {
      licenseClass: cls,
      items: filtered.map((b) => ({
        id: b.question.id,
        bookmarkId: b.id,
        stem: b.question.stem,
        explanation: b.question.explanation,
        isCritical: b.question.isCritical,
        topicTitle: b.question.topic.title,
        note: b.note,
        officialNo: b.question.officialNo,
        answers: b.question.answers.map((a) => ({ id: a.id, body: a.body })),
      })),
    };
  }

  async addBookmark(user: RequestUser, dto: BookmarkDto) {
    const question = await this.prisma.gplxBankQuestion.findFirst({
      where: { id: dto.questionId, appId: user.appId },
    });
    if (!question) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Question not found", 404);
    }
    await this.prisma.gplxBookmark.upsert({
      where: {
        userId_questionId: { userId: user.userId, questionId: dto.questionId },
      },
      create: {
        appId: user.appId,
        userId: user.userId,
        questionId: dto.questionId,
        note: dto.note ?? "",
      },
      update: {
        ...(dto.note !== undefined ? { note: dto.note } : {}),
      },
    });
    return { ok: true };
  }

  async removeBookmark(user: RequestUser, questionId: string) {
    await this.prisma.gplxBookmark.deleteMany({
      where: { userId: user.userId, questionId },
    });
    return { ok: true };
  }

  async listFixedSets(user: RequestUser, licenseClass = "B") {
    const cls = licenseClass.toUpperCase();
    const sets = await this.prisma.gplxFixedSet.findMany({
      where: { appId: user.appId, licenseClass: cls },
      orderBy: { position: "asc" },
    });
    return {
      licenseClass: cls,
      items: sets.map((s) => ({
        id: s.id,
        code: s.code,
        title: s.title,
        licenseClass: s.licenseClass,
        questionCount: asStringArray(s.questionIdsJson).length,
        position: s.position,
      })),
    };
  }

  async flashcards(
    user: RequestUser,
    licenseClass = "B",
    kind?: "signs" | "critical" | "wrong",
  ) {
    const cls = licenseClass.toUpperCase();

    if (kind === "signs") {
      return {
        items: GPLX_SIGNS.map((s) => ({
          id: s.id,
          front: `${s.code} ${s.name}`,
          back: s.meaning,
          kind: "sign",
        })),
      };
    }

    if (kind === "critical") {
      const critical = await this.criticalQuestions(user, cls);
      return {
        items: critical.questions.map((q) => ({
          id: q.id,
          front: q.stem,
          back: q.explanation,
          kind: "critical",
        })),
      };
    }

    if (kind === "wrong") {
      const wrong = await this.wrongQuestions(user, cls);
      return {
        items: wrong.questions.map((q) => ({
          id: q.id,
          front: q.stem,
          back: q.explanation,
          kind: "wrong",
        })),
      };
    }

    const signItems = GPLX_SIGNS.map((s) => ({
      id: s.id,
      front: `${s.code} ${s.name}`,
      back: s.meaning,
      kind: "sign" as const,
    }));
    const critical = await this.criticalQuestions(user, cls);
    const criticalItems = critical.questions.slice(0, 20).map((q) => ({
      id: q.id,
      front: q.stem,
      back: q.explanation,
      kind: "critical" as const,
    }));
    return { items: [...signItems, ...criticalItems] };
  }

  async hardest(user: RequestUser, licenseClass = "B") {
    const cls = licenseClass.toUpperCase();
    const rows = await this.prisma.gplxStudyProgress.findMany({
      where: {
        userId: user.userId,
        wrongCount: { gt: 0 },
      },
      include: {
        question: {
          include: {
            topic: true,
            answers: { orderBy: { position: "asc" } },
          },
        },
      },
      orderBy: { wrongCount: "desc" },
      take: 100,
    });
    const filtered = rows
      .filter((r) => {
        if (r.question.appId !== user.appId) return false;
        const classes = asStringArray(r.question.licenseClassesJson);
        return classes.length === 0 || classes.includes(cls);
      })
      .slice(0, 50);
    return {
      licenseClass: cls,
      items: filtered.map((r) => ({
        id: r.question.id,
        stem: r.question.stem,
        explanation: r.question.explanation,
        isCritical: r.question.isCritical,
        topicTitle: r.question.topic.title,
        wrongCount: r.wrongCount,
        officialNo: r.question.officialNo,
        answers: r.question.answers.map((a) => ({ id: a.id, body: a.body })),
      })),
    };
  }

  async weakTopics(user: RequestUser, licenseClass = "B") {
    const cls = licenseClass.toUpperCase();
    return {
      licenseClass: cls,
      items: await this.getWeakTopicStats(user, cls),
    };
  }

  async listTopics(user: RequestUser) {
    return this.prisma.gplxTopic.findMany({
      where: { appId: user.appId },
      orderBy: { position: "asc" },
      include: { _count: { select: { questions: true } } },
    });
  }

  async topicQuestions(
    user: RequestUser,
    topicId: string,
    licenseClass = "B",
  ) {
    const topic = await this.prisma.gplxTopic.findFirst({
      where: { id: topicId, appId: user.appId },
    });
    if (!topic) throw new AppError(ErrorCodes.NOT_FOUND, "Topic not found", 404);

    const cls = licenseClass.toUpperCase();
    const questions = await this.prisma.gplxBankQuestion.findMany({
      where: { appId: user.appId, topicId },
      include: { answers: { orderBy: { position: "asc" } } },
      orderBy: { position: "asc" },
    });

    const filtered = questions.filter((q) => {
      const classes = asStringArray(q.licenseClassesJson);
      return classes.length === 0 || classes.includes(cls);
    });

    return {
      topic: { id: topic.id, code: topic.code, title: topic.title },
      licenseClass: cls,
      questions: filtered.map((q) => ({
        id: q.id,
        stem: q.stem,
        explanation: q.explanation,
        isCritical: q.isCritical,
        imageUrl: q.imageUrl,
        officialNo: q.officialNo,
        answers: q.answers.map((a) => ({ id: a.id, body: a.body })),
      })),
    };
  }

  async criticalQuestions(user: RequestUser, licenseClass = "B") {
    const cls = licenseClass.toUpperCase();
    const questions = await this.prisma.gplxBankQuestion.findMany({
      where: { appId: user.appId, isCritical: true },
      include: { answers: { orderBy: { position: "asc" } }, topic: true },
      orderBy: { position: "asc" },
    });
    const filtered = questions.filter((q) => {
      const classes = asStringArray(q.licenseClassesJson);
      return classes.length === 0 || classes.includes(cls);
    });
    return {
      licenseClass: cls,
      questions: filtered.map((q) => ({
        id: q.id,
        stem: q.stem,
        explanation: q.explanation,
        isCritical: true,
        topicTitle: q.topic.title,
        answers: q.answers.map((a) => ({ id: a.id, body: a.body })),
      })),
    };
  }

  async wrongQuestions(user: RequestUser, licenseClass = "B") {
    const cls = licenseClass.toUpperCase();
    const rows = await this.prisma.gplxStudyProgress.findMany({
      where: { userId: user.userId, status: "wrong" },
      include: {
        question: {
          include: { answers: { orderBy: { position: "asc" } }, topic: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    const filtered = rows.filter((r) => {
      if (r.question.appId !== user.appId) return false;
      const classes = asStringArray(r.question.licenseClassesJson);
      return classes.length === 0 || classes.includes(cls);
    });
    return {
      licenseClass: cls,
      questions: filtered.map((r) => ({
        id: r.question.id,
        stem: r.question.stem,
        explanation: r.question.explanation,
        isCritical: r.question.isCritical,
        topicTitle: r.question.topic.title,
        wrongCount: r.wrongCount,
        answers: r.question.answers.map((a) => ({ id: a.id, body: a.body })),
      })),
    };
  }

  async submitPractice(user: RequestUser, dto: PracticeAnswerDto) {
    const question = await this.prisma.gplxBankQuestion.findFirst({
      where: { id: dto.questionId, appId: user.appId },
      include: { answers: true },
    });
    if (!question) throw new AppError(ErrorCodes.NOT_FOUND, "Question not found", 404);

    const correctIds = question.answers.filter((a) => a.isCorrect).map((a) => a.id).sort();
    const selected = [...dto.selectedAnswerIds].sort();
    const correct =
      selected.length === correctIds.length &&
      selected.every((id, i) => id === correctIds[i]);

    const existing = await this.prisma.gplxStudyProgress.findUnique({
      where: {
        userId_questionId: { userId: user.userId, questionId: question.id },
      },
    });
    const correctCount = (existing?.correctCount ?? 0) + (correct ? 1 : 0);
    const wrongCount = (existing?.wrongCount ?? 0) + (correct ? 0 : 1);
    const status = gplxProgressStatus(correctCount, wrongCount);

    await this.prisma.gplxStudyProgress.upsert({
      where: {
        userId_questionId: { userId: user.userId, questionId: question.id },
      },
      create: {
        userId: user.userId,
        questionId: question.id,
        status,
        correctCount,
        wrongCount,
        lastSeenAt: new Date(),
      },
      update: {
        status,
        correctCount,
        wrongCount,
        lastSeenAt: new Date(),
      },
    });

    const streak = await this.touchStreak(user);

    return {
      correct,
      explanation: question.explanation,
      correctAnswerIds: correctIds,
      status,
      streak,
    };
  }

  async startMock(
    user: RequestUser,
    licenseClass: string,
    mode = "random",
    fixedSetId?: string,
  ) {
    const mockMode = (mode || "random") as GplxMockMode;
    if (!MOCK_MODES.includes(mockMode as (typeof MOCK_MODES)[number])) {
      throw new AppError(ErrorCodes.VALIDATION, "Invalid mock mode", 400);
    }

    let rules = getGplxExamRules(licenseClass);
    let cls = rules.licenseClass;
    let resolvedFixedSetId: string | undefined;

    const isPro = await this.hasGplxPro(user);
    if (!isPro) {
      const used = await this.mocksUsedToday(user);
      if (used >= GPLX_FREE_MOCKS_PER_DAY) {
        const product = await this.prisma.product.findUnique({
          where: { appId_slug: { appId: user.appId, slug: GPLX_PRO_PRODUCT_SLUG } },
        });
        throw new AppError(
          ErrorCodes.NEEDS_PURCHASE,
          `Free tier: tối đa ${GPLX_FREE_MOCKS_PER_DAY} đề thi thử/ngày. Nâng cấp GPLX Pro để thi không giới hạn.`,
          403,
          { productIds: product ? [product.id] : [], feature: "gplx_pro" },
        );
      }
    }

    const pool = await this.prisma.gplxBankQuestion.findMany({
      where: { appId: user.appId },
      select: { id: true, isCritical: true, licenseClassesJson: true },
    });

    const filterApplicable = (license: string) =>
      pool.filter((q) => {
        const classes = asStringArray(q.licenseClassesJson);
        return classes.length === 0 || classes.includes(license);
      });

    let applicable = filterApplicable(cls);

    let questionIds: string[];
    let durationSec = rules.durationSec;

    if (mockMode === "critical_only") {
      questionIds = pickCriticalOnlyQuestionIds(applicable, rules);
      if (questionIds.length === 0) {
        throw new AppError(
          ErrorCodes.VALIDATION,
          "Không có câu điểm liệt cho hạng này",
          400,
        );
      }
      durationSec =
        questionIds.length === rules.questionCount
          ? rules.durationSec
          : Math.max(5 * 60, questionIds.length * 40);
    } else if (mockMode === "fixed") {
      if (!fixedSetId) {
        throw new AppError(ErrorCodes.VALIDATION, "fixedSetId required for fixed mode", 400);
      }
      const fixedSet = await this.prisma.gplxFixedSet.findFirst({
        where: { id: fixedSetId, appId: user.appId },
      });
      if (!fixedSet) {
        throw new AppError(ErrorCodes.NOT_FOUND, "Fixed set not found", 404);
      }
      rules = getGplxExamRules(fixedSet.licenseClass);
      cls = rules.licenseClass;
      applicable = filterApplicable(cls);
      const setIds = asStringArray(fixedSet.questionIdsJson);
      questionIds = resolveFixedSetQuestionIds(setIds, new Set(applicable.map((q) => q.id)));
      if (questionIds.length === 0) {
        throw new AppError(
          ErrorCodes.VALIDATION,
          "Bộ đề không có câu hỏi khả dụng",
          400,
        );
      }
      resolvedFixedSetId = fixedSet.id;
      durationSec = rules.durationSec;
    } else {
      if (applicable.length < rules.questionCount) {
        throw new AppError(
          ErrorCodes.VALIDATION,
          `Chưa đủ câu hỏi cho hạng ${cls} (cần ${rules.questionCount}, có ${applicable.length})`,
          400,
        );
      }
      questionIds = pickMockQuestionIds(applicable, rules);
    }

    const expiresAt = new Date(Date.now() + durationSec * 1000);

    const attempt = await this.prisma.gplxMockAttempt.create({
      data: {
        appId: user.appId,
        userId: user.userId,
        licenseClass: cls,
        mode: mockMode,
        fixedSetId: resolvedFixedSetId ?? null,
        questionIdsJson: questionIds,
        total: questionIds.length,
        expiresAt,
        detailJson: { rules, isPro, mode: mockMode },
      },
    });

    const questions = await this.prisma.gplxBankQuestion.findMany({
      where: { id: { in: questionIds } },
      include: { answers: { orderBy: { position: "asc" } } },
    });
    const byId = new Map(questions.map((q) => [q.id, q]));
    const ordered = questionIds
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => !!q);

    await this.prisma.analyticsEvent.create({
      data: {
        appId: user.appId,
        userId: user.userId,
        name: "gplx_mock_started",
        propsJson: { attemptId: attempt.id, licenseClass: cls, isPro, mode: mockMode },
      },
    });

    return {
      attemptId: attempt.id,
      licenseClass: cls,
      mode: mockMode,
      fixedSetId: resolvedFixedSetId ?? null,
      rules,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      questions: ordered.map((q) => ({
        id: q.id,
        stem: q.stem,
        isCritical: q.isCritical,
        imageUrl: q.imageUrl,
        answers: q.answers.map((a) => ({ id: a.id, body: a.body })),
      })),
    };
  }

  async getAttempt(user: RequestUser, attemptId: string) {
    const attempt = await this.prisma.gplxMockAttempt.findFirst({
      where: { id: attemptId, userId: user.userId, appId: user.appId },
    });
    if (!attempt) throw new AppError(ErrorCodes.NOT_FOUND, "Attempt not found", 404);

    if (attempt.submittedAt) {
      return {
        attemptId: attempt.id,
        licenseClass: attempt.licenseClass,
        mode: attempt.mode,
        fixedSetId: attempt.fixedSetId,
        submitted: true,
        score: attempt.score,
        correctCount: attempt.correctCount,
        total: attempt.total,
        passed: attempt.passed,
        failedCritical: attempt.failedCritical,
        detail: attempt.detailJson,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        submittedAt: attempt.submittedAt,
      };
    }

    const questionIds = asStringArray(attempt.questionIdsJson);
    const questions = await this.prisma.gplxBankQuestion.findMany({
      where: { id: { in: questionIds } },
      include: { answers: { orderBy: { position: "asc" } } },
    });
    const byId = new Map(questions.map((q) => [q.id, q]));
    const ordered = questionIds
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => !!q);

    const rules = getGplxExamRules(attempt.licenseClass);
    return {
      attemptId: attempt.id,
      licenseClass: attempt.licenseClass,
      mode: attempt.mode,
      fixedSetId: attempt.fixedSetId,
      submitted: false,
      rules,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      questions: ordered.map((q) => ({
        id: q.id,
        stem: q.stem,
        isCritical: q.isCritical,
        imageUrl: q.imageUrl,
        answers: q.answers.map((a) => ({ id: a.id, body: a.body })),
      })),
    };
  }

  async submitMock(user: RequestUser, attemptId: string, dto: SubmitMockDto) {
    const attempt = await this.prisma.gplxMockAttempt.findFirst({
      where: { id: attemptId, userId: user.userId, appId: user.appId },
    });
    if (!attempt) throw new AppError(ErrorCodes.NOT_FOUND, "Attempt not found", 404);
    if (attempt.submittedAt) {
      throw new AppError(ErrorCodes.VALIDATION, "Attempt already submitted", 400);
    }

    const mockMode = (attempt.mode as GplxMockMode) || "random";
    const rules = getGplxExamRules(attempt.licenseClass);
    const questionIds = asStringArray(attempt.questionIdsJson);
    const questions = await this.prisma.gplxBankQuestion.findMany({
      where: { id: { in: questionIds } },
      include: { answers: true },
    });
    const byId = new Map(questions.map((q) => [q.id, q]));
    const ordered = questionIds
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => !!q);

    if (ordered.length !== questionIds.length || ordered.length === 0) {
      throw new AppError(ErrorCodes.VALIDATION, "Attempt question set invalid", 400);
    }

    if (mockMode === "random" && ordered.length !== rules.questionCount) {
      throw new AppError(ErrorCodes.VALIDATION, "Attempt question set invalid", 400);
    }

    const now = new Date();
    const timedOut = now.getTime() > attempt.expiresAt.getTime();

    const keys: GplxQuestionKey[] = ordered.map((q) => ({
      id: q.id,
      isCritical: q.isCritical,
      correctAnswerIds: q.answers.filter((a) => a.isCorrect).map((a) => a.id),
    }));

    const scored = scoreGplxMockByMode(keys, dto.answers, rules, mockMode);

    for (const d of scored.details) {
      const existing = await this.prisma.gplxStudyProgress.findUnique({
        where: {
          userId_questionId: { userId: user.userId, questionId: d.questionId },
        },
      });
      const correctCount = (existing?.correctCount ?? 0) + (d.correct ? 1 : 0);
      const wrongCount = (existing?.wrongCount ?? 0) + (d.correct ? 0 : 1);
      const status = gplxProgressStatus(correctCount, wrongCount);
      await this.prisma.gplxStudyProgress.upsert({
        where: {
          userId_questionId: { userId: user.userId, questionId: d.questionId },
        },
        create: {
          userId: user.userId,
          questionId: d.questionId,
          status,
          correctCount,
          wrongCount,
          lastSeenAt: now,
        },
        update: { status, correctCount, wrongCount, lastSeenAt: now },
      });
    }

    const review = scored.details.map((d) => {
      const q = byId.get(d.questionId)!;
      return {
        questionId: d.questionId,
        stem: q.stem,
        explanation: q.explanation,
        isCritical: d.isCritical,
        correct: d.correct,
        selectedAnswerIds: d.selectedAnswerIds,
        correctAnswerIds: d.correctAnswerIds,
        answers: q.answers
          .sort((a, b) => a.position - b.position)
          .map((a) => ({ id: a.id, body: a.body, isCorrect: a.isCorrect })),
      };
    });

    await this.prisma.gplxMockAttempt.update({
      where: { id: attempt.id },
      data: {
        score: scored.score,
        correctCount: scored.correctCount,
        total: scored.total,
        passed: scored.passed,
        failedCritical: scored.failedCritical,
        submittedAt: now,
        detailJson: {
          rules,
          timedOut,
          mode: mockMode,
          details: scored.details,
          review,
        },
      },
    });

    const streak = await this.touchStreak(user);

    await this.prisma.analyticsEvent.create({
      data: {
        appId: user.appId,
        userId: user.userId,
        name: "gplx_mock_submitted",
        propsJson: {
          attemptId: attempt.id,
          licenseClass: attempt.licenseClass,
          mode: mockMode,
          passed: scored.passed,
          failedCritical: scored.failedCritical,
          correctCount: scored.correctCount,
          timedOut,
        },
      },
    });

    return {
      attemptId: attempt.id,
      licenseClass: attempt.licenseClass,
      mode: mockMode,
      score: scored.score,
      correctCount: scored.correctCount,
      total: scored.total,
      passed: scored.passed,
      failedCritical: scored.failedCritical,
      timedOut,
      passCorrectCount: rules.passCorrectCount,
      review,
      streak,
    };
  }
}

@Controller("gplx")
@UseGuards(AuthGuard)
export class GplxController {
  constructor(@Inject(GplxService) private readonly gplx: GplxService) {}

  @Get("license-classes")
  licenseClasses() {
    return this.gplx.listLicenseClasses();
  }

  @Get("tips")
  tips() {
    return this.gplx.tips();
  }

  @Get("signs")
  signs(@Query("group") group?: string, @Query("q") q?: string) {
    return this.gplx.signs(group, q);
  }

  @Get("plan")
  plan(@Query("licenseClass") licenseClass?: string) {
    return this.gplx.plan(licenseClass || "B");
  }

  @Get("overview")
  overview(
    @CurrentUser() user: RequestUser,
    @Query("licenseClass") licenseClass?: string,
  ) {
    return this.gplx.overview(user, licenseClass || "B");
  }

  @Get("search")
  search(
    @CurrentUser() user: RequestUser,
    @Query("q") q: string,
    @Query("licenseClass") licenseClass?: string,
  ) {
    return this.gplx.search(user, q ?? "", licenseClass || "B");
  }

  @Get("bookmarks")
  bookmarks(
    @CurrentUser() user: RequestUser,
    @Query("licenseClass") licenseClass?: string,
  ) {
    return this.gplx.listBookmarks(user, licenseClass || "B");
  }

  @Post("bookmarks")
  addBookmark(@CurrentUser() user: RequestUser, @Body() dto: BookmarkDto) {
    return this.gplx.addBookmark(user, dto);
  }

  @Delete("bookmarks/:questionId")
  removeBookmark(
    @CurrentUser() user: RequestUser,
    @Param("questionId") questionId: string,
  ) {
    return this.gplx.removeBookmark(user, questionId);
  }

  @Get("fixed-sets")
  fixedSets(
    @CurrentUser() user: RequestUser,
    @Query("licenseClass") licenseClass?: string,
  ) {
    return this.gplx.listFixedSets(user, licenseClass || "B");
  }

  @Get("flashcards")
  flashcards(
    @CurrentUser() user: RequestUser,
    @Query("licenseClass") licenseClass?: string,
    @Query("kind") kind?: "signs" | "critical" | "wrong",
  ) {
    return this.gplx.flashcards(user, licenseClass || "B", kind);
  }

  @Get("hardest")
  hardest(
    @CurrentUser() user: RequestUser,
    @Query("licenseClass") licenseClass?: string,
  ) {
    return this.gplx.hardest(user, licenseClass || "B");
  }

  @Get("weak-topics")
  weakTopics(
    @CurrentUser() user: RequestUser,
    @Query("licenseClass") licenseClass?: string,
  ) {
    return this.gplx.weakTopics(user, licenseClass || "B");
  }

  @Get("topics")
  topics(@CurrentUser() user: RequestUser) {
    return this.gplx.listTopics(user);
  }

  @Get("topics/:topicId/questions")
  topicQuestions(
    @CurrentUser() user: RequestUser,
    @Param("topicId") topicId: string,
    @Query("licenseClass") licenseClass?: string,
  ) {
    return this.gplx.topicQuestions(user, topicId, licenseClass || "B");
  }

  @Get("critical")
  critical(
    @CurrentUser() user: RequestUser,
    @Query("licenseClass") licenseClass?: string,
  ) {
    return this.gplx.criticalQuestions(user, licenseClass || "B");
  }

  @Get("wrong")
  wrong(
    @CurrentUser() user: RequestUser,
    @Query("licenseClass") licenseClass?: string,
  ) {
    return this.gplx.wrongQuestions(user, licenseClass || "B");
  }

  @Post("practice/answer")
  practice(@CurrentUser() user: RequestUser, @Body() dto: PracticeAnswerDto) {
    return this.gplx.submitPractice(user, dto);
  }

  @Post("mock/start")
  startMock(@CurrentUser() user: RequestUser, @Body() dto: StartMockDto) {
    return this.gplx.startMock(
      user,
      dto.licenseClass,
      dto.mode ?? "random",
      dto.fixedSetId,
    );
  }

  @Get("mock/:attemptId")
  getAttempt(@CurrentUser() user: RequestUser, @Param("attemptId") attemptId: string) {
    return this.gplx.getAttempt(user, attemptId);
  }

  @Post("mock/:attemptId/submit")
  submitMock(
    @CurrentUser() user: RequestUser,
    @Param("attemptId") attemptId: string,
    @Body() dto: SubmitMockDto,
  ) {
    return this.gplx.submitMock(user, attemptId, dto);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [GplxController],
  providers: [GplxService],
  exports: [GplxService],
})
export class GplxModule {}
