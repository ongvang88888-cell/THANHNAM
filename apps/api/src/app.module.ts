import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CurriculumModule } from "./curriculum/curriculum.module";
import { AccessModule } from "./access/access.module";
import { CommerceModule } from "./commerce/commerce.module";
import { RewardsModule } from "./rewards/rewards.module";
import { ProgressModule } from "./progress/progress.module";
import { ConfigModule } from "./config/config.module";
import { AdminModule } from "./admin/admin.module";
import { TeacherModule } from "./teacher/teacher.module";
import { MediaModule } from "./media/media.module";
import { QuizModule } from "./quiz/quiz.module";
import { GplxModule } from "./gplx/gplx.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { LearningModule } from "./learning/learning.module";
import { AffiliateModule } from "./affiliate/affiliate.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { JobsModule } from "./jobs/jobs.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { HealthController } from "./health.controller";
import { CommonModule } from "./common/common.module";

@Module({
  imports: [
    CommonModule,
    ThrottlerModule.forRoot({
      throttlers: [
        { name: "default", ttl: 60_000, limit: 120 },
        { name: "auth", ttl: 60_000, limit: 20 },
      ],
    }),
    AuthModule,
    CatalogModule,
    CurriculumModule,
    AccessModule,
    CommerceModule,
    RewardsModule,
    ProgressModule,
    ConfigModule,
    AdminModule,
    TeacherModule,
    MediaModule,
    QuizModule,
    GplxModule,
    NotificationsModule,
    AnalyticsModule,
    ReviewsModule,
    SubscriptionsModule,
    LearningModule,
    AffiliateModule,
    CampaignsModule,
    JobsModule,
    InvoicesModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
