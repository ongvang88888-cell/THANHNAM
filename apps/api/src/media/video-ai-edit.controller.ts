import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsObject, IsOptional, IsString } from "class-validator";
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

@Controller()
@UseGuards(AuthGuard)
export class VideoAiEditController {
  constructor(@Inject(VideoAiEditService) private readonly edits: VideoAiEditService) {}

  @Get("videos/:id/ai/catalog")
  catalog(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.edits.catalog(user, id);
  }

  @Get("videos/:id/ai/edits")
  list(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.edits.listEdits(user, id);
  }

  @Post("videos/:id/ai/edits")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  start(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: StartAiEditDto) {
    return this.edits.startEdit(user, id, dto.tool, dto.options);
  }

  @Get("videos/:id/ai/edits/:editId")
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
