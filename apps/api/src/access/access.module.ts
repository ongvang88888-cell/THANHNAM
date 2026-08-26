import { Body, Controller, Injectable, Module, Post, UseGuards, Inject } from "@nestjs/common";
import { IsString } from "class-validator";
import {
  evaluateAccess,
  type AccessDecision,
  type AccessPolicyInput,
  type EntitlementInput,
} from "@edu/monetization-core";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

class EvaluateLessonDto {
  @IsString()
  lessonId!: string;
}

@Injectable()
export class AccessService {
  constructor(
  @Inject(PrismaService) private readonly prisma: PrismaService,
) {}

  async evaluateLesson(user: RequestUser | null, lessonId: string): Promise<AccessDecision> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        policies: true,
        section: { include: { course: true } },
      },
    });
    if (!lesson) throw new AppError(ErrorCodes.NOT_FOUND, "Lesson not found", 404);

    const course = lesson.section.course;
    const productId = course.productId;

    const policies: AccessPolicyInput[] = lesson.policies.map((p) => ({
      policyType: p.policyType as AccessPolicyInput["policyType"],
      priority: p.priority,
      params: (p.paramsJson ?? {}) as Record<string, unknown>,
    }));

    if (lesson.isPreview && !policies.some((p) => p.policyType === "FREE" || p.policyType === "PREVIEW")) {
      policies.push({ policyType: "PREVIEW", priority: 5, params: {} });
    }

    // P4-B: lesson-level prerequisite always; drip only after entitlement (keep purchase CTA)
    if (lesson.prerequisiteLessonId) {
      policies.push({
        policyType: "PREREQUISITE_REQUIRED",
        priority: 15,
        params: { lessonIds: [lesson.prerequisiteLessonId] },
      });
    }

    let entitlements: EntitlementInput[] = [];
    let completedLessonIds: string[] = [];
    if (user) {
      const rows = await this.prisma.entitlement.findMany({
        where: {
          userId: user.userId,
          status: "ACTIVE",
          OR: [
            { resourceType: "lesson", resourceId: lessonId },
            { resourceType: "product", resourceId: productId },
            { resourceType: "course", resourceId: course.id },
            { resourceType: "bundle" },
          ],
        },
      });
      entitlements = rows.map((e) => ({
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        source: e.source,
        status: e.status,
        expiresAt: e.expiresAt,
      }));

      const productEnt = rows.find(
        (e) =>
          (e.resourceType === "product" && e.resourceId === productId) ||
          (e.resourceType === "course" && e.resourceId === course.id),
      );
      if (productEnt) {
        if (lesson.dripUnlockAt) {
          policies.push({
            policyType: "TIME_LOCKED",
            priority: 12,
            params: { unlockAt: lesson.dripUnlockAt.toISOString() },
          });
        }
        if (lesson.dripDaysAfterPurchase != null && lesson.dripDaysAfterPurchase > 0) {
          const unlockAt = new Date(
            productEnt.grantedAt.getTime() + lesson.dripDaysAfterPurchase * 24 * 3600_000,
          );
          policies.push({
            policyType: "TIME_LOCKED",
            priority: 12,
            params: { unlockAt: unlockAt.toISOString() },
          });
        }
      }

      const completed = await this.prisma.lessonProgress.findMany({
        where: { userId: user.userId, status: "COMPLETED" },
        select: { lessonId: true },
      });
      completedLessonIds = completed.map((c) => c.lessonId);
    }

    const decision = evaluateAccess({
      now: new Date(),
      isAuthenticated: Boolean(user),
      isStaffBypass: user
        ? hasAnyRole(user, ["admin", "super_admin"]) ||
          (hasAnyRole(user, ["teacher"]) && course.creatorUserId === user.userId)
        : false,
      policies,
      entitlements,
      completedLessonIds,
      resourceType: "lesson",
      resourceId: lessonId,
      parentResourceIds: [
        { resourceType: "product", resourceId: productId },
        { resourceType: "course", resourceId: course.id },
      ],
    });

    return decision;
  }
}

@Controller("access")
export class AccessController {
  constructor(
  @Inject(AccessService) private readonly access: AccessService,
) {}

  @Post("lessons/evaluate")
  @UseGuards(AuthGuard)
  evaluate(@CurrentUser() user: RequestUser, @Body() dto: EvaluateLessonDto) {
    return this.access.evaluateLesson(user, dto.lessonId);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [AccessController],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
