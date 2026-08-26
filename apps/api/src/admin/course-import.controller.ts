import { Body, Controller, Get, Inject, Post, Res, UseGuards } from "@nestjs/common";
import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { Response } from "express";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { COURSE_TEMPLATE_CSV, LESSON_TEMPLATE_CSV } from "./csv";
import { CourseImportService } from "./course-import.service";

class CourseImportDto {
  @IsString()
  @MinLength(8)
  csv!: string;

  @IsOptional()
  @IsString()
  lessonsCsv?: string;

  @IsOptional()
  @IsIn(["fail", "skip"])
  onConflict?: "fail" | "skip";

  @IsOptional()
  @IsIn(["all", "valid_only"])
  importMode?: "all" | "valid_only";
}

@Controller("admin/courses/import")
@UseGuards(AuthGuard)
export class CourseImportController {
  constructor(
    @Inject(CourseImportService) private readonly imports: CourseImportService,
  ) {}

  @Get("template")
  courseTemplate(@Res() res: Response) {
    sendCsv(res, "mau-khoa-hoc.csv", COURSE_TEMPLATE_CSV);
  }

  @Get("lessons-template")
  lessonsTemplate(@Res() res: Response) {
    sendCsv(res, "mau-bai-hoc.csv", LESSON_TEMPLATE_CSV);
  }

  @Get("lookups")
  lookups(@CurrentUser() user: RequestUser) {
    return this.imports.lookups(user);
  }

  @Post("preview")
  preview(@CurrentUser() user: RequestUser, @Body() dto: CourseImportDto) {
    return this.imports.preview(user, dto);
  }

  @Post("commit")
  commit(@CurrentUser() user: RequestUser, @Body() dto: CourseImportDto) {
    return this.imports.commit(user, dto);
  }
}

function sendCsv(res: Response, filename: string, body: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(body);
}
