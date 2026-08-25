import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { IsArray, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { scoreQuizAttempt, passedQuiz, type QuizQuestionKey } from "@edu/education-core";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";
import { AccessService } from "../access/access.module";
import { AccessModule } from "../access/access.module";

class AnswerDto {
  @IsString()
  questionId!: string;

  @IsArray()
  @IsString({ each: true })
  selectedAnswerIds!: string[];
}

class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}

@Injectable()
export class QuizService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AccessService) private readonly access: AccessService,
  ) {}

  async getQuiz(user: RequestUser, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: { include: { product: true } },
        questions: { include: { answers: true }, orderBy: { position: "asc" } },
      },
    });
    if (!quiz) throw new AppError(ErrorCodes.NOT_FOUND, "Quiz not found", 404);

    // Require course product access when product linked
    if (quiz.course.productId) {
      const ent = await this.prisma.entitlement.findFirst({
        where: {
          userId: user.userId,
          status: "ACTIVE",
          resourceType: "product",
          resourceId: quiz.course.productId,
        },
      });
      if (!ent && !user.roles.includes("teacher") && !user.roles.includes("admin")) {
        throw new AppError(ErrorCodes.NEEDS_PURCHASE, "Purchase required", 403, {
          productIds: [quiz.course.productId],
        });
      }
    }

    return {
      id: quiz.id,
      title: quiz.title,
      courseId: quiz.courseId,
      config: quiz.configJson,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        type: q.type,
        stem: q.stem,
        answers: q.answers
          .sort((a, b) => a.position - b.position)
          .map((a) => ({ id: a.id, body: a.body })),
      })),
    };
  }

  async listForCourse(courseId: string) {
    return this.prisma.quiz.findMany({
      where: { courseId },
      select: { id: true, title: true, configJson: true },
    });
  }

  async submit(user: RequestUser, quizId: string, dto: SubmitQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: { include: { answers: true }, orderBy: { position: "asc" } },
        course: true,
      },
    });
    if (!quiz) throw new AppError(ErrorCodes.NOT_FOUND, "Quiz not found", 404);

    const config = (quiz.configJson ?? {}) as { passScore?: number; maxAttempts?: number };
    const maxAttempts = config.maxAttempts ?? 5;
    const attemptCount = await this.prisma.quizAttempt.count({
      where: { quizId, userId: user.userId, submittedAt: { not: null } },
    });
    if (attemptCount >= maxAttempts) {
      throw new AppError(ErrorCodes.VALIDATION, "Max quiz attempts reached", 400);
    }

    const keys: QuizQuestionKey[] = quiz.questions.map((q) => ({
      id: q.id,
      type: (q.type as QuizQuestionKey["type"]) || "mcq",
      correctAnswerIds: q.answers.filter((a) => a.isCorrect).map((a) => a.id),
    }));

    const scored = scoreQuizAttempt(keys, dto.answers);
    const passScore = config.passScore ?? 70;
    const passed = passedQuiz(scored.score, passScore);

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId,
        userId: user.userId,
        score: scored.score,
        startedAt: new Date(),
        submittedAt: new Date(),
        detailJson: {
          correctCount: scored.correctCount,
          total: scored.total,
          passed,
          passScore,
          details: scored.details,
        },
      },
    });

    await this.prisma.analyticsEvent.create({
      data: {
        appId: user.appId,
        userId: user.userId,
        name: "quiz_submitted",
        propsJson: { quizId, score: scored.score, passed },
      },
    });

    if (passed) {
      // Ensure certificate eligibility path if course complete
      const lessons = await this.prisma.lesson.count({
        where: { section: { courseId: quiz.courseId } },
      });
      const completed = await this.prisma.lessonProgress.count({
        where: {
          userId: user.userId,
          status: "COMPLETED",
          lesson: { section: { courseId: quiz.courseId } },
        },
      });
      if (lessons > 0 && completed >= lessons) {
        const existing = await this.prisma.certificate.findFirst({
          where: { userId: user.userId, courseId: quiz.courseId },
        });
        if (!existing) {
          const { makeCertificatePublicId } = await import("@edu/education-core");
          await this.prisma.certificate.create({
            data: {
              publicId: makeCertificatePublicId(),
              userId: user.userId,
              courseId: quiz.courseId,
              metadataJson: { via: "quiz_pass", quizId },
            },
          });
        }
      }
    }

    return {
      attemptId: attempt.id,
      score: scored.score,
      passed,
      passScore,
      correctCount: scored.correctCount,
      total: scored.total,
      review: scored.details,
    };
  }

  async myAttempts(user: RequestUser, quizId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { quizId, userId: user.userId },
      orderBy: { startedAt: "desc" },
      take: 20,
    });
  }
}

@Controller("quizzes")
export class QuizController {
  constructor(@Inject(QuizService) private readonly quizzes: QuizService) {}

  @Get("by-course/:courseId")
  listByCourse(@Param("courseId") courseId: string) {
    return this.quizzes.listForCourse(courseId);
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.quizzes.getQuiz(user, id);
  }

  @Post(":id/attempts")
  @UseGuards(AuthGuard)
  submit(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.quizzes.submit(user, id, dto);
  }

  @Get(":id/attempts/me")
  @UseGuards(AuthGuard)
  attempts(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.quizzes.myAttempts(user, id);
  }
}

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
