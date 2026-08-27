import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Query,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { IsArray, IsIn, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import {
  getGplxExamRules,
  pickMockQuestionIds,
  scoreGplxExam,
  gplxProgressStatus,
  GPLX_TIPS,
  GPLX_SIGNS,
  buildGplxSevenDayPlan,
  GPLX_PRO_PRODUCT_SLUG,
  GPLX_FREE_MOCKS_PER_DAY,
  type GplxQuestionKey,
} from "@edu/education-core";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

const LICENSE_CLASSES = ["A1", "A", "B1", "B", "C", "D", "E", "F"] as const;

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

  signs(group?: string) {
    const items = group
      ? GPLX_SIGNS.filter((s) => s.group === group)
      : GPLX_SIGNS;
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
        startedAt: true,
        submittedAt: true,
      },
    });

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

    return {
      correct,
      explanation: question.explanation,
      correctAnswerIds: correctIds,
      status,
    };
  }

  async startMock(user: RequestUser, licenseClass: string) {
    const rules = getGplxExamRules(licenseClass);
    const cls = rules.licenseClass;

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
    const applicable = pool.filter((q) => {
      const classes = asStringArray(q.licenseClassesJson);
      return classes.length === 0 || classes.includes(cls);
    });
    if (applicable.length < rules.questionCount) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        `Chưa đủ câu hỏi cho hạng ${cls} (cần ${rules.questionCount}, có ${applicable.length})`,
        400,
      );
    }

    const questionIds = pickMockQuestionIds(applicable, rules);
    const expiresAt = new Date(Date.now() + rules.durationSec * 1000);

    const attempt = await this.prisma.gplxMockAttempt.create({
      data: {
        appId: user.appId,
        userId: user.userId,
        licenseClass: cls,
        questionIdsJson: questionIds,
        total: questionIds.length,
        expiresAt,
        detailJson: { rules, isPro },
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
        propsJson: { attemptId: attempt.id, licenseClass: cls, isPro },
      },
    });

    return {
      attemptId: attempt.id,
      licenseClass: cls,
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

    if (ordered.length !== rules.questionCount) {
      throw new AppError(ErrorCodes.VALIDATION, "Attempt question set invalid", 400);
    }

    const now = new Date();
    const timedOut = now.getTime() > attempt.expiresAt.getTime();

    const keys: GplxQuestionKey[] = ordered.map((q) => ({
      id: q.id,
      isCritical: q.isCritical,
      correctAnswerIds: q.answers.filter((a) => a.isCorrect).map((a) => a.id),
    }));

    const scored = scoreGplxExam(keys, dto.answers, rules);

    // Update study progress for each answered question
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
          details: scored.details,
          review,
        },
      },
    });

    await this.prisma.analyticsEvent.create({
      data: {
        appId: user.appId,
        userId: user.userId,
        name: "gplx_mock_submitted",
        propsJson: {
          attemptId: attempt.id,
          licenseClass: attempt.licenseClass,
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
      score: scored.score,
      correctCount: scored.correctCount,
      total: scored.total,
      passed: scored.passed,
      failedCritical: scored.failedCritical,
      timedOut,
      passCorrectCount: rules.passCorrectCount,
      review,
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
  signs(@Query("group") group?: string) {
    return this.gplx.signs(group);
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
    return this.gplx.startMock(user, dto.licenseClass);
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
