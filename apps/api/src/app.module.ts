import { Module } from "@nestjs/common";
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
import { NotificationsModule } from "./notifications/notifications.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { LearningModule } from "./learning/learning.module";
import { HealthController } from "./health.controller";
import { CommonModule } from "./common/common.module";

@Module({
  imports: [
    CommonModule,
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
    NotificationsModule,
    AnalyticsModule,
    ReviewsModule,
    SubscriptionsModule,
    LearningModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
