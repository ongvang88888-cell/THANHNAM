import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { execFile } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import {
  assertFreeMediaDisk,
  buildObjectKey,
  createStorageFromEnv,
  MAX_MEDIA_OBJECT_BYTES,
  storageRoot,
  type IStorageProvider,
} from "@edu/media-core";
import {
  AI_EDIT_TOOLS,
  HEYGEN_GENERATE_URL,
  HEYGEN_STATUS_URL,
  HEYGEN_TRANSLATE_URL,
  HEYGEN_UPLOAD_PHOTO_URL,
  LECTURE_EXPERT_RECIPE_ID,
  OWNERSHIP_DISCLAIMER,
  assertStudioConsent,
  atempoForFit,
  buildConcatDemuxerList,
  buildHeygenAvatarBody,
  buildHeygenTranslateBody,
  buildMinimaxVideoBody,
  buildVeoGenerateBody,
  captionStillArgs,
  characterPipOverlayArgs,
  characterReplaceCoverArgs,
  characterStillPrompt,
  clampSceneCount,
  concatAudioArgs,
  concatNormalizedArgs,
  courseEnhanceArgs,
  createAiPortFromEnv,
  cuesFromWhisperSegments,
  clampQuickTrim,
  defaultInsertMode,
  describeRecipe,
  elevenLabsApiKey,
  elevenLabsCloneVoice,
  elevenLabsDeleteVoice,
  elevenLabsSpeak,
  enhanceAndSpeechArgs,
  enhanceSpeechTrimArgs,
  envAiCapabilities,
  extractAudioSegmentArgs,
  extractLessonAudioArgs,
  extractSpeechAudioArgs,
  eyeContactReframeArgs,
  firstExistingFont,
  fitAudioDurationArgs,
  getAiEditTool,
  groupScenesForEdition,
  hailuoMotionPrompt,
  heuristicCuesFromTitle,
  heygenApiKey,
  heygenHeaders,
  isAllowedRemoteMediaUrl,
  illustratedConcatArgs,
  isAiEditToolId,
  isPlaceholderLessonTitle,
  kenBurnsStillArgs,
  minimaxApiKey,
  minimaxCreateUrl,
  minimaxHeaders,
  minimaxQueryUrl,
  overlayRegionForInsert,
  parseAiEditOptions,
  parseHeygenStatus,
  parseHeygenTalkingPhotoId,
  parseHeygenVideoId,
  parseMinimaxStatus,
  parseMinimaxTaskId,
  parsePublicHttpsUrl,
  parseVeoOperationName,
  parseVeoStatus,
  pictureEnhanceArgs,
  quickTrimCopyArgs,
  quickTrimEncodeArgs,
  progressFields,
  progressForStatus,
  replaceAudioArgs,
  scaleClipKeepAudioArgs,
  scaleClipSilentAudioArgs,
  sceneImagePrompt,
  silenceTrimArgs,
  speechFocusArgs,
  studioSoundArgs,
  thumbnailArgs,
  thumbnailSeekSeconds,
  timeSliceCues,
  titlePosterArgs,
  toVtt,
  toolAvailability,
  toonTalkingHeadArgs,
  veoApiKey,
  veoGenerateUrl,
  veoIntroPrompt,
  veoOperationUrl,
  withGoogleApiKey,
  type AiCapabilities,
  type CharacterLook,
  type InsertMode,
  type AiEditOptions,
  type AiEditStepId,
  type AiEditToolId,
  type AiPort,
  type RecipeTechnique,
  type SpeechResult,
} from "@edu/ai-core";
import { AppError, ErrorCodes, assertNever, hasAnyRole } from "@edu/shared-core";
import type { Prisma, Video, VideoAiEdit } from "@edu/database";
import { PrismaService } from "../common/prisma.service";
import type { RequestUser } from "../auth/auth.guard";
import { ffmpegEncodeGate, ffmpegMaxConcurrent, isHeavyFfmpegEncode } from "./ffmpeg-gate";

const execFileAsync = promisify(execFile);
const MAX_SOURCE_BYTES = MAX_MEDIA_OBJECT_BYTES;
const MAX_EDITS_PER_VIDEO = 20;
const MAX_ACTIVE_PER_USER = 16;
const STALE_EDIT_MS = 12 * 60 * 1000;

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
  thumbnailStorageKey?: string;
  captionStorageKey?: string;
  captionSizeBytes?: number;
  autoApplyError?: string;
  progress?: number;
  step?: string;
  stepLabel?: string;
  recipeId?: string;
  techniques?: RecipeTechnique[];
}

@Injectable()
export class VideoAiEditService implements OnModuleInit {
  private readonly log = new Logger(VideoAiEditService.name);
  private readonly storage: IStorageProvider = createStorageFromEnv();
  private ffmpegKnown: boolean | null = null;
  private pumpTail: Promise<void> = Promise.resolve();

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const interrupted = await this.prisma.videoAiEdit.updateMany({
      where: { status: "PROCESSING" },
      data: {
        status: "FAILED",
        error: "Lệnh chỉnh bị gián đoạn khi máy chủ khởi động lại. Hãy tải lại video.",
      },
    });
    if (interrupted.count > 0) {
      this.log.warn(`Failed ${interrupted.count} interrupted AI edits after restart`);
    }
    await this.cleanupStaleTempDirs();
    this.pumpQueue();
  }

  private async cleanupStaleTempDirs() {
    const root = tmpdir();
    let names: string[] = [];
    try {
      names = await readdir(root);
    } catch {
      return;
    }
    for (const name of names) {
      if (!name.startsWith("edu-ai-")) continue;
      try {
        await rm(path.join(root, name), { recursive: true, force: true });
      } catch {
        // ignore a dir still in use
      }
    }
  }

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
    const head = await this.storage.head(video.storageKey);
    if (head) return { hasSource: head.sizeBytes > 0, sizeBytes: head.sizeBytes };
    const local = this.storage.localPath?.(video.storageKey);
    if (local && existsSync(local)) {
      try {
        const info = await stat(local);
        return { hasSource: info.size > 0, sizeBytes: info.size };
      } catch {
        return { hasSource: false, sizeBytes: 0 };
      }
    }
    return { hasSource: false, sizeBytes: 0 };
  }

  private async persistFile(key: string, filePath: string, contentType: string): Promise<number> {
    if (this.storage.putFile) {
      await this.storage.putFile(key, filePath, contentType);
      const head = await this.storage.head(key);
      return head?.sizeBytes ?? 0;
    }
    const bytes = await readFile(filePath);
    await this.storage.putObject(key, bytes, contentType);
    return bytes.length;
  }

  private async openStoredFile(key: string): Promise<{ path: string; cleanup: () => Promise<void> }> {
    const local = this.storage.localPath?.(key);
    if (local && existsSync(local)) {
      return { path: local, cleanup: async () => undefined };
    }
    const obj = await this.storage.getObject(key);
    if (!obj || obj.bytes.length === 0) {
      throw new Error("Chưa có file video gốc. Hãy tải lại video.");
    }
    if (obj.bytes.length > MAX_SOURCE_BYTES) {
      throw new Error("Video quá lớn để chỉnh trên máy chủ (tối đa 400MB)");
    }
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-src-"));
    const inputPath = path.join(dir, `in${path.extname(key) || ".mp4"}`);
    await writeFile(inputPath, obj.bytes);
    return {
      path: inputPath,
      cleanup: async () => {
        await rm(dir, { recursive: true, force: true });
      },
    };
  }

  private async openSourceFile(video: Video): Promise<{
    path: string;
    ext: string;
    contentType: string;
    cleanup: () => Promise<void>;
  }> {
    if (!video.storageKey) throw new Error("Video chưa có file gốc");
    const ext = path.extname(video.storageKey) || ".mp4";
    const head = await this.storage.head(video.storageKey);
    if (head && head.sizeBytes === 0) throw new Error("Chưa có file video gốc. Hãy tải lại video.");
    if (head && head.sizeBytes > MAX_SOURCE_BYTES) {
      throw new Error("Video quá lớn để chỉnh trên máy chủ (tối đa 400MB)");
    }
    const opened = await this.openStoredFile(video.storageKey);
    return {
      path: opened.path,
      ext,
      contentType: head?.contentType || "video/mp4",
      cleanup: opened.cleanup,
    };
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
      recipe: describeRecipe(caps),
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
      assertStudioConsent(rawTool, options);
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
    await this.prisma.videoAiEdit.updateMany({
      where: {
        video: { ownerUserId: user.userId, appId: user.appId },
        status: { in: ["QUEUED", "PROCESSING"] },
        updatedAt: { lt: new Date(Date.now() - STALE_EDIT_MS) },
      },
      data: {
        status: "FAILED",
        error: "Lệnh chỉnh quá hạn. Hãy tải lại video.",
      },
    });
    const active = await this.prisma.videoAiEdit.count({
      where: {
        video: { ownerUserId: user.userId, appId: user.appId },
        status: { in: ["QUEUED", "PROCESSING"] },
      },
    });
    if (active >= MAX_ACTIVE_PER_USER) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        "Đang có quá nhiều video xếp hàng. Đợi vài video xong rồi tải tiếp.",
        400,
      );
    }
    if (this.storage.localPath?.("__quota__")) {
      try {
        await assertFreeMediaDisk(storageRoot());
      } catch {
        throw new AppError(ErrorCodes.MAINTENANCE, "Máy chủ hết chỗ trống cho video. Xóa video cũ rồi chạy lại.", 503);
      }
    }
    const ai = createAiPortFromEnv();
    const queued = progressFields("queue");
    const edit = await this.prisma.videoAiEdit.create({
      data: {
        videoId: video.id,
        tool: tool.id,
        status: "QUEUED",
        provider: this.providerFor(tool.id, ai, caps),
        inputJson: options as Prisma.InputJsonValue,
        outputJson: { kind: "video", ...queued } as unknown as Prisma.InputJsonValue,
      },
    });
    this.pumpQueue();
    return this.presentEdit(edit);
  }

  private pumpQueue(): void {
    this.pumpTail = this.pumpTail
      .then(() => this.fillEncodeSlots())
      .catch((err) => {
        this.log.error(`AI encode queue failed: ${err instanceof Error ? err.message : "unknown"}`);
      });
  }

  private async fillEncodeSlots(): Promise<void> {
    const max = Math.max(1, ffmpegMaxConcurrent());
    while (true) {
      const processing = await this.prisma.videoAiEdit.count({
        where: { status: "PROCESSING" },
      });
      if (processing >= max) return;
      const next = await this.prisma.videoAiEdit.findFirst({
        where: { status: "QUEUED" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!next) return;
      const claimed = await this.prisma.videoAiEdit.updateMany({
        where: { id: next.id, status: "QUEUED" },
        data: { status: "PROCESSING" },
      });
      if (claimed.count !== 1) continue;
      void this.runClaimedEdit(next.id).catch((err) => {
        this.log.error(`AI edit ${next.id} crashed: ${err instanceof Error ? err.message : "unknown"}`);
      });
    }
  }

  private async markStep(
    editId: string,
    stepId: AiEditStepId,
    extra?: Partial<VideoAiEditOutput>,
  ): Promise<void> {
    const fields = progressFields(stepId);
    const current = await this.prisma.videoAiEdit.findUnique({ where: { id: editId } });
    if (!current) return;
    const existing = asOutput(current.outputJson) ?? { kind: "video" as const };
    const next: VideoAiEditOutput = { ...existing, ...extra, ...fields };
    await this.prisma.videoAiEdit.update({
      where: { id: editId },
      data: { outputJson: next as unknown as Prisma.InputJsonValue },
    });
  }

  async startAutoPublish(user: RequestUser, videoId: string, body: { lessonId?: string; courseId?: string }) {
    const lessonId = String(body.lessonId || "").trim();
    if (!lessonId) {
      throw new AppError(ErrorCodes.VALIDATION, "Chọn bài học để gắn video", 400);
    }
    const lesson = await this.assertCanAttachLesson(user, lessonId);
    const courseId = String(body.courseId || "").trim() || lesson.section.course.id;
    if (courseId !== lesson.section.course.id) {
      throw new AppError(ErrorCodes.VALIDATION, "Bài học không thuộc khóa đã chọn", 400);
    }
    return this.startEdit(user, videoId, "owned_abc", {
      confirmOwned: true,
      autoApply: true,
      lessonId: lesson.id,
      courseId,
      recipeId: LECTURE_EXPERT_RECIPE_ID,
      region: "speaker",
      style: "trend",
      toonStrength: "high",
    });
  }

  async startPrepare(user: RequestUser, videoId: string) {
    return this.startEdit(user, videoId, "owned_abc", {
      confirmOwned: true,
      autoApply: false,
      recipeId: LECTURE_EXPERT_RECIPE_ID,
      region: "speaker",
      style: "trend",
      toonStrength: "high",
    });
  }

  async assignVideo(user: RequestUser, videoId: string, body: { lessonId?: string; courseId?: string }) {
    const lessonId = String(body.lessonId || "").trim();
    if (!lessonId) {
      throw new AppError(ErrorCodes.VALIDATION, "Chọn bài học để gắn video", 400);
    }
    const video = await this.ownedVideo(user, videoId);
    const latest = await this.prisma.videoAiEdit.findFirst({
      where: { videoId: video.id, tool: "owned_abc", status: "READY" },
      orderBy: { createdAt: "desc" },
    });
    if (latest) {
      return this.applyEdit(user, videoId, latest.id, body);
    }
    await this.swapLessonVideo(user, lessonId, video.id);
    return {
      id: video.id,
      videoId: video.id,
      newVideoId: video.id,
      applied: ["lesson"],
      status: "READY" as const,
    };
  }

  async listLibrary(user: RequestUser) {
    this.assertTeacher(user);
    const videos = await this.prisma.video.findMany({
      where: {
        appId: user.appId,
        ...(this.isAdmin(user) ? {} : { ownerUserId: user.userId }),
      },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        aiEdits: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });
    const videoIds = videos.map((row) => row.id);
    const derivedIds = videos.flatMap((row) => {
      const latest = row.aiEdits.find((edit) => edit.tool === "owned_abc") ?? row.aiEdits[0];
      const output = asOutput(latest?.outputJson ?? null);
      return output?.newVideoId ? [output.newVideoId] : [];
    });
    const attachments = await this.prisma.lessonContent.findMany({
      where: {
        contentType: "VIDEO",
        refId: { in: [...videoIds, ...derivedIds] },
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            section: { select: { course: { select: { id: true, title: true, appId: true } } } },
          },
        },
      },
    });
    const attachByRef = new Map<string, { lessonId: string; lessonTitle: string; courseId: string; courseTitle: string }>();
    for (const row of attachments) {
      if (!row.refId || row.lesson.section.course.appId !== user.appId) continue;
      attachByRef.set(row.refId, {
        lessonId: row.lesson.id,
        lessonTitle: row.lesson.title,
        courseId: row.lesson.section.course.id,
        courseTitle: row.lesson.section.course.title,
      });
    }
    const items = await Promise.all(
      videos.map(async (video) => {
        const latestOwned = video.aiEdits.find((edit) => edit.tool === "owned_abc") ?? null;
        if (!latestOwned) return null;
        const latest = latestOwned;
        const output = asOutput(latest?.outputJson ?? null);
        const assigned =
          attachByRef.get(video.id) ?? (output?.newVideoId ? attachByRef.get(output.newVideoId) : undefined) ?? null;
        const presented = latest ? await this.presentEdit(latest, video.storageKey) : null;
        const thumbnailKey = await this.firstExistingKey([output?.thumbnailStorageKey, video.thumbnailKey]);
        const thumbnailUrl = thumbnailKey
          ? (await this.storage.createDownloadUrl({ key: thumbnailKey, ttlSeconds: 600 })).url
          : null;
        return {
          id: video.id,
          title: video.title,
          status: video.status,
          durationMs: output?.durationMs ?? video.durationMs,
          createdAt: video.createdAt,
          thumbnailUrl,
          assigned,
          inbox: !assigned,
          edit: presented,
        };
      }),
    );
    return { videos: items.filter((item): item is NonNullable<typeof item> => Boolean(item)) };
  }

  async quickAdjust(
    user: RequestUser,
    videoId: string,
    body: { startMs?: number; endMs?: number; thumbSeekSeconds?: number },
  ) {
    const video = await this.ownedVideo(user, videoId);
    const edit = await this.prisma.videoAiEdit.findFirst({
      where: { videoId: video.id, status: "READY", tool: "owned_abc" },
      orderBy: { createdAt: "desc" },
    });
    if (!edit) {
      throw new AppError(ErrorCodes.VALIDATION, "Chưa có bản AI để chỉnh nhanh. Đợi công thức chuyên gia chạy xong.", 400);
    }
    const output = asOutput(edit.outputJson);
    if (!output?.storageKey) {
      throw new AppError(ErrorCodes.VALIDATION, "Thiếu file đã chỉnh để cắt", 400);
    }
    const wantTrim = body.startMs !== undefined || body.endMs !== undefined;
    const wantThumb = body.thumbSeekSeconds !== undefined;
    if (!wantTrim && !wantThumb) {
      throw new AppError(ErrorCodes.VALIDATION, "Chọn đoạn cắt hoặc điểm ảnh bìa", 400);
    }
    const source = await this.openStoredFile(output.storageKey).catch(() => {
      throw new AppError(ErrorCodes.VALIDATION, "Không đọc được file đã chỉnh. Hãy chạy lại AI.", 400);
    });
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-adjust-"));
    try {
      const inputPath = source.path;
      const durationMs = (await this.probeDurationMs(inputPath)) ?? output.durationMs ?? 0;
      if (wantTrim) {
        const range = clampQuickTrim(body.startMs ?? 0, body.endMs ?? durationMs, durationMs);
        if (range.endMs - range.startMs < durationMs - 80) {
          const outPath = path.join(dir, "trim.mp4");
          const startSec = range.startMs / 1000;
          const durSec = (range.endMs - range.startMs) / 1000;
          try {
            await this.execFfmpeg(quickTrimCopyArgs(inputPath, outPath, startSec, durSec));
          } catch {
            await this.execFfmpeg(quickTrimEncodeArgs(inputPath, outPath, startSec, durSec));
          }
          const key = buildObjectKey({
            appId: video.appId,
            type: "video-ai",
            id: `${edit.id}-adj`,
            filename: "quick-trim.mp4",
          });
          const sizeBytes = await this.persistFile(key, outPath, "video/mp4");
          output.storageKey = key;
          output.sizeBytes = sizeBytes;
          output.durationMs = (await this.probeDurationMs(outPath)) ?? range.endMs - range.startMs;
          if (output.newVideoId) {
            await this.prisma.video.update({
              where: { id: output.newVideoId },
              data: { storageKey: key, durationMs: output.durationMs },
            });
            await this.prisma.videoAsset.updateMany({
              where: { videoId: output.newVideoId, format: "mp4" },
              data: { storageKey: key, sizeBytes: BigInt(sizeBytes) },
            });
          }
        }
      }
      if (wantThumb) {
        const thumbPath = path.join(dir, "thumb.jpg");
        const seek = Math.max(0, Math.min(body.thumbSeekSeconds ?? 1.2, (output.durationMs ?? durationMs) / 1000));
        const thumbSource = existsSync(path.join(dir, "trim.mp4")) ? path.join(dir, "trim.mp4") : inputPath;
        await this.execFfmpeg(thumbnailArgs(thumbSource, thumbPath, seek));
        const thumbBytes = await readFile(thumbPath);
        const thumbKey = buildObjectKey({
          appId: video.appId,
          type: "video-ai",
          id: edit.id,
          filename: "quick-thumb.jpg",
        });
        await this.storage.putObject(thumbKey, thumbBytes, "image/jpeg");
        output.thumbnailStorageKey = thumbKey;
        await this.prisma.video.update({
          where: { id: video.id },
          data: { thumbnailKey: thumbKey },
        });
        if (output.newVideoId && output.newVideoId !== video.id) {
          await this.prisma.video.update({
            where: { id: output.newVideoId },
            data: { thumbnailKey: thumbKey },
          });
        }
      }
      await this.prisma.videoAiEdit.update({
        where: { id: edit.id },
        data: { outputJson: output as unknown as Prisma.InputJsonValue },
      });
      return this.presentEdit({ ...edit, outputJson: output as unknown as Prisma.JsonValue });
    } finally {
      await rm(dir, { recursive: true, force: true });
      await source.cleanup();
    }
  }

  private providerFor(tool: AiEditToolId, ai: AiPort, caps: AiCapabilities): string {
    if (tool === "captions") return caps.speech ? ai.id : "heuristic";
    if (tool === "ai_cover") return caps.imageGen ? ai.id : "poster";
    if (tool === "lesson_copy") return caps.llm ? ai.id : "heuristic";
    if (tool === "illustrated_edition") {
      if (caps.imageGen && caps.speech) return ai.id;
      if (caps.speech) return `${ai.id}+poster`;
      return "ffmpeg+poster";
    }
    if (tool === "avatar_presenter") return caps.heygen ? "heygen" : caps.tts ? `${ai.id}+tts` : "ffmpeg";
    if (tool === "hailuo_character") return caps.minimax ? (caps.tts ? "minimax+tts" : "minimax") : "ffmpeg";
    if (tool === "veo_intro") return caps.veo ? "veo" : "ffmpeg";
    if (tool === "video_translate") return caps.heygen ? "heygen" : `${ai.id}+tts`;
    if (tool === "eye_contact") return "ffmpeg";
    if (tool === "overdub") return caps.elevenlabs ? "elevenlabs" : caps.tts ? `${ai.id}+tts` : "ffmpeg";
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
      if (output.thumbnailStorageKey) {
        await this.applyThumbnailAssets(video.id, newVideoId, output.thumbnailStorageKey);
        applied.push("thumbnail");
        if (body.courseId) {
          await this.applyCourseCover(user, body.courseId, output.thumbnailStorageKey);
          output.appliedToProductId = body.courseId;
          applied.push("course_cover");
        }
      }
      if (output.captionStorageKey) {
        await this.attachCaptions(newVideoId, output.captionStorageKey, output.captionSizeBytes);
        applied.push("captions");
      }
      if (body.lessonId && (output.title || output.description || output.durationMs)) {
        await this.applyLessonMeta(user, body.lessonId, output);
        applied.push("copy");
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
      if (body.lessonId) {
        await this.applyLessonMeta(user, body.lessonId, output);
      }
    }

    output.appliedAt = new Date().toISOString();
    output.autoApplyError = undefined;
    Object.assign(output, progressFields("done"));
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

  private async assertCanAttachLesson(user: RequestUser, lessonId: string) {
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
    return lesson;
  }

  private async applyThumbnailAssets(sourceVideoId: string, newVideoId: string, storageKey: string) {
    await this.prisma.video.update({
      where: { id: sourceVideoId },
      data: { thumbnailKey: storageKey },
    });
    if (newVideoId !== sourceVideoId) {
      await this.prisma.video.update({
        where: { id: newVideoId },
        data: { thumbnailKey: storageKey },
      });
    }
  }

  private async attachCaptions(videoId: string, storageKey: string, sizeBytes?: number) {
    await this.prisma.videoAsset.deleteMany({
      where: { videoId, format: "vtt" },
    });
    await this.prisma.videoAsset.create({
      data: {
        videoId,
        quality: "captions",
        format: "vtt",
        storageKey,
        sizeBytes: BigInt(sizeBytes ?? 0),
      },
    });
  }

  private async applyLessonMeta(user: RequestUser, lessonId: string, output: VideoAiEditOutput) {
    const lesson = await this.assertCanAttachLesson(user, lessonId);
    const data: Prisma.LessonUpdateInput = {};
    if (output.title && isPlaceholderLessonTitle(lesson.title)) {
      data.title = output.title.slice(0, 180);
    }
    if (output.durationMs && output.durationMs > 0) {
      data.durationSec = Math.max(1, Math.round(output.durationMs / 1000));
    }
    if (Object.keys(data).length > 0) {
      await this.prisma.lesson.update({ where: { id: lesson.id }, data });
    }
    const text = output.description?.trim();
    if (!text) return;
    const existing = lesson.contents.find((row) => row.contentType === "TEXT");
    if (!existing) {
      await this.prisma.lessonContent.create({
        data: {
          lessonId: lesson.id,
          contentType: "TEXT",
          body: text,
          position: 0,
        },
      });
      return;
    }
    if (!existing.body?.trim()) {
      await this.prisma.lessonContent.update({
        where: { id: existing.id },
        data: { body: text },
      });
    }
  }

  private async actorFromVideo(video: Video): Promise<RequestUser> {
    const ownerUserId = video.ownerUserId;
    if (!ownerUserId) {
      throw new Error("Video không có chủ sở hữu để gắn vào bài");
    }
    const roleIds = (
      await this.prisma.userRole.findMany({
        where: { userId: ownerUserId },
        select: { roleId: true },
      })
    ).map((row) => row.roleId);
    const roleRows = roleIds.length
      ? await this.prisma.role.findMany({
          where: { id: { in: roleIds } },
          select: { code: true },
        })
      : [];
    const roles = roleRows.map((row) => row.code as RequestUser["roles"][number]);
    return {
      userId: ownerUserId,
      appId: video.appId,
      sessionId: "ai-auto-apply",
      roles: roles.length > 0 ? roles : (["teacher"] as RequestUser["roles"]),
    };
  }

  private async autoApplyReadyEdit(
    video: Video,
    editId: string,
    options: AiEditOptions,
    actor?: RequestUser,
  ) {
    try {
      const applyActor = actor ?? (await this.actorFromVideo(video));
      await this.applyEdit(applyActor, video.id, editId, {
        lessonId: options.lessonId,
        courseId: options.courseId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 400) : "Không gắn được vào bài";
      this.log.warn(`AI edit ${editId} auto-apply failed: ${message}`);
      const current = await this.prisma.videoAiEdit.findUnique({ where: { id: editId } });
      const output = asOutput(current?.outputJson ?? null);
      if (!output) return;
      output.autoApplyError = message;
      await this.prisma.videoAiEdit.update({
        where: { id: editId },
        data: { outputJson: output as unknown as Prisma.InputJsonValue },
      });
    }
  }

  private async swapLessonVideo(user: RequestUser, lessonId: string, videoId: string) {
    const lesson = await this.assertCanAttachLesson(user, lessonId);
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

  async processEdit(editId: string, actor?: RequestUser): Promise<void> {
    const claimed = await this.prisma.videoAiEdit.updateMany({
      where: { id: editId, status: "QUEUED" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count !== 1) return;
    await this.runClaimedEdit(editId, actor);
  }

  private async runClaimedEdit(editId: string, actor?: RequestUser): Promise<void> {
    const edit = await this.prisma.videoAiEdit.findUnique({
      where: { id: editId },
      include: { video: true },
    });
    if (!edit) {
      this.pumpQueue();
      return;
    }
    try {
      if (!isAiEditToolId(edit.tool)) {
        throw new Error("Công cụ không hợp lệ");
      }
      const options = parseAiEditOptions(edit.inputJson);
      await this.markStep(edit.id, "source");
      const output = await this.runTool(edit.tool, edit.video, edit.id, options);
      const latest = await this.prisma.videoAiEdit.findUnique({ where: { id: edit.id } });
      const prior = asOutput(latest?.outputJson ?? null);
      const merged: VideoAiEditOutput = {
        ...output,
        progress: prior?.progress ?? output.progress,
        step: prior?.step ?? output.step,
        stepLabel: prior?.stepLabel ?? output.stepLabel,
      };
      if (options.autoApply && options.lessonId) {
        Object.assign(merged, progressFields("apply"));
      } else {
        Object.assign(merged, progressFields("done"));
      }
      await this.prisma.videoAiEdit.update({
        where: { id: edit.id },
        data: {
          status: "READY",
          outputJson: merged as unknown as Prisma.InputJsonValue,
          error: null,
        },
      });
      if (options.autoApply && options.lessonId) {
        await this.autoApplyReadyEdit(edit.video, edit.id, options, actor);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 400) : "Chỉnh sửa AI thất bại";
      this.log.warn(`AI edit ${edit.id} failed: ${message}`);
      await this.prisma.videoAiEdit.update({
        where: { id: edit.id },
        data: { status: "FAILED", error: message },
      });
    } finally {
      this.pumpQueue();
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
        const region = options.region ?? "speaker";
        const style = options.style ?? "trend";
        const strength = options.toonStrength ?? "high";
        const output = await this.runFfmpegVideo(
          video,
          editId,
          tool,
          (input, outputPath) => toonTalkingHeadArgs(input, outputPath, region, style, strength),
          "video/mp4",
        );
        output.providerNote =
          region === "full"
            ? `${OWNERSHIP_DISCLAIMER} Bản trên máy: tô đậm cả khung (cel + nét). Không đổi tóc/áo như Kling/Dreamina.`
            : region === "speaker"
              ? `${OWNERSHIP_DISCLAIMER} Bản trên máy: tô đậm người giữa khung, giữ slide và tiếng gốc. Không sinh nhân vật 3D.`
              : `${OWNERSHIP_DISCLAIMER} Bản trên máy: tô PIP/mặt, giữ slide và tiếng gốc.`;
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
      case "avatar_presenter":
        return this.runAvatarPresenter(video, editId, options, ai);
      case "hailuo_character":
        return this.runHailuoCharacter(video, editId, options, ai);
      case "veo_intro":
        return this.runVeoIntro(video, editId, options, ai);
      case "video_translate":
        return this.runVideoTranslate(video, editId, options, ai);
      case "eye_contact": {
        const output = await this.runFfmpegVideo(video, editId, tool, eyeContactReframeArgs, "video/mp4");
        output.providerNote =
          "Bản trên máy: canh mặt/mắt vào giữa khung (crop/zoom). Không warp từng con ngươi như Descript đám mây.";
        return output;
      }
      case "overdub":
        return this.runOverdub(video, editId, options, ai);
      default:
        return assertNever(tool);
    }
  }

  private async runFfmpegVideo(
    video: Video,
    editId: string,
    tool: AiEditToolId,
    buildArgs: (input: string, output: string) => string[],
    contentType: string,
  ): Promise<VideoAiEditOutput> {
    const source = await this.openSourceFile(video);
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-"));
    try {
      const outputPath = path.join(dir, "out.mp4");
      await this.execFfmpeg(buildArgs(source.path, outputPath));
      const key = buildObjectKey({
        appId: video.appId,
        type: "video-ai",
        id: editId,
        filename: `${tool}.mp4`,
      });
      const sizeBytes = await this.persistFile(key, outputPath, contentType);
      const durationMs = (await this.probeDurationMs(outputPath)) ?? video.durationMs ?? undefined;
      return {
        kind: "video",
        storageKey: key,
        contentType,
        sizeBytes,
        durationMs,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
      await source.cleanup();
    }
  }

  private async runThumbnail(video: Video, editId: string, options: AiEditOptions): Promise<VideoAiEditOutput> {
    const source = await this.openSourceFile(video);
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-"));
    try {
      const outputPath = path.join(dir, "thumb.jpg");
      const durationMs = (await this.probeDurationMs(source.path)) ?? video.durationMs ?? 0;
      const seek = options.seekSeconds ?? thumbnailSeekSeconds(durationMs);
      await this.execFfmpeg(thumbnailArgs(source.path, outputPath, seek));
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
      await source.cleanup();
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
      const source = await this.openSourceFile(video);
      let audio: Buffer;
      let filename = `speech${source.ext}`;
      let mime = source.contentType || "video/mp4";
      try {
        if (await this.hasFfmpeg()) {
          const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-"));
          try {
            const outputPath = path.join(dir, "speech.mp3");
            await this.execFfmpeg(extractSpeechAudioArgs(source.path, outputPath));
            audio = await readFile(outputPath);
            filename = "speech.mp3";
            mime = "audio/mpeg";
          } finally {
            await rm(dir, { recursive: true, force: true });
          }
        } else {
          const obj = await this.storage.getObject(video.storageKey!);
          if (!obj || obj.bytes.length === 0) throw new Error("Chưa có file video gốc. Hãy tải lại video.");
          audio = obj.bytes;
        }
      } finally {
        await source.cleanup();
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
    const source = await this.openSourceFile(video);
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-abc-"));
    try {
      const inputPath = source.path;
      await this.markStep(editId, "source");
      if (!(await this.probeHasAudio(inputPath))) {
        throw new Error("Video không có tiếng giảng. Cần lời gốc để làm nét tiếng và giảm nhạc nền.");
      }
      await this.markStep(editId, "enhance");
      const combinedPath = path.join(dir, "enhance-trim.mp4");
      const enhancedPath = path.join(dir, "enhance-speech.mp4");
      let lessonPath = enhancedPath;
      let trimApplied = false;
      try {
        await this.execFfmpeg(enhanceSpeechTrimArgs(inputPath, combinedPath));
        lessonPath = combinedPath;
        trimApplied = true;
        await this.markStep(editId, "trim");
      } catch (err) {
        this.log.warn(`one-pass enhance+trim fallback: ${err instanceof Error ? err.message : "error"}`);
        await this.execFfmpeg(enhanceAndSpeechArgs(inputPath, enhancedPath));
        await this.markStep(editId, "trim");
        const trimmedPath = path.join(dir, "owned-abc-trim.mp4");
        try {
          await this.execFfmpeg(silenceTrimArgs(enhancedPath, trimmedPath));
          lessonPath = trimmedPath;
          trimApplied = true;
        } catch (trimErr) {
          this.log.warn(`silence trim skipped: ${trimErr instanceof Error ? trimErr.message : "error"}`);
        }
      }
      await this.markStep(editId, "toon");
      let toonApplied = false;
      const toonPath = path.join(dir, "owned-abc-toon.mp4");
      const region = options.region ?? "speaker";
      const style = options.style ?? "trend";
      const strength = options.toonStrength ?? "high";
      try {
        await this.execFfmpeg(toonTalkingHeadArgs(lessonPath, toonPath, region, style, strength));
        lessonPath = toonPath;
        toonApplied = true;
      } catch (toonErr) {
        this.log.warn(`auto toon restyle skipped: ${toonErr instanceof Error ? toonErr.message : "error"}`);
      }
      const lessonKey = buildObjectKey({
        appId: video.appId,
        type: "video-ai",
        id: editId,
        filename: "owned_abc.mp4",
      });
      const lessonSize = await this.persistFile(lessonKey, lessonPath, "video/mp4");

      const output: VideoAiEditOutput = {
        kind: "video",
        storageKey: lessonKey,
        contentType: "video/mp4",
        sizeBytes: lessonSize,
        durationMs: (await this.probeDurationMs(lessonPath)) ?? video.durationMs ?? undefined,
        providerNote: toonApplied
          ? `${OWNERSHIP_DISCLAIMER} Công thức lecture_expert_v1: làm nét + lọc tiếng, cắt im lặng, rồi tô đậm người giữa khung (phong cách trend trên máy). Giữ slide và tiếng gốc. Không sinh nhân vật 3D kiểu Kling/Dreamina.`
          : `${OWNERSHIP_DISCLAIMER} Công thức lecture_expert_v1: làm nét + lọc tiếng, cắt im lặng. Tô hoạt hình lỗi — giữ bản làm nét.`,
      };
      let extras: {
        captionsMode?: "whisper" | "heuristic" | "failed";
        copyMode?: "llm" | "heuristic" | "failed";
        thumbApplied: boolean;
      } = {
        thumbApplied: false,
      };
      await this.markStep(editId, "extras");
      extras = await this.enrichOwnedAbcOutput(video, editId, ai, dir, inputPath, lessonPath, output);
      const recipe = describeRecipe(await this.capabilities(), {
        trimApplied,
        toonApplied,
        captionsMode: extras.captionsMode,
        copyMode: extras.copyMode,
        thumbApplied: extras.thumbApplied,
      });
      output.recipeId = recipe.recipeId;
      output.techniques = recipe.techniques;
      return output;
    } finally {
      await rm(dir, { recursive: true, force: true });
      await source.cleanup();
    }
  }

  private async enrichOwnedAbcOutput(
    video: Video,
    editId: string,
    ai: AiPort,
    dir: string,
    inputPath: string,
    lessonPath: string,
    output: VideoAiEditOutput,
  ): Promise<{
    captionsMode?: "whisper" | "heuristic" | "failed";
    copyMode?: "llm" | "heuristic" | "failed";
    thumbApplied: boolean;
  }> {
    let thumbApplied = false;
    try {
      const thumbPath = path.join(dir, "auto-thumb.jpg");
      const durationMs = (await this.probeDurationMs(lessonPath)) ?? output.durationMs ?? 0;
      const seek = thumbnailSeekSeconds(durationMs);
      await this.execFfmpeg(thumbnailArgs(lessonPath, thumbPath, seek));
      const thumbBytes = await readFile(thumbPath);
      const thumbKey = buildObjectKey({
        appId: video.appId,
        type: "video-ai",
        id: editId,
        filename: "auto-thumbnail.jpg",
      });
      await this.storage.putObject(thumbKey, thumbBytes, "image/jpeg");
      output.thumbnailStorageKey = thumbKey;
      thumbApplied = true;
    } catch (err) {
      this.log.warn(`auto thumbnail skipped: ${err instanceof Error ? err.message : "error"}`);
    }

    let transcript = "";
    let captionsMode: "whisper" | "heuristic" | "failed" | undefined;
    try {
      const speechPath = path.join(dir, "auto-speech.mp3");
      await this.execFfmpeg(extractSpeechAudioArgs(inputPath, speechPath));
      const audio = await readFile(speechPath);
      let cues = heuristicCuesFromTitle(video.title, video.durationMs ?? undefined);
      captionsMode = "heuristic";
      try {
        const speech = await ai.transcribe({ bytes: audio, filename: "speech.mp3", mime: "audio/mpeg" });
        if (speech.text.trim() || speech.segments.length > 0) {
          transcript = speech.text.trim();
          cues =
            speech.segments.length > 0
              ? cuesFromWhisperSegments(speech.segments)
              : [{ startMs: 0, endMs: video.durationMs ?? 8000, text: transcript }];
          captionsMode = "whisper";
        }
      } catch {
        captionsMode = "heuristic";
      }
      const vtt = toVtt(cues);
      const captionKey = buildObjectKey({
        appId: video.appId,
        type: "video-ai",
        id: editId,
        filename: "auto-captions.vtt",
      });
      const bytes = Buffer.from(vtt, "utf8");
      await this.storage.putObject(captionKey, bytes, "text/vtt");
      output.captionStorageKey = captionKey;
      output.captionSizeBytes = bytes.length;
      output.text = transcript || cues.map((cue) => cue.text).join("\n");
    } catch (err) {
      captionsMode = "failed";
      this.log.warn(`auto captions skipped: ${err instanceof Error ? err.message : "error"}`);
    }

    let copyMode: "llm" | "heuristic" | "failed" | undefined;
    try {
      const copy = await ai.suggestLessonCopy({
        title: video.title,
        transcript: transcript || undefined,
      });
      output.title = copy.title;
      output.description = copy.description;
      output.tags = copy.tags;
      copyMode = copy.provider === "null" ? "heuristic" : "llm";
    } catch (err) {
      copyMode = "failed";
      this.log.warn(`auto copy skipped: ${err instanceof Error ? err.message : "error"}`);
    }
    return { captionsMode, copyMode, thumbApplied };
  }

  private async runIllustratedEdition(
    video: Video,
    editId: string,
    options: AiEditOptions,
    ai: AiPort,
  ): Promise<VideoAiEditOutput> {
    const source = await this.openSourceFile(video);
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-"));
    try {
      const inputPath = source.path;
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
      await source.cleanup();
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
    const style = options.style ?? "trend";
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
    let concatEntries = entries;
    try {
      const kenBurnsEntries: Array<{ file: string; durationSec: number }> = [];
      for (const [index, entry] of entries.entries()) {
        const clip = path.join(dir, `kenburns-${index}.mp4`);
        await this.execFfmpeg(kenBurnsStillArgs(entry.file, clip, entry.durationSec));
        kenBurnsEntries.push({ file: clip, durationSec: entry.durationSec });
      }
      concatEntries = kenBurnsEntries;
      note = `${note} Ken Burns nhẹ trên still gốc.`;
    } catch (err) {
      this.log.warn(`ken burns skipped: ${err instanceof Error ? err.message : "error"}`);
    }
    await writeFile(listPath, buildConcatDemuxerList(concatEntries), "utf8");
    const outputPath = path.join(dir, "illustrated-out.mp4");
    await this.execFfmpeg(illustratedConcatArgs(listPath, audioPath, outputPath));
    const key = buildObjectKey({
      appId: video.appId,
      type: "video-ai",
      id: editId,
      filename,
    });
    const sizeBytes = await this.persistFile(key, outputPath, "video/mp4");
    return {
      storageKey: key,
      sizeBytes,
      durationMs: (await this.probeDurationMs(outputPath)) ?? durationMs,
      note,
    };
  }

  private async runAvatarPresenter(
    video: Video,
    editId: string,
    options: AiEditOptions,
    ai: AiPort,
  ): Promise<VideoAiEditOutput> {
    const script = await this.resolvePresenterScript(video, options, ai);
    await this.markStep(editId, "enhance");
    const heygenKey = heygenApiKey();
    if (heygenKey) {
      try {
        let talkingPhotoId: string | undefined;
        try {
          const still = await this.resolveCharacterStill(video, editId, options, ai);
          if (still?.bytes) {
            talkingPhotoId = await this.uploadHeygenTalkingPhoto(heygenKey, still.bytes, still.contentType);
          }
        } catch (err) {
          this.log.warn(`HeyGen talking photo skipped: ${err instanceof Error ? err.message : "error"}`);
        }
        return await this.renderHeygenAvatar(video, editId, script, heygenKey, options, talkingPhotoId);
      } catch (err) {
        this.log.warn(`HeyGen avatar fallback: ${err instanceof Error ? err.message : "error"}`);
      }
    }
    const draft = await this.renderPosterTtsAvatar(video, editId, script, options, ai);
    return this.maybeComposeCharacter(video, editId, draft, options, "avatar_presenter");
  }

  private async resolvePresenterScript(video: Video, options: AiEditOptions, ai: AiPort): Promise<string> {
    const typed = (options.script || options.prompt || "").trim();
    if (typed) return typed.slice(0, 4000);
    if (!video.storageKey) {
      throw new Error("Nhập kịch bản (script) để dựng người dẫn.");
    }
    try {
      const source = await this.openSourceFile(video);
      try {
        const speech = await this.transcribeFromPath(source.path, ai);
        const text = speech.text.replace(/\s+/g, " ").trim();
        if (text) return text.slice(0, 4000);
      } finally {
        await source.cleanup();
      }
    } catch {
      // fall through
    }
    throw new Error("Nhập kịch bản (script) để dựng người dẫn.");
  }

  private async renderHeygenAvatar(
    video: Video,
    editId: string,
    script: string,
    apiKey: string,
    options: AiEditOptions,
    talkingPhotoId?: string,
  ): Promise<VideoAiEditOutput> {
    const remoteId = await this.startHeygenJob(
      HEYGEN_GENERATE_URL,
      buildHeygenAvatarBody({ script, title: video.title, talkingPhotoId }),
      apiKey,
    );
    const remoteUrl = await this.pollHeygenVideoUrl(remoteId, apiKey);
    const standalone = await this.persistRemoteMp4(
      video,
      editId,
      remoteUrl,
      "avatar_presenter.mp4",
      talkingPhotoId
        ? "HeyGen Photo Avatar — ảnh tĩnh nhép miệng. Chưa ghép vào bài."
        : "HeyGen avatar sẵn — người dẫn ảo từ kịch bản. Chưa ghép vào bài.",
    );
    return this.maybeComposeCharacter(video, editId, standalone, options, "avatar_presenter");
  }

  private async renderPosterTtsAvatar(
    video: Video,
    editId: string,
    script: string,
    options: AiEditOptions,
    ai: AiPort,
  ): Promise<VideoAiEditOutput> {
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-avatar-"));
    let sourceCleanup: (() => Promise<void>) | null = null;
    try {
      const speechPath = path.join(dir, "voice.mp3");
      const spoken = await this.speakToFile(ai, script, options.targetLanguage, speechPath);
      const audioDur = (await this.probeDurationMs(speechPath)) ?? Math.max(4000, script.length * 60);
      const still = path.join(dir, "still.jpg");
      let usedThumb = false;
      if (video.storageKey) {
        try {
          const source = await this.openSourceFile(video);
          sourceCleanup = source.cleanup;
          const seek = thumbnailSeekSeconds((await this.probeDurationMs(source.path)) ?? video.durationMs ?? 0);
          await this.execFfmpeg(thumbnailArgs(source.path, still, seek));
          usedThumb = true;
        } catch {
          usedThumb = false;
        }
      }
      if (!usedThumb) {
        const font = firstExistingFont(existsSync);
        if (!font) throw new Error("Máy chủ thiếu font để dựng ảnh người dẫn nháp.");
        await this.execFfmpeg(titlePosterArgs(still, options.prompt || video.title || "Bài học", font));
      }
      const clip = path.join(dir, "still.mp4");
      await this.execFfmpeg(kenBurnsStillArgs(still, clip, Math.max(2, audioDur / 1000)));
      const listPath = path.join(dir, "scenes.txt");
      await writeFile(
        listPath,
        buildConcatDemuxerList([{ file: clip, durationSec: Math.max(2, audioDur / 1000) }]),
        "utf8",
      );
      const outputPath = path.join(dir, "avatar-out.mp4");
      await this.execFfmpeg(illustratedConcatArgs(listPath, speechPath, outputPath));
      const key = buildObjectKey({
        appId: video.appId,
        type: "video-ai",
        id: editId,
        filename: "avatar_presenter.mp4",
      });
      const sizeBytes = await this.persistFile(key, outputPath, "video/mp4");
      return {
        kind: "video",
        storageKey: key,
        contentType: "video/mp4",
        sizeBytes,
        durationMs: (await this.probeDurationMs(outputPath)) ?? audioDur,
        providerNote: `Chưa có HeyGen — ảnh + TTS (${spoken.provider}), không phải người ảo HeyGen/Synthesia.`,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
      if (sourceCleanup) await sourceCleanup();
    }
  }

  private async runHailuoCharacter(
    video: Video,
    editId: string,
    options: AiEditOptions,
    ai: AiPort,
  ): Promise<VideoAiEditOutput> {
    const apiKey = minimaxApiKey();
    if (!apiKey) throw new Error("Cần MINIMAX_API_KEY để gọi Hailuo / MiniMax.");
    await this.markStep(editId, "enhance");
    const look: CharacterLook = options.characterLook ?? "cartoon_kid";
    const script = (options.script || options.prompt || "").trim();
    const still = await this.resolveCharacterStill(video, editId, options, ai);
    const remoteId = await this.startMinimaxJob(
      buildMinimaxVideoBody({
        prompt: hailuoMotionPrompt(look, script || video.title),
        imageUrl: still?.publicUrl,
        durationSec: 6,
      }),
      apiKey,
    );
    const remoteUrl = await this.pollMinimaxVideoUrl(remoteId, apiKey);
    let standalone = await this.persistRemoteMp4(
      video,
      editId,
      remoteUrl,
      "hailuo_character.mp4",
      still?.publicUrl
        ? "MiniMax Hailuo — ảnh tĩnh thành chuyển động. Môi không khớp như HeyGen."
        : "MiniMax Hailuo — sinh từ prompt (không có ảnh https công khai). Mặt dễ lệch.",
    );
    if (script && standalone.storageKey) {
      try {
        standalone = await this.muxTtsOntoClip(video, editId, standalone, script, options, ai);
      } catch (err) {
        this.log.warn(`Hailuo TTS mux skipped: ${err instanceof Error ? err.message : "error"}`);
      }
    }
    return this.maybeComposeCharacter(video, editId, standalone, options, "hailuo_character");
  }

  private async runVeoIntro(
    video: Video,
    editId: string,
    options: AiEditOptions,
    ai: AiPort,
  ): Promise<VideoAiEditOutput> {
    const apiKey = veoApiKey();
    if (!apiKey) throw new Error("Cần GEMINI_API_KEY hoặc VEO_API_KEY để gọi Veo 3.1.");
    await this.markStep(editId, "enhance");
    const look: CharacterLook = options.characterLook ?? "teacher";
    const script = (options.script || options.prompt || "").trim();
    let imageBase64: string | undefined;
    let imageMime: string | undefined;
    try {
      const still = await this.resolveCharacterStill(video, editId, options, ai);
      if (still?.bytes && still.bytes.length < 8 * 1024 * 1024) {
        imageBase64 = still.bytes.toString("base64");
        imageMime = still.contentType;
      }
    } catch (err) {
      this.log.warn(`Veo still skipped: ${err instanceof Error ? err.message : "error"}`);
    }
    const operation = await this.startVeoJob(
      buildVeoGenerateBody({
        prompt: veoIntroPrompt(look, video.title, script),
        imageBase64,
        imageMime,
      }),
      apiKey,
    );
    const remoteUrl = await this.pollVeoVideoUrl(operation, apiKey);
    const standalone = await this.persistRemoteMp4(
      video,
      editId,
      remoteUrl,
      "veo_intro.mp4",
      "Veo 3.1 — clip mở bài ~8 giây có tiếng nói. Mặt có thể lệch giữa các lần.",
      apiKey,
    );
    return this.maybeComposeCharacter(video, editId, standalone, { ...options, insertMode: options.insertMode ?? "intro" }, "veo_intro");
  }

  private async maybeComposeCharacter(
    video: Video,
    editId: string,
    clip: VideoAiEditOutput,
    options: AiEditOptions,
    tool: "avatar_presenter" | "hailuo_character" | "veo_intro",
  ): Promise<VideoAiEditOutput> {
    const mode: InsertMode = options.insertMode ?? defaultInsertMode(tool);
    if (mode === "standalone" || !clip.storageKey || !video.storageKey) {
      return clip;
    }
    const lecture = await this.openSourceFile(video);
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-insert-"));
    try {
      const clipObj = await this.storage.getObject(clip.storageKey);
      if (!clipObj || clipObj.bytes.length === 0) return clip;
      const overlayPath = path.join(dir, "character.mp4");
      await writeFile(overlayPath, clipObj.bytes);
      const outputPath = path.join(dir, "composed.mp4");
      if (mode === "replace") {
        await this.execFfmpeg(
          characterReplaceCoverArgs(lecture.path, overlayPath, outputPath, options.region ?? "speaker"),
        );
      } else if (mode === "overlay") {
        const overlaySec = Math.max(1, Math.min(20, (clip.durationMs ?? 8000) / 1000));
        await this.execFfmpeg(
          characterPipOverlayArgs(lecture.path, overlayPath, outputPath, overlayRegionForInsert(options.region), overlaySec),
        );
      } else if (mode === "intro") {
        const introNorm = path.join(dir, "intro.mp4");
        const lessonNorm = path.join(dir, "lesson.mp4");
        const introHasAudio = await this.probeHasAudio(overlayPath);
        const lessonHasAudio = await this.probeHasAudio(lecture.path);
        await this.execFfmpeg(
          introHasAudio ? scaleClipKeepAudioArgs(overlayPath, introNorm) : scaleClipSilentAudioArgs(overlayPath, introNorm),
        );
        await this.execFfmpeg(
          lessonHasAudio ? scaleClipKeepAudioArgs(lecture.path, lessonNorm) : scaleClipSilentAudioArgs(lecture.path, lessonNorm),
        );
        const listPath = path.join(dir, "concat.txt");
        await writeFile(listPath, buildConcatDemuxerList([
          { file: introNorm, durationSec: ((await this.probeDurationMs(introNorm)) ?? 8000) / 1000 },
          { file: lessonNorm, durationSec: ((await this.probeDurationMs(lessonNorm)) ?? 8000) / 1000 },
        ]), "utf8");
        await this.execFfmpeg(concatNormalizedArgs(listPath, outputPath));
      } else {
        const _never: never = mode;
        return _never;
      }
      const key = buildObjectKey({
        appId: video.appId,
        type: "video-ai",
        id: editId,
        filename: `${tool}.mp4`,
      });
      const sizeBytes = await this.persistFile(key, outputPath, "video/mp4");
      const insertNote =
        mode === "replace"
          ? " Đã che người trong bài bằng nhân vật AI (lặp clip ngắn), giữ tiếng gốc. Không phải face-swap."
          : mode === "overlay"
            ? " Đã ghép góc màn hình, giữ tiếng bài giảng gốc."
            : " Đã nối clip trước bài giảng.";
      return {
        kind: "video",
        storageKey: key,
        contentType: "video/mp4",
        sizeBytes,
        durationMs: (await this.probeDurationMs(outputPath)) ?? clip.durationMs,
        providerNote: `${clip.providerNote ?? ""}${insertNote}`.trim(),
      };
    } catch (err) {
      this.log.warn(`character compose skipped: ${err instanceof Error ? err.message : "error"}`);
      return {
        ...clip,
        providerNote: `${clip.providerNote ?? ""} Không ghép được vào bài — giữ clip nhân vật riêng.`.trim(),
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
      await lecture.cleanup();
    }
  }

  private async muxTtsOntoClip(
    video: Video,
    editId: string,
    clip: VideoAiEditOutput,
    script: string,
    options: AiEditOptions,
    ai: AiPort,
  ): Promise<VideoAiEditOutput> {
    if (!clip.storageKey) return clip;
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-mux-"));
    try {
      const obj = await this.storage.getObject(clip.storageKey);
      if (!obj) return clip;
      const videoPath = path.join(dir, "clip.mp4");
      const voicePath = path.join(dir, "voice.mp3");
      const outputPath = path.join(dir, "mux.mp4");
      await writeFile(videoPath, obj.bytes);
      const spoken = await this.speakToFile(ai, script, options.targetLanguage ?? "vi", voicePath);
      await this.execFfmpeg(replaceAudioArgs(videoPath, voicePath, outputPath));
      const key = buildObjectKey({
        appId: video.appId,
        type: "video-ai",
        id: editId,
        filename: "hailuo_character.mp4",
      });
      const sizeBytes = await this.persistFile(key, outputPath, "video/mp4");
      return {
        ...clip,
        storageKey: key,
        sizeBytes,
        durationMs: (await this.probeDurationMs(outputPath)) ?? clip.durationMs,
        providerNote: `${clip.providerNote ?? ""} Đã ghép TTS (${spoken.provider}) — miệng Hailuo không khớp lời.`.trim(),
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async resolveCharacterStill(
    video: Video,
    editId: string,
    options: AiEditOptions,
    ai: AiPort,
  ): Promise<{ bytes: Buffer; contentType: string; publicUrl?: string } | null> {
    if (options.characterImageUrl) {
      const parsed = parsePublicHttpsUrl(options.characterImageUrl, "Ảnh nhân vật");
      const res = await fetch(parsed.toString(), { signal: AbortSignal.timeout(30_000), redirect: "follow" });
      if (!res.ok) throw new Error(`Không tải được ảnh nhân vật (${res.status})`);
      try {
        parsePublicHttpsUrl(res.url, "Ảnh nhân vật");
      } catch {
        throw new Error("Ảnh nhân vật chuyển hướng tới host không hợp lệ");
      }
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > 8 * 1024 * 1024) throw new Error("Ảnh nhân vật tối đa 8MB");
      const contentType = res.headers.get("content-type") || "image/png";
      return { bytes, contentType, publicUrl: parsed.toString() };
    }
    const look: CharacterLook = options.characterLook ?? "teacher";
    try {
      const cover = await ai.generateCover({
        title: video.title,
        prompt: characterStillPrompt(look, video.title, options.prompt),
      });
      if (cover.provider !== "null" && !cover.contentType.includes("svg")) {
        const key = buildObjectKey({
          appId: video.appId,
          type: "video-ai",
          id: editId,
          filename: "character-still.png",
        });
        await this.storage.putObject(key, cover.bytes, cover.contentType);
        const signed = await this.storage.createDownloadUrl({ key, ttlSeconds: 3600 });
        return {
          bytes: cover.bytes,
          contentType: cover.contentType,
          publicUrl: signed.url.startsWith("https://") ? signed.url : undefined,
        };
      }
    } catch (err) {
      this.log.warn(`character still imageGen skipped: ${err instanceof Error ? err.message : "error"}`);
    }
    if (!video.storageKey) return null;
    const source = await this.openSourceFile(video);
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-still-"));
    try {
      const still = path.join(dir, "still.jpg");
      const seek = thumbnailSeekSeconds((await this.probeDurationMs(source.path)) ?? video.durationMs ?? 0);
      await this.execFfmpeg(thumbnailArgs(source.path, still, seek));
      const bytes = await readFile(still);
      return { bytes, contentType: "image/jpeg" };
    } catch {
      return null;
    } finally {
      await rm(dir, { recursive: true, force: true });
      await source.cleanup();
    }
  }

  private async uploadHeygenTalkingPhoto(apiKey: string, bytes: Buffer, contentType: string): Promise<string> {
    const form = new FormData();
    const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
    form.append("file", new Blob([new Uint8Array(bytes)], { type: contentType || "image/png" }), `character.${ext}`);
    const res = await fetch(HEYGEN_UPLOAD_PHOTO_URL, {
      method: "POST",
      headers: { Accept: "application/json", "X-Api-Key": apiKey },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HeyGen upload ảnh thất bại (${res.status}): ${text.slice(0, 180)}`);
    }
    return parseHeygenTalkingPhotoId(await res.json());
  }

  private async startMinimaxJob(body: unknown, apiKey: string): Promise<string> {
    const res = await fetch(minimaxCreateUrl(), {
      method: "POST",
      headers: minimaxHeaders(apiKey),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`MiniMax thất bại (${res.status}): ${text.slice(0, 180)}`);
    }
    return parseMinimaxTaskId(await res.json());
  }

  private async pollMinimaxVideoUrl(taskId: string, apiKey: string): Promise<string> {
    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 8_000));
      const res = await fetch(minimaxQueryUrl(taskId), {
        headers: minimaxHeaders(apiKey),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`MiniMax status thất bại (${res.status}): ${text.slice(0, 180)}`);
      }
      const status = parseMinimaxStatus(await res.json());
      if (status.status === "failed") throw new Error(status.error || "MiniMax xử lý thất bại");
      if (status.status === "completed" && status.videoUrl) return status.videoUrl;
    }
    throw new Error("MiniMax quá hạn (hơn 10 phút). Thử lại sau.");
  }

  private async startVeoJob(body: unknown, apiKey: string): Promise<string> {
    const res = await fetch(veoGenerateUrl(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Veo thất bại (${res.status}): ${text.slice(0, 180)}`);
    }
    return parseVeoOperationName(await res.json());
  }

  private async pollVeoVideoUrl(operationName: string, apiKey: string): Promise<string> {
    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 8_000));
      const res = await fetch(veoOperationUrl(operationName, apiKey), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Veo status thất bại (${res.status}): ${text.slice(0, 180)}`);
      }
      const status = parseVeoStatus(await res.json());
      if (status.status === "failed") throw new Error(status.error || "Veo xử lý thất bại");
      if (status.status === "completed" && status.videoUrl) return status.videoUrl;
    }
    throw new Error("Veo quá hạn (hơn 10 phút). Thử lại sau.");
  }

  private async runVideoTranslate(
    video: Video,
    editId: string,
    options: AiEditOptions,
    ai: AiPort,
  ): Promise<VideoAiEditOutput> {
    const target = options.targetLanguage;
    if (!target) throw new Error("Chọn ngôn ngữ đích (targetLanguage).");
    await this.markStep(editId, "enhance");
    const heygenKey = heygenApiKey();
    if (heygenKey && video.storageKey) {
      try {
        const signed = await this.storage.createDownloadUrl({ key: video.storageKey, ttlSeconds: 3600 });
        if (signed.url.startsWith("https://")) {
          const remoteId = await this.startHeygenJob(
            HEYGEN_TRANSLATE_URL,
            buildHeygenTranslateBody({ videoUrl: signed.url, title: video.title, targetLanguage: target }),
            heygenKey,
          );
          const remoteUrl = await this.pollHeygenVideoUrl(remoteId, heygenKey);
          return this.persistRemoteMp4(
            video,
            editId,
            remoteUrl,
            "video_translate.mp4",
            `HeyGen Video Translate sang ${target} (lip-sync trên máy họ).`,
          );
        }
      } catch (err) {
        this.log.warn(`HeyGen translate fallback: ${err instanceof Error ? err.message : "error"}`);
      }
    }
    return this.renderLocalDub(video, editId, target, ai);
  }

  private async renderLocalDub(
    video: Video,
    editId: string,
    targetLanguage: string,
    ai: AiPort,
  ): Promise<VideoAiEditOutput> {
    const source = await this.openSourceFile(video);
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-dub-"));
    try {
      if (!(await this.probeHasAudio(source.path))) {
        throw new Error("Video không có tiếng giảng để dịch.");
      }
      const speech = await this.transcribeFromPath(source.path, ai);
      const sourceText = speech.text.replace(/\s+/g, " ").trim();
      if (!sourceText) throw new Error("Không nhận được lời nói. Thêm khóa Whisper hoặc nhập lại video rõ tiếng.");
      const translated = await ai.translateText({ text: sourceText, targetLanguage });
      const voicePath = path.join(dir, "dub.mp3");
      const spoken = await this.speakToFile(ai, translated.text, targetLanguage, voicePath);
      const outputPath = path.join(dir, "dub-out.mp4");
      await this.execFfmpeg(replaceAudioArgs(source.path, voicePath, outputPath));
      const key = buildObjectKey({
        appId: video.appId,
        type: "video-ai",
        id: editId,
        filename: "video_translate.mp4",
      });
      const sizeBytes = await this.persistFile(key, outputPath, "video/mp4");
      return {
        kind: "video",
        storageKey: key,
        contentType: "video/mp4",
        sizeBytes,
        durationMs: (await this.probeDurationMs(outputPath)) ?? video.durationMs ?? undefined,
        text: translated.text,
        providerNote: `Lồng tiếng mới (${spoken.provider} + ${translated.provider}), giữ hình gốc — miệng không khớp.`,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
      await source.cleanup();
    }
  }

  private async runOverdub(
    video: Video,
    editId: string,
    options: AiEditOptions,
    ai: AiPort,
  ): Promise<VideoAiEditOutput> {
    const script = (options.script || "").trim();
    if (!script) throw new Error("Overdub cần câu thay thế (script).");
    const source = await this.openSourceFile(video);
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-overdub-"));
    let clonedVoiceId: string | null = null;
    const elevenKey = elevenLabsApiKey();
    try {
      if (!(await this.probeHasAudio(source.path))) {
        throw new Error("Video không có tiếng để overdub.");
      }
      const durationMs = (await this.probeDurationMs(source.path)) ?? video.durationMs ?? 8_000;
      const defaultStart = Math.max(0, durationMs - 8_000);
      const range = clampQuickTrim(options.startMs ?? defaultStart, options.endMs ?? durationMs, durationMs);
      const startSec = range.startMs / 1000;
      const slotSec = Math.max(0.4, (range.endMs - range.startMs) / 1000);
      const afterSec = Math.max(0, durationMs / 1000 - range.endMs / 1000);
      await this.markStep(editId, "enhance");

      const samplePath = path.join(dir, "sample.m4a");
      const sampleStart = Math.max(0, startSec);
      const sampleDur = Math.min(20, Math.max(3, slotSec));
      await this.execFfmpeg(extractAudioSegmentArgs(source.path, samplePath, sampleStart, sampleDur));
      const sample = await readFile(samplePath);

      const spokenPath = path.join(dir, "spoken.mp3");
      let provider = "tts";
      let cloned = false;
      if (elevenKey) {
        try {
          clonedVoiceId = await elevenLabsCloneVoice({
            apiKey: elevenKey,
            name: `edu-overdub-${editId.slice(0, 8)}`,
            sample,
          });
          const bytes = await elevenLabsSpeak({ apiKey: elevenKey, text: script, voiceId: clonedVoiceId });
          await writeFile(spokenPath, bytes);
          provider = "elevenlabs";
          cloned = true;
        } catch (err) {
          this.log.warn(`ElevenLabs clone fallback: ${err instanceof Error ? err.message : "error"}`);
          try {
            const spoken = await this.speakToFile(ai, script, options.targetLanguage, spokenPath, {
              skipElevenLabs: true,
            });
            provider = spoken.provider;
          } catch {
            const spoken = await this.speakToFile(ai, script, options.targetLanguage, spokenPath);
            provider = spoken.provider;
          }
        }
      } else {
        const spoken = await this.speakToFile(ai, script, options.targetLanguage, spokenPath);
        provider = spoken.provider;
      }

      const spokenDur = (await this.probeDurationMs(spokenPath)) ?? slotSec * 1000;
      const tempo = atempoForFit(spokenDur / 1000, slotSec);
      const fittedPath = path.join(dir, "fitted.m4a");
      await this.execFfmpeg(fitAudioDurationArgs(spokenPath, fittedPath, slotSec, tempo));

      const parts: string[] = [];
      if (startSec >= 0.25) {
        const beforePath = path.join(dir, "before.m4a");
        await this.execFfmpeg(extractAudioSegmentArgs(source.path, beforePath, 0, startSec));
        parts.push(beforePath);
      }
      parts.push(fittedPath);
      if (afterSec >= 0.25) {
        const afterPath = path.join(dir, "after.m4a");
        await this.execFfmpeg(extractAudioSegmentArgs(source.path, afterPath, range.endMs / 1000, afterSec));
        parts.push(afterPath);
      }
      const mixedPath = path.join(dir, "mixed.m4a");
      if (parts.length === 1) {
        await writeFile(mixedPath, await readFile(fittedPath));
      } else {
        const listPath = path.join(dir, "audio.txt");
        await writeFile(listPath, this.audioConcatList(parts), "utf8");
        await this.execFfmpeg(concatAudioArgs(listPath, mixedPath));
      }
      const outputPath = path.join(dir, "overdub-out.mp4");
      await this.execFfmpeg(replaceAudioArgs(source.path, mixedPath, outputPath));
      const key = buildObjectKey({
        appId: video.appId,
        type: "video-ai",
        id: editId,
        filename: "overdub.mp4",
      });
      const sizeBytes = await this.persistFile(key, outputPath, "video/mp4");
      return {
        kind: "video",
        storageKey: key,
        contentType: "video/mp4",
        sizeBytes,
        durationMs: (await this.probeDurationMs(outputPath)) ?? durationMs,
        providerNote: cloned
          ? "Overdub bằng giọng clone tạm từ chính video (ElevenLabs). Voice clone đã xóa sau khi đọc."
          : `Overdub TTS giọng khác (${provider}) — chưa phải giọng giáo viên. Thêm ELEVENLABS_API_KEY để clone.`,
      };
    } finally {
      if (elevenKey && clonedVoiceId) {
        await elevenLabsDeleteVoice(elevenKey, clonedVoiceId);
      }
      await rm(dir, { recursive: true, force: true });
      await source.cleanup();
    }
  }

  private async transcribeFromPath(filePath: string, ai: AiPort): Promise<SpeechResult> {
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-speech-"));
    try {
      const speechPath = path.join(dir, "speech.mp3");
      await this.execFfmpeg(extractSpeechAudioArgs(filePath, speechPath));
      const audio = await readFile(speechPath);
      if (audio.length > 20 * 1024 * 1024) {
        throw new Error("Audio quá dài để nhận lời.");
      }
      return ai.transcribe({ bytes: audio, filename: "speech.mp3", mime: "audio/mpeg" });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async speakToFile(
    ai: AiPort,
    text: string,
    language: string | undefined,
    dest: string,
    opts?: { skipElevenLabs?: boolean },
  ): Promise<{ provider: string }> {
    const elevenKey = opts?.skipElevenLabs ? null : elevenLabsApiKey();
    if (elevenKey) {
      const bytes = await elevenLabsSpeak({ apiKey: elevenKey, text });
      await writeFile(dest, bytes);
      return { provider: "elevenlabs" };
    }
    const spoken = await ai.speak({ text, language });
    await writeFile(dest, spoken.bytes);
    return { provider: spoken.provider };
  }

  private async startHeygenJob(url: string, body: unknown, apiKey: string): Promise<string> {
    const res = await fetch(url, {
      method: "POST",
      headers: heygenHeaders(apiKey),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HeyGen thất bại (${res.status}): ${text.slice(0, 180)}`);
    }
    return parseHeygenVideoId(await res.json());
  }

  private async pollHeygenVideoUrl(videoId: string, apiKey: string): Promise<string> {
    const deadline = Date.now() + 8 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const res = await fetch(`${HEYGEN_STATUS_URL}?video_id=${encodeURIComponent(videoId)}`, {
        headers: heygenHeaders(apiKey),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HeyGen status thất bại (${res.status}): ${text.slice(0, 180)}`);
      }
      const status = parseHeygenStatus(await res.json());
      if (status.status === "failed") {
        throw new Error(status.error || "HeyGen xử lý thất bại");
      }
      if (status.status === "completed" && status.videoUrl) {
        return status.videoUrl;
      }
    }
    throw new Error("HeyGen quá hạn (hơn 8 phút). Thử lại sau.");
  }

  private async persistRemoteMp4(
    video: Video,
    editId: string,
    remoteUrl: string,
    filename: string,
    providerNote: string,
    googleKey?: string,
  ): Promise<VideoAiEditOutput> {
    const dir = await mkdtemp(path.join(tmpdir(), "edu-ai-remote-"));
    try {
      const outputPath = path.join(dir, "remote.mp4");
      await this.downloadRemoteFile(remoteUrl, outputPath, googleKey);
      const key = buildObjectKey({
        appId: video.appId,
        type: "video-ai",
        id: editId,
        filename,
      });
      const sizeBytes = await this.persistFile(key, outputPath, "video/mp4");
      return {
        kind: "video",
        storageKey: key,
        contentType: "video/mp4",
        sizeBytes,
        durationMs: (await this.probeDurationMs(outputPath)) ?? video.durationMs ?? undefined,
        providerNote,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async downloadRemoteFile(url: string, dest: string, googleKey?: string): Promise<void> {
    if (!isAllowedRemoteMediaUrl(url)) {
      throw new Error("Chỉ tải video từ máy chủ HeyGen / MiniMax / Google (https)");
    }
    const fetchUrl = googleKey ? withGoogleApiKey(url, googleKey) : url;
    const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(180_000), redirect: "follow" });
    if (!isAllowedRemoteMediaUrl(res.url)) {
      throw new Error("Máy chủ remote chuyển hướng tới host không hợp lệ");
    }
    if (!res.ok || !res.body) {
      throw new Error(`Tải video remote thất bại (${res.status})`);
    }
    const declared = Number(res.headers.get("content-length") || 0);
    if (declared > MAX_SOURCE_BYTES) {
      throw new Error("File remote quá lớn (tối đa 400MB)");
    }
    const nodeStream = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
    let seen = 0;
    nodeStream.on("data", (chunk: Buffer | string) => {
      seen += typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
      if (seen > MAX_SOURCE_BYTES) {
        nodeStream.destroy(new Error("File remote quá lớn (tối đa 400MB)"));
      }
    });
    await pipeline(nodeStream, createWriteStream(dest));
  }

  private audioConcatList(files: string[]): string {
    return `${files
      .map((file) => {
        const safe = file.replace(/\\/g, "/").replace(/'/g, "'\\''");
        return `file '${safe}'`;
      })
      .join("\n")}\n`;
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
    const heavy = isHeavyFfmpegEncode(args);
    if (heavy) await ffmpegEncodeGate.acquire();
    try {
      await execFileAsync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args], {
        timeout: 10 * 60 * 1000,
        maxBuffer: 8 * 1024 * 1024,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "ffmpeg failed";
      throw new Error(`ffmpeg thất bại: ${message.slice(0, 240)}`);
    } finally {
      if (heavy) ffmpegEncodeGate.release();
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

  private async firstExistingKey(keys: Array<string | null | undefined>): Promise<string | null> {
    for (const key of keys) {
      if (!key) continue;
      try {
        const head = await this.storage.head(key);
        if (head && head.sizeBytes > 0) return key;
      } catch {
        // try the next candidate
      }
    }
    return null;
  }

  private async presentEdit(edit: VideoAiEdit, fallbackStorageKey?: string | null) {
    const output = asOutput(edit.outputJson);
    let sourceKey = fallbackStorageKey ?? null;
    if (!sourceKey) {
      const video = await this.prisma.video.findUnique({
        where: { id: edit.videoId },
        select: { storageKey: true },
      });
      sourceKey = video?.storageKey ?? null;
    }
    const previewKey = await this.firstExistingKey([output?.storageKey, sourceKey]);
    const editionKey = await this.firstExistingKey([output?.editionStorageKey]);
    let previewUrl: string | null = null;
    let editionPreviewUrl: string | null = null;
    if (previewKey) {
      const signed = await this.storage.createDownloadUrl({
        key: previewKey,
        ttlSeconds: 600,
      });
      previewUrl = signed.url;
    }
    if (editionKey) {
      const signed = await this.storage.createDownloadUrl({
        key: editionKey,
        ttlSeconds: 600,
      });
      editionPreviewUrl = signed.url;
    }
    const tool = getAiEditTool(edit.tool);
    const fallback = progressForStatus(edit.status);
    const progress = output?.progress ?? fallback.progress;
    const step = output?.step ?? fallback.step;
    const stepLabel = output?.stepLabel ?? fallback.stepLabel;
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
      progress,
      step,
      stepLabel,
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
    thumbnailStorageKey: typeof rec.thumbnailStorageKey === "string" ? rec.thumbnailStorageKey : undefined,
    captionStorageKey: typeof rec.captionStorageKey === "string" ? rec.captionStorageKey : undefined,
    captionSizeBytes: typeof rec.captionSizeBytes === "number" ? rec.captionSizeBytes : undefined,
    autoApplyError: typeof rec.autoApplyError === "string" ? rec.autoApplyError : undefined,
    progress: typeof rec.progress === "number" && Number.isFinite(rec.progress) ? rec.progress : undefined,
    step: typeof rec.step === "string" ? rec.step : undefined,
    stepLabel: typeof rec.stepLabel === "string" ? rec.stepLabel : undefined,
    recipeId: typeof rec.recipeId === "string" ? rec.recipeId : undefined,
    techniques: parseTechniques(rec.techniques),
  };
}

function parseTechniques(value: unknown): RecipeTechnique[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows: RecipeTechnique[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.id !== "string" || typeof rec.source !== "string" || typeof rec.label !== "string") continue;
    if (rec.status !== "applied" && rec.status !== "skipped" && rec.status !== "refused") continue;
    rows.push({
      id: rec.id,
      source: rec.source,
      status: rec.status,
      label: rec.label,
      note: typeof rec.note === "string" ? rec.note : undefined,
    });
  }
  return rows.length > 0 ? rows : undefined;
}
