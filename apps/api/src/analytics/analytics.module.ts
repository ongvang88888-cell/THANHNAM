import { Body, Controller, Injectable, Module, Post, UseGuards, Inject } from "@nestjs/common";
import { IsObject, IsOptional, IsString } from "class-validator";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

class TrackDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;
}

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async track(user: RequestUser | null, appId: string, dto: TrackDto) {
    await this.prisma.analyticsEvent.create({
      data: {
        appId,
        userId: user?.userId,
        name: dto.name,
        propsJson: (dto.props ?? {}) as object,
      },
    });
    return { ok: true };
  }
}

@Controller("analytics")
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analytics: AnalyticsService) {}

  @Post("events")
  @UseGuards(AuthGuard)
  track(@CurrentUser() user: RequestUser, @Body() dto: TrackDto) {
    return this.analytics.track(user, user.appId, dto);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
