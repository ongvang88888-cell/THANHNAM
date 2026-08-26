import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { IsNumber, IsObject, IsOptional, IsString, Min } from "class-validator";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { VideoAiEditService } from "./video-ai-edit.service";

class StartAiEditDto {
  @IsString()
  tool!: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

class ApplyAiEditDto {
  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;
}

class AutoPublishDto {
  @IsString()
  lessonId!: string;

  @IsOptional()
  @IsString()
  courseId?: string;
}

class AssignVideoDto {
  @IsString()
  lessonId!: string;

  @IsOptional()
  @IsString()
  courseId?: string;
}

class QuickAdjustDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  startMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  endMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  thumbSeekSeconds?: number;
}

@Controller()
@UseGuards(AuthGuard)
export class VideoAiEditController {
  constructor(@Inject(VideoAiEditService) private readonly edits: VideoAiEditService) {}

  @Get("videos/library")
  @SkipThrottle()
  library(@CurrentUser() user: RequestUser) {
    return this.edits.listLibrary(user);
  }

  @Get("videos/:id/ai/catalog")
  @SkipThrottle()
  catalog(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.edits.catalog(user, id);
  }

  @Get("videos/:id/ai/edits")
  @SkipThrottle()
  list(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.edits.listEdits(user, id);
  }

  @Post("videos/:id/ai/edits")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  start(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: StartAiEditDto) {
    return this.edits.startEdit(user, id, dto.tool, dto.options);
  }

  @Post("videos/:id/ai/auto-publish")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  autoPublish(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: AutoPublishDto) {
    return this.edits.startAutoPublish(user, id, dto);
  }

  @Post("videos/:id/ai/prepare")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  prepare(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.edits.startPrepare(user, id);
  }

  @Post("videos/:id/quick-adjust")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  quickAdjust(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: QuickAdjustDto) {
    return this.edits.quickAdjust(user, id, dto);
  }

  @Post("videos/:id/assign")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  assign(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: AssignVideoDto) {
    return this.edits.assignVideo(user, id, dto);
  }

  @Get("videos/:id/ai/edits/:editId")
  @SkipThrottle()
  get(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("editId") editId: string) {
    return this.edits.getEdit(user, id, editId);
  }

  @Post("videos/:id/ai/edits/:editId/apply")
  apply(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Param("editId") editId: string,
    @Body() dto: ApplyAiEditDto,
  ) {
    return this.edits.applyEdit(user, id, editId, dto);
  }
}
