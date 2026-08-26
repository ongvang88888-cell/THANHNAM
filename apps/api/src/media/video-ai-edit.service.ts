import { Inject, Injectable, Logger } from "@nestjs/common";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  buildObjectKey,
  createStorageFromEnv,
  type IStorageProvider,
} from "@edu/media-core";
import {
  AI_EDIT_TOOLS,
  OWNERSHIP_DISCLAIMER,
  assertOwnedAbcReady,
  buildConcatDemuxerList,
  captionStillArgs,
  clampSceneCount,
  courseEnhanceArgs,
  createAiPortFromEnv,
  cuesFromWhisperSegments,
  enhanceAndSpeechArgs,
  envAiCapabilities,
  extractLessonAudioArgs,
  extractSpeechAudioArgs,
  firstExistingFont,
  getAiEditTool,
  groupScenesForEdition,
  heuristicCuesFromTitle,
  illustratedConcatArgs,
  isAiEditToolId,
  parseAiEditOptions,
  pictureEnhanceArgs,
  sceneImagePrompt,
  silenceTrimArgs,
  speechFocusArgs,
  studioSoundArgs,
  thumbnailArgs,
  timeSliceCues,
  titlePosterArgs,
  toVtt,
  toolAvailability,
  toonTalkingHeadArgs,
  type AiCapabilities,
  type AiEditOptions,
  type AiEditToolId,
  type AiPort,
} from "@edu/ai-core";
import { AppError, ErrorCodes, assertNever, hasAnyRole } from "@edu/shared-core";
import type { Prisma, Video, VideoAiEdit } from "@edu/database";
import { PrismaService } from "../common/prisma.service";
import type { RequestUser } from "../auth/auth.guard";

const execFileAsync = promisify(execFile);
const MAX_SOURCE_BYTES = 400 * 1024 * 1024;
const MAX_EDITS_PER_VIDEO = 20;
const MAX_ACTIVE_PER_USER = 3;

export interface VideoAiEditOutput {
  kind: "video" | "image" | "vtt" | "copy";
  storageKey?: string;
  contentType?: string;
  sizeBytes?: number;
  durationMs?: number;
  text?: string;
  title?: string;
  description?: string;
  tags?: string[];
  newVideoId?: string;
  editionStorageKey?: string;
  editionContentType?: string;
  editionSizeBytes?: number;
  editionDurationMs?: number;
  editionVideoId?: string;
  appliedAt?: string;
  appliedToLessonId?: string;
  appliedToProductId?: string;
  providerNote?: string;
}

@Injectable()
export class VideoAiEditService {
  private readonly log = new Logger(VideoAiEditService.name);
  private readonly storage: IStorageProvider = createStorageFromEnv();
  private ffmpegKnown: boolean | null = null;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private assertTeacher(user: RequestUser) {
    if (!hasAnyRole(user as never, ["teacher", "admin", "super_admin"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Chỉ giảng viên hoặc admin được chỉnh video", 403);
    }
  }

  private isAdmin(user: RequestUser) {
    return hasAnyRole(user as never, ["admin", "super_admin"]);
  }

  private async hasFfmpeg(): Promise<boolean> {
    if (this.ffmpegKnown !== null) return this.ffmpegKnown;
    try {
      await execFileAsync("ffmpeg", ["-version"], { timeout: 5000 });
      this.ffmpegKnown = true;
    } catch {
      this.ffmpegKnown = false;
    }
    return this.ffmpegKnown;
  }

  private async capabilities(): Promise<AiCapabilities> {
    return envAiCapabilities(await this.hasFfmpeg());
  }

  private async ownedVideo(user: RequestUser, videoId: string): Promise<Video> {
    this.assertTeacher(user);
    const video = await this.prisma.video.findFirst({
      where: {
        id: String(videoId),
        appId: user.appId,
        ...(this.isAdmin(user) ? {} : { ownerUserId: user.userId }),
      },
    });
    if (!video) throw new AppError(ErrorCodes.NOT_FOUND, "Video không tìm thấy", 404);
    return video;
  }

  private async sourceMeta(video: Video): Promise<{ hasSource: boolean; sizeBytes: number }> {
    if (!video.storageKey) return { hasSource: false, sizeBytes: 0 };
    const obj = await this.storage.getObject(video.storageKey);
    if (!obj || obj.bytes.length === 0) return { hasSource: false, sizeBytes: 0 };
    return { hasSource: true, sizeBytes: obj.bytes.length };
  }

  async catalog(user: RequestUser, videoId: string) {
    const video = await this.ownedVideo(user, videoId);
    const caps = await this.capabilities();
    const source = await this.sourceMeta(video);
    const thumbnailUrl = video.thumbnailKey
      ? (await this.storage.createDownloadUrl({ key: video.thumbnailKey, ttlSeconds: 600 })).url
      : null;
    return {
      enabled: caps.enabled,
      ownershipDisclaimer: OWNERSHIP_DISCLAIMER,
      capabilities: caps,
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
        durationMs: video.durationMs,
        thumbnailUrl,
        hasSource: source.hasSource,
      },
      tools: AI_EDIT_TOOLS.map((tool) => {
        const avail = toolAvailability(tool, caps, source.hasSource);
        return {
          id: tool.id,
          group: tool.group,
          label: tool.label,
          description: tool.description,
          market: tool.market,
          outputKind: tool.outputKind,
          available: avail.available,
          mode: avail.mode,
          note: avail.note,
        };
      }),
    };
  }

  async listEdits(user: RequestUser, videoId: string) {
    const video = await this.ownedVideo(user, videoId);
    const rows = await this.prisma.videoAiEdit.findMany({
      where: { videoId: video.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    return { edits: await Promise.all(rows.map((row) => this.presentEdit(row))) };
  }

  async getEdit(user: RequestUser, videoId: string, editId: string) {
    const video = await this.ownedVideo(user, videoId);
    const edit = await this.prisma.videoAiEdit.findFirst({
      where: { id: String(editId), videoId: video.id },
    });
    if (!edit) throw new AppError(ErrorCodes.NOT_FOUND, "Lệnh chỉnh sửa không tìm thấy", 404);
    return this.presentEdit(edit);
  }

  async startEdit(user: RequestUser, videoId: string, rawTool: string, rawOptions: unknown) {
    const video = await this.ownedVideo(user, videoId);
    if (video.status === "UPLOADING") {
      throw new AppError(ErrorCodes.VALIDATION, "Video chưa tải xong", 400);
    }
    if (!isAiEditToolId(rawTool)) {
      throw new AppError(ErrorCodes.VALIDATION, "Công cụ AI không hợp lệ", 400);
    }
    let options: AiEditOptions;
    try {
      options = parseAiEditOptions(rawOptions);
      assertOwnedAbcReady(rawTool, options);
    } catch (e) {
      throw new AppError(ErrorCodes.VALIDATION, e instanceof Error ? e.message : "Tùy chọn không hợp lệ", 400);
    }
    const tool = getAiEditTool(rawTool);
    if (!tool) throw new AppError(ErrorCodes.VALIDATION, "Công cụ AI không hợp lệ", 400);
    const caps = await this.capabilities();
    const source = await this.sourceMeta(video);
    const avail = toolAvailability(tool, caps, source.hasSource);
    if (!avail.available) {
      throw new AppError(ErrorCodes.VALIDATION, avail.note || "Công cụ chưa sẵn sàng", 400);
    }
    const existing = await this.prisma.videoAiEdit.count({ where: { videoId: video.id } });
    if (existing >= MAX_EDITS_PER_VIDEO) {
      throw new AppError(ErrorCodes.VALIDATION, `Mỗi video tối đa ${MAX_EDITS_PER_VIDEO} lệnh chỉnh sửa AI`, 400);
    }
    const active = await this.prisma.videoAiEdit.count({
      where: {
        video: { ownerUserId: user.userId, appId: user.appId },
        status: { in: ["QUEUED", "PROCESSING"] },
      },
    });
    if (active >= MAX_ACTIVE_PER_USER) {
      throw new AppError(ErrorCodes.VALIDATION, "Đang có quá nhiều lệnh AI chạy. Đợi lệnh trước xong.", 400);
    }
    const ai = createAiPortFromEnv();
    const edit = await this.prisma.videoAiEdit.create({
      data: {
        videoId: video.id,
        tool: tool.id,
        status: "QUEUED",
        provider: this.providerFor(tool.id, ai, caps),
        inputJson: options as Prisma.InputJsonValue,
      },
    });
    void this.processEdit(edit.id).catch((err) => {
      this.log.error(`AI edit ${edit.id} crashed: ${err instanceof Error ? err.message : "unknown"}`);
    });
    return this.presentEdit(edit);
  }

  private providerFor(tool: AiEditToolId, ai: AiPort, caps: AiCapabilities): string {
    if (tool === "captions") return caps.speech ? ai.id : "heuristic";
    if (tool === "ai_cover") return caps.imageGen ? ai.id : "poster";
    if (tool === "lesson_copy") return caps.llm ? ai.id : "heuristic";
    if (tool === "illustrated_edition" || tool === "owned_abc") {
      if (caps.imageGen && caps.speech) return ai.id;
      if (caps.speech) return `${ai.id}+poster`;
      return "ffmpeg+poster";
    }
    return "ffmpeg";
  }

  async applyEdit(
    user: RequestUser,
    videoId: string,
    editId: string,
    body: { lessonId?: string; courseId?: string },
  ) {
    const video = await this.ownedVideo(user, videoId);
    const edit = await this.prisma.videoAiEdit.findFirst({
      where: { id: String(editId), videoId: video.id },
    });
    if (!edit) throw new AppError(ErrorCodes.NOT_FOUND, "Lệnh chỉnh sửa không tìm thấy", 404);
    if (edit.status !== "READY") {
      throw new AppError(ErrorCodes.VALIDATION, "Lệnh chỉnh sửa chưa sẵn sàng để áp dụng", 400);
    }
    const output = asOutput(edit.outputJson);
    if (!output) throw new AppError(ErrorCodes.VALIDATION, "Thiếu kết quả chỉnh sửa", 400);
    const applied: string[] = [];
    const tool = getAiEditTool(edit.tool);
    if (!tool) throw new AppError(ErrorCodes.VALIDATION, "Công cụ không hợp lệ", 400);

    if (output.kind === "video" && output.storageKey) {
      const newVideoId = output.newVideoId || (await this.materializeEditedVideo(video, edit, output, tool.label));
      output.newVideoId = newVideoId;
      applied.push("video");
      if (output.editionStorageKey) {
        output.editionVideoId =
          output.editionVideoId ||
          (await this.materializeCompanionVideo(video, output, "Bản hoạt hình mới (B)"));
        applied.push("edition");
      }
      if (body.lessonId) {
        await this.swapLessonVideo(user, body.lessonId, newVideoId);
        output.appliedToLessonId = body.lessonId;
        applied.push("lesson");
      }
    }

    if (output.kind === "image" && output.storageKey) {
      await this.prisma.video.update({
        where: { id: video.id },
        data: { thumbnailKey: output.storageKey },
      });
      applied.push("thumbnail");
      if (body.courseId) {
        await this.applyCourseCover(user, body.courseId, output.storageKey);
        output.appliedToProductId = body.courseId;
        applied.push("course_cover");
      }
    }

    if (output.kind === "vtt" && output.storageKey) {
      await this.prisma.videoAsset.deleteMany({
        where: { videoId: video.id, format: "vtt" },
      });
      await this.prisma.videoAsset.create({
        data: {
          videoId: video.id,
          quality: "captions",
          format: "vtt",
          storageKey: output.storageKey,
          sizeBytes: BigInt(output.sizeBytes ?? 0),
        },
      });
      applied.push("captions");
    }

    if (output.kind === "copy") {
      applied.push("copy");
    }

    output.appliedAt = new Date().toISOString();
    await this.prisma.videoAiEdit.update({
      where: { id: edit.id },
      data: { outputJson: output as unknown as Prisma.InputJsonValue },
    });
    const preview = await this.presentEdit({ ...edit, outputJson: output as unknown as Prisma.JsonValue });
    return {
      ...preview,
      newVideoId: output.newVideoId,
      editionVideoId: output.editionVideoId,
      title: output.title,
      description: output.description,
      tags: output.tags,
      applied,
    };
  }

  private async materializeEditedVideo(
    source: Video,
    edit: VideoAiEdit,
    output: VideoAiEditOutput,
    toolLabel: string,
  ): Promise<string> {
    const created = await this.prisma.video.create({
      data: {
        appId: source.appId,
        ownerUserId: source.ownerUserId,
        title: `${source.title} (${toolLabel})`.slice(0, 180),
        status: "READY",
        durationMs: output.durationMs ?? source.durationMs,
        storageKey: output.storageKey,
        thumbnailKey: source.thumbnailKey,
      },
    });
    await this.prisma.videoAsset.create({
      data: {
        videoId: created.id,
        quality: "720p",
        format: "mp4",
        storageKey: output.storageKey!,
        sizeBytes: BigInt(output.sizeBytes ?? 0),
      },
    });
    return created.id;
  }

  private async materializeCompanionVideo(
    source: Video,
    output: VideoAiEditOutput,
    titleSuffix: string,
  ): Promise<string> {
    if (!output.editionStorageKey) {
      throw new AppError(ErrorCodes.VALIDATION, "Thiếu bản minh họa B", 400);
    }
    const created = await this.prisma.video.create({
      data: {
        appId: source.appId,
        ownerUserId: source.ownerUserId,
        title: `${source.title} (${titleSuffix})`.slice(0, 180),
        status: "READY",
        durationMs: output.editionDurationMs ?? source.durationMs,
        storageKey: output.editionStorageKey,
        thumbnailKey: source.thumbnailKey,
      },
    });
    await this.prisma.videoAsset.create({
      data: {
        videoId: created.id,
        quality: "720p",
        format: "mp4",
        storageKey: output.editionStorageKey,
        sizeBytes: BigInt(output.editionSizeBytes ?? 0),
      },
    });
    return created.id;
  }

  private async swapLessonVideo(user: RequestUser, lessonId: string, videoId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: String(lessonId) },
      include: { section: { include: { course: true } }, contents: true },
    });
    if (!lesson || lesson.section.course.appId !== user.appId) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Bài học không tìm thấy", 404);
    }
    if (!this.isAdmin(user) && lesson.section.course.creatorUserId !== user.userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Bạn không sở hữu khóa học này", 403);
    }
    const existing = lesson.contents.find((row) => row.contentType === "VIDEO");
    if (existing) {
      await this.prisma.lessonContent.update({
        where: { id: existing.id },
        data: { refId: videoId },
      });
      return;
    }
    await this.prisma.lessonContent.create({
      data: {
        lessonId: lesson.id,
        contentType: "VIDEO",
        refId: videoId,
        position: lesson.contents.length + 1,
      },
    });
  }

  private async applyCourseCover(user: RequestUser, courseId: string, storageKey: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: String(courseId), appId: user.appId },
    });
    if (!course) throw new AppError(ErrorCodes.NOT_FOUND, "Khóa học không tìm thấy", 404);
    if (!this.isAdmin(user) && course.creatorUserId !== user.userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Bạn không sở hữu khóa học này", 403);
    }
    const signed = await this.storage.createDownloadUrl({
      key: storageKey,
      ttlSeconds: 60 * 60 * 24 * 30,
    });
    await this.prisma.product.update({
      where: { id: course.productId },
      data: { thumbnailUrl: signed.url },
    });
  }

  async processEdit(editId: string): Promise<void> {
    const claimed = await this.prisma.videoAiEdit.updateMany({
      where: { id: editId, status: "QUEUED" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count !== 1) return;
    const edit = await this.prisma.videoAiEdit.findUnique({
      where: { id: editId },
      include: { video: true },
    });
    if (!edit) return;
    try {
      if (!isAiEditToolId(edit.tool)) {
        throw new Error("Công cụ không hợp lệ");
      }
      const options = parseAiEditOptions(edit.inputJson);
      const output = await this.runTool(edit.tool, edit.video, edit.id, options);
      await this.prisma.videoAiEdit.update({
        where: { id: edit.id },
        data: {
          status: "READY",
          outputJson: output as unknown as Prisma.InputJsonValue,
          error: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 400) : "Chỉnh sửa AI thất bại";
      this.log.warn(`AI edit ${edit.id} failed: ${message}`);
      await this.prisma.videoAiEdit.update({
        where: { id: edit.id },
        data: { status: "FAILED", error: message },
      });
    }
  }

  private async runTool(
    tool: AiEditToolId,
    video: Video,
    editId: string,
    options: AiEditOptions,
  ): Promise<VideoAiEditOutput> {
    const ai = createAiPortFromEnv();
    switch (tool) {
      case "owned_abc":
        return this.runOwnedAbc(video, editId, options, ai);
      case "studio_sound":
        return this.runFfmpegVideo(video, editId, tool, studioSoundArgs, "video/mp4");
      case "speech_focus": {
        const output = await this.runFfmpegVideo(video, editId, tool, speechFocusArgs, "video/mp4");
        output.providerNote = `${OWNERSHIP_DISCLAIMER} Đã giữ hình gốc và lời giảng, thu hẹp dải nhạc nền.`;
        return output;
      }
      case "course_enhance": {
        const output = await this.runFfmpegVideo(video, editId, tool, courseEnhanceArgs, "video/mp4");
        output.providerNote = "Làm nét nhẹ, ưu tiên chữ slide không bị vỡ. Giữ nguyên tiếng.";
        return output;
      }
      case "picture_enhance":
        return this.runFfmpegVideo(video, editId, tool, pictureEnhanceArgs, "video/mp4");
      case "toon_talking_head": {
        const region = options.region ?? "pip_br";
        const style = options.style ?? "anime";
        const output = await this.runFfmpegVideo(
          video,
          editId,
          tool,
          (input, outputPath) => toonTalkingHeadArgs(input, outputPath, region, style),
          "video/mp4",
        );
        output.providerNote =
          region === "full"
            ? `${OWNERSHIP_DISCLAIMER} Đã stylize cả khung — chữ slide có thể khó đọc.`
            : `${OWNERSHIP_DISCLAIMER} Đã stylize vùng PIP/mặt, giữ slide và tiếng gốc.`;
        return output;
      }
      case "illustrated_edition":
        return this.runIllustratedEdition(video, editId, options, ai);
      case "silence_trim":
        return this.runFfmpegVideo(video, editId, tool, silenceTrimArgs, "video/mp4");
      case "auto_thumbnail":
        return this.runThumbnail(video, editId, options);
      case "ai_cover":
        return this.runCover(video, editId, options, ai);
      case "captions":
        return this.runCaptions(video, editId, ai);
      case "lesson_copy":
        return this.runCopy(video, ai);
      default:
        return assertNever(tool);
    }
  }

  private async loadSource(video: Video): Promise<{ bytes: Buffer; ext: string; contentType: string }> {
    if (!video.storageKey) throw new Error("Video chưa có file gốc");
    const obj = await this.storage.getObject(video.storageKey);
    if (!obj || obj.bytes.length === 0) throw new Error("Chưa có file video gốc. Hãy tải lại video.");
    if (obj.bytes.length > MAX_SOURCE_BYTES) {
      throw new Error("Video quá lớn để chỉnh trên máy chủ (tối đa 400MB)");
    }
    const ext = path.extname(video.storageKey) || ".mp4";
    return { bytes: obj.bytes, ext, contentType: obj.contentType || "video/mp4" };
  }

  private async runFfmpegVideo(
    video: Video,
    editId: string,
    tool: AiEditToolId,
    buildArgs: (input: string, output: string) => string[],
    contentType: string,
  ): Promise<VideoAiEditOutput> {
    const source = await this.loadSource(video);
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-"));
    try {
      const inputPath = path.join(dir, `in${source.ext}`);
      const outputPath = path.join(dir, "out.mp4");
      await writeFile(inputPath, source.bytes);
      await this.execFfmpeg(buildArgs(inputPath, outputPath));
      const out = await readFile(outputPath);
      const key = buildObjectKey({
        appId: video.appId,
        type: "video-ai",
        id: editId,
        filename: `${tool}.mp4`,
      });
      await this.storage.putObject(key, out, contentType);
      const durationMs = (await this.probeDurationMs(outputPath)) ?? video.durationMs ?? undefined;
      return {
        kind: "video",
        storageKey: key,
        contentType,
        sizeBytes: out.length,
        durationMs,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async runThumbnail(video: Video, editId: string, options: AiEditOptions): Promise<VideoAiEditOutput> {
    const source = await this.loadSource(video);
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-"));
    try {
      const inputPath = path.join(dir, `in${source.ext}`);
      const outputPath = path.join(dir, "thumb.jpg");
      await writeFile(inputPath, source.bytes);
      const durationMs = (await this.probeDurationMs(inputPath)) ?? video.durationMs ?? 0;
      const seek =
        options.seekSeconds ??
        (durationMs > 2000 ? Math.min(durationMs / 1000 / 2, 8) : 0.2);
      await this.execFfmpeg(thumbnailArgs(inputPath, outputPath, seek));
      const out = await readFile(outputPath);
      const key = buildObjectKey({
        appId: video.appId,
        type: "video-ai",
        id: editId,
        filename: "thumbnail.jpg",
      });
      await this.storage.putObject(key, out, "image/jpeg");
      return {
        kind: "image",
        storageKey: key,
        contentType: "image/jpeg",
        sizeBytes: out.length,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async runCover(
    video: Video,
    editId: string,
    options: AiEditOptions,
    ai: AiPort,
  ): Promise<VideoAiEditOutput> {
    let bytes: Buffer;
    let contentType: string;
    let providerNote: string | undefined;
    try {
      const cover = await ai.generateCover({ title: video.title, prompt: options.prompt });
      bytes = cover.bytes;
      contentType = cover.contentType;
      if (cover.provider === "null") providerNote = "Poster chữ — thêm OPENAI_API_KEY để vẽ ảnh AI.";
    } catch (err) {
      const font = firstExistingFont(existsSync);
      if (font && (await this.hasFfmpeg())) {
        const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-"));
        try {
          const outputPath = path.join(dir, "cover.jpg");
          await this.execFfmpeg(titlePosterArgs(outputPath, options.prompt || video.title, font));
          bytes = await readFile(outputPath);
          contentType = "image/jpeg";
          providerNote = "Tạo poster bằng ffmpeg vì ảnh AI lỗi.";
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      } else {
        throw err;
      }
    }
    const ext = contentType.includes("svg") ? "svg" : contentType.includes("jpeg") ? "jpg" : "png";
    const key = buildObjectKey({
      appId: video.appId,
      type: "video-ai",
      id: editId,
      filename: `cover.${ext}`,
    });
    await this.storage.putObject(key, bytes, contentType);
    return {
      kind: "image",
      storageKey: key,
      contentType,
      sizeBytes: bytes.length,
      providerNote,
    };
  }

  private async runCaptions(video: Video, editId: string, ai: AiPort): Promise<VideoAiEditOutput> {
    let speechText = "";
    let cues = heuristicCuesFromTitle(video.title, video.durationMs ?? undefined);
    let providerNote: string | undefined =
      "Phụ đề nháp từ tiêu đề — thêm OPENAI_API_KEY hoặc GROQ_API_KEY để nhận transcript thật.";
    try {
      const source = await this.loadSource(video);
      let audio = source.bytes;
      let filename = `speech${source.ext}`;
      let mime = source.contentType || "video/mp4";
      if (await this.hasFfmpeg()) {
        const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-"));
        try {
          const inputPath = path.join(dir, `in${source.ext}`);
          const outputPath = path.join(dir, "speech.mp3");
          await writeFile(inputPath, source.bytes);
          await this.execFfmpeg(extractSpeechAudioArgs(inputPath, outputPath));
          audio = await readFile(outputPath);
          filename = "speech.mp3";
          mime = "audio/mpeg";
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      }
      const speech = await ai.transcribe({ bytes: audio, filename, mime });
      if (speech.text.trim() || speech.segments.length > 0) {
        speechText = speech.text.trim();
        cues =
          speech.segments.length > 0
            ? cuesFromWhisperSegments(speech.segments)
            : [{ startMs: 0, endMs: video.durationMs ?? 8000, text: speechText }];
        providerNote = undefined;
      }
    } catch (err) {
      providerNote = `Không nhận lời nói (${err instanceof Error ? err.message : "lỗi"}). Đã tạo phụ đề nháp để bạn sửa.`;
    }
    const vtt = toVtt(cues);
    const key = buildObjectKey({
      appId: video.appId,
      type: "video-ai",
      id: editId,
      filename: "captions.vtt",
    });
    const bytes = Buffer.from(vtt, "utf8");
    await this.storage.putObject(key, bytes, "text/vtt");
    return {
      kind: "vtt",
      storageKey: key,
      contentType: "text/vtt",
      sizeBytes: bytes.length,
      text: speechText || cues.map((c) => c.text).join("\n"),
      providerNote,
    };
  }

  private async runCopy(video: Video, ai: AiPort): Promise<VideoAiEditOutput> {
    const caption = await this.prisma.videoAsset.findFirst({
      where: { videoId: video.id, format: "vtt" },
      orderBy: { id: "desc" },
    });
    let transcript: string | undefined;
    if (caption) {
      const obj = await this.storage.getObject(caption.storageKey);
      transcript = obj?.bytes.toString("utf8");
    }
    const copy = await ai.suggestLessonCopy({ title: video.title, transcript });
    return {
      kind: "copy",
      title: copy.title,
      description: copy.description,
      tags: copy.tags,
      text: copy.description,
      providerNote: copy.provider === "null" ? "Gợi ý từ tiêu đề — thêm khóa OpenAI/Gemini để viết từ transcript." : undefined,
    };
  }

  private async runOwnedAbc(
    video: Video,
    editId: string,
    options: AiEditOptions,
    ai: AiPort,
  ): Promise<VideoAiEditOutput> {
    const source = await this.loadSource(video);
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-abc-"));
    try {
      const inputPath = path.join(dir, `in${source.ext}`);
      await writeFile(inputPath, source.bytes);
      if (!(await this.probeHasAudio(inputPath))) {
        throw new Error("Video không có tiếng giảng. Gói A+B+C cần giữ lời gốc cho bản minh họa.");
      }
      const enhancedPath = path.join(dir, "enhance-speech.mp4");
      await this.execFfmpeg(enhanceAndSpeechArgs(inputPath, enhancedPath));
      const region = options.region ?? "pip_br";
      const style = options.style ?? "anime";
      const lessonPath = path.join(dir, "owned-abc-lesson.mp4");
      await this.execFfmpeg(toonTalkingHeadArgs(enhancedPath, lessonPath, region, style));
      const lessonBytes = await readFile(lessonPath);
      const lessonKey = buildObjectKey({
        appId: video.appId,
        type: "video-ai",
        id: editId,
        filename: "owned_abc.mp4",
      });
      await this.storage.putObject(lessonKey, lessonBytes, "video/mp4");

      const edition = await this.renderIllustratedFromInput(video, editId, options, ai, dir, inputPath, "owned_abc_edition.mp4");
      const pipNote =
        region === "full"
          ? "C stylize cả khung — chữ slide có thể khó đọc."
          : "C stylize PIP/mặt, giữ slide.";
      return {
        kind: "video",
        storageKey: lessonKey,
        contentType: "video/mp4",
        sizeBytes: lessonBytes.length,
        durationMs: (await this.probeDurationMs(lessonPath)) ?? video.durationMs ?? undefined,
        editionStorageKey: edition.storageKey,
        editionContentType: "video/mp4",
        editionSizeBytes: edition.sizeBytes,
        editionDurationMs: edition.durationMs,
        providerNote: `${OWNERSHIP_DISCLAIMER} A làm nét + giảm nhạc nền. ${pipNote} B là bản minh họa riêng trên 100% tiếng gốc. ${edition.note}`,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async runIllustratedEdition(
    video: Video,
    editId: string,
    options: AiEditOptions,
    ai: AiPort,
  ): Promise<VideoAiEditOutput> {
    const source = await this.loadSource(video);
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-"));
    try {
      const inputPath = path.join(dir, `in${source.ext}`);
      await writeFile(inputPath, source.bytes);
      if (!(await this.probeHasAudio(inputPath))) {
        throw new Error("Video không có tiếng giảng. Bản hoạt hình cần giữ 100% âm thanh gốc.");
      }
      const edition = await this.renderIllustratedFromInput(
        video,
        editId,
        options,
        ai,
        dir,
        inputPath,
        "illustrated_edition.mp4",
      );
      return {
        kind: "video",
        storageKey: edition.storageKey,
        contentType: "video/mp4",
        sizeBytes: edition.sizeBytes,
        durationMs: edition.durationMs,
        providerNote: `${OWNERSHIP_DISCLAIMER} ${edition.note}`,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async renderIllustratedFromInput(
    video: Video,
    editId: string,
    options: AiEditOptions,
    ai: AiPort,
    dir: string,
    inputPath: string,
    filename: string,
  ): Promise<{ storageKey: string; sizeBytes: number; durationMs: number; note: string }> {
    const audioPath = path.join(dir, "lesson.m4a");
    await this.execFfmpeg(extractLessonAudioArgs(inputPath, audioPath));
    const durationMs = (await this.probeDurationMs(inputPath)) ?? video.durationMs ?? 8_000;
    const caps = await this.capabilities();
    const sceneCount = clampSceneCount(options.maxScenes, caps.imageGen);
    let cues = timeSliceCues(video.title, durationMs, sceneCount);
    let note = "Minh họa theo nhịp thời gian — thêm khóa Whisper để chia cảnh theo lời giảng.";

    if (caps.speech) {
      try {
        const speechPath = path.join(dir, "speech.mp3");
        await this.execFfmpeg(extractSpeechAudioArgs(inputPath, speechPath));
        const audio = await readFile(speechPath);
        if (audio.length <= 20 * 1024 * 1024) {
          const speech = await ai.transcribe({ bytes: audio, filename: "speech.mp3", mime: "audio/mpeg" });
          const fromSpeech = cuesFromWhisperSegments(speech.segments);
          if (fromSpeech.length > 0) {
            cues = fromSpeech;
            note = "Minh họa theo transcript, giữ 100% tiếng gốc.";
          }
        } else {
          note = "Audio dài — đã chia cảnh theo thời gian, không gửi hết file vào Whisper.";
        }
      } catch (err) {
        note = `Không nhận lời nói (${err instanceof Error ? err.message : "lỗi"}). Đã dựng thẻ theo thời gian.`;
      }
    }

    const scenes = groupScenesForEdition(cues, durationMs, sceneCount);
    const style = options.style ?? "anime";
    const font = firstExistingFont(existsSync);
    if (!font) {
      throw new Error("Máy chủ thiếu font để dựng thẻ bài học.");
    }

    const entries: Array<{ file: string; durationSec: number }> = [];
    for (let index = 0; index < scenes.length; index += 1) {
      const scene = scenes[index];
      if (!scene) continue;
      const still = path.join(dir, `scene-${index}.jpg`);
      let usedGenerated = false;
      if (caps.imageGen) {
        try {
          const cover = await ai.generateCover({
            title: video.title,
            prompt: options.prompt || sceneImagePrompt(video.title, scene.text, style),
          });
          if (!cover.contentType.includes("svg") && cover.bytes.length > 0) {
            const raw = path.join(dir, `raw-${index}.png`);
            await writeFile(raw, cover.bytes);
            await this.execFfmpeg(captionStillArgs(raw, still, scene.text, font));
            usedGenerated = true;
          }
        } catch {
          usedGenerated = false;
        }
      }
      if (!usedGenerated) {
        await this.execFfmpeg(titlePosterArgs(still, scene.text, font, style));
      }
      entries.push({
        file: still,
        durationSec: Math.max(0.8, (scene.endMs - scene.startMs) / 1000),
      });
    }

    const listPath = path.join(dir, "scenes.txt");
    await writeFile(listPath, buildConcatDemuxerList(entries), "utf8");
    const outputPath = path.join(dir, "illustrated-out.mp4");
    await this.execFfmpeg(illustratedConcatArgs(listPath, audioPath, outputPath));
    const out = await readFile(outputPath);
    const key = buildObjectKey({
      appId: video.appId,
      type: "video-ai",
      id: editId,
      filename,
    });
    await this.storage.putObject(key, out, "video/mp4");
    return {
      storageKey: key,
      sizeBytes: out.length,
      durationMs: (await this.probeDurationMs(outputPath)) ?? durationMs,
      note,
    };
  }

  private async probeHasAudio(filePath: string): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync(
        "ffprobe",
        ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_type", "-of", "csv=p=0", filePath],
        { timeout: 15_000 },
      );
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  private async execFfmpeg(args: string[]): Promise<void> {
    try {
      await execFileAsync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args], {
        timeout: 10 * 60 * 1000,
        maxBuffer: 8 * 1024 * 1024,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "ffmpeg failed";
      throw new Error(`ffmpeg thất bại: ${message.slice(0, 240)}`);
    }
  }

  private async probeDurationMs(filePath: string): Promise<number | null> {
    try {
      const { stdout } = await execFileAsync(
        "ffprobe",
        ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
        { timeout: 15_000 },
      );
      const seconds = Number(stdout.trim());
      if (!Number.isFinite(seconds) || seconds <= 0) return null;
      return Math.round(seconds * 1000);
    } catch {
      return null;
    }
  }

  private async presentEdit(edit: VideoAiEdit) {
    const output = asOutput(edit.outputJson);
    let previewUrl: string | null = null;
    let editionPreviewUrl: string | null = null;
    if (output?.storageKey) {
      const signed = await this.storage.createDownloadUrl({
        key: output.storageKey,
        ttlSeconds: 600,
      });
      previewUrl = signed.url;
    }
    if (output?.editionStorageKey) {
      const signed = await this.storage.createDownloadUrl({
        key: output.editionStorageKey,
        ttlSeconds: 600,
      });
      editionPreviewUrl = signed.url;
    }
    const tool = getAiEditTool(edit.tool);
    return {
      id: edit.id,
      videoId: edit.videoId,
      tool: edit.tool,
      label: tool?.label ?? edit.tool,
      group: tool?.group ?? "copy",
      status: edit.status,
      provider: edit.provider,
      error: edit.error,
      createdAt: edit.createdAt,
      updatedAt: edit.updatedAt,
      output,
      previewUrl,
      editionPreviewUrl,
    };
  }
}

function asOutput(value: Prisma.JsonValue | null): VideoAiEditOutput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  const kind = rec.kind;
  if (kind !== "video" && kind !== "image" && kind !== "vtt" && kind !== "copy") return null;
  return {
    kind,
    storageKey: typeof rec.storageKey === "string" ? rec.storageKey : undefined,
    contentType: typeof rec.contentType === "string" ? rec.contentType : undefined,
    sizeBytes: typeof rec.sizeBytes === "number" ? rec.sizeBytes : undefined,
    durationMs: typeof rec.durationMs === "number" ? rec.durationMs : undefined,
    text: typeof rec.text === "string" ? rec.text : undefined,
    title: typeof rec.title === "string" ? rec.title : undefined,
    description: typeof rec.description === "string" ? rec.description : undefined,
    tags: Array.isArray(rec.tags) ? rec.tags.filter((t): t is string => typeof t === "string") : undefined,
    newVideoId: typeof rec.newVideoId === "string" ? rec.newVideoId : undefined,
    editionStorageKey: typeof rec.editionStorageKey === "string" ? rec.editionStorageKey : undefined,
    editionContentType: typeof rec.editionContentType === "string" ? rec.editionContentType : undefined,
    editionSizeBytes: typeof rec.editionSizeBytes === "number" ? rec.editionSizeBytes : undefined,
    editionDurationMs: typeof rec.editionDurationMs === "number" ? rec.editionDurationMs : undefined,
    editionVideoId: typeof rec.editionVideoId === "string" ? rec.editionVideoId : undefined,
    appliedAt: typeof rec.appliedAt === "string" ? rec.appliedAt : undefined,
    appliedToLessonId: typeof rec.appliedToLessonId === "string" ? rec.appliedToLessonId : undefined,
    appliedToProductId: typeof rec.appliedToProductId === "string" ? rec.appliedToProductId : undefined,
    providerNote: typeof rec.providerNote === "string" ? rec.providerNote : undefined,
  };
}
