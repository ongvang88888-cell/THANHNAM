import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Put,
  Query,
  Headers,
  Req,
  Res,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { IsInt, IsOptional, IsString, Min } from "class-validator";
import {
  createStorageFromEnv,
  createTranscodeFromEnv,
  assertAllowedMime,
  buildObjectKey,
  getSharedMemoryStorage,
  verifyLocalMedia,
  type IStorageProvider,
  type TranscodePort,
} from "@edu/media-core";
import { allowLocalMedia, isProduction } from "../common/runtime";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AccessService } from "../access/access.module";
import { AccessModule } from "../access/access.module";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";
import { VideoAiEditController } from "./video-ai-edit.controller";
import { VideoAiEditService } from "./video-ai-edit.service";

class UploadSessionDto {
  @IsString()
  filename!: string;

  @IsString()
  contentType!: string;

  @IsString()
  title!: string;
}

class DocumentUploadDto {
  @IsString()
  documentId!: string;

  @IsString()
  filename!: string;

  @IsString()
  contentType!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;
}

class PlaybackDto {
  @IsString()
  lessonId!: string;
}

class CompleteUploadDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;
}

@Injectable()
export class MediaService {
  private storage: IStorageProvider = createStorageFromEnv();
  private transcode: TranscodePort = createTranscodeFromEnv();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AccessService) private readonly access: AccessService,
  ) {}

  private assertTeacher(user: RequestUser) {
    if (!hasAnyRole(user as never, ["teacher", "admin", "super_admin"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Teacher only", 403);
    }
  }

  async createVideoUpload(user: RequestUser, dto: UploadSessionDto) {
    this.assertTeacher(user);
    try {
      assertAllowedMime(dto.contentType);
    } catch {
      throw new AppError(ErrorCodes.VALIDATION, `MIME not allowed: ${dto.contentType}`, 400);
    }
    const video = await this.prisma.video.create({
      data: {
        appId: user.appId,
        ownerUserId: user.userId,
        title: dto.title,
        status: "UPLOADING",
      },
    });
    const key = buildObjectKey({
      appId: user.appId,
      type: "videos",
      id: video.id,
      filename: dto.filename,
    });
    const upload = await this.storage.createUploadUrl({
      key,
      contentType: dto.contentType,
      ttlSeconds: 900,
    });
    await this.prisma.video.update({
      where: { id: video.id },
      data: { storageKey: key, status: "QUEUED" },
    });
    await this.prisma.videoProcessingJob.create({
      data: {
        videoId: video.id,
        provider: process.env.MEDIACONVERT_ENDPOINT ? "mediaconvert" : "local",
        status: "QUEUED",
      },
    });
    await this.transcode.enqueue({
      videoId: video.id,
      sourceKey: key,
      outputPrefix: `app/${user.appId}/renditions/${video.id}`,
    });
    return {
      videoId: video.id,
      upload,
      next: "PUT bytes to upload.url then POST /videos/:id/complete",
    };
  }

  async completeVideoUpload(user: RequestUser, videoId: string, dto: CompleteUploadDto) {
    this.assertTeacher(user);
    const video = await this.prisma.video.findFirst({
      where: { id: String(videoId), appId: user.appId, ownerUserId: user.userId },
    });
    if (!video || !video.storageKey) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Video upload not found", 404);
    }

    // Prefer real object head when storage supports it; memory provider always has the key.
    const head = await this.storage.head(video.storageKey);
    const sizeBytes = BigInt(dto.sizeBytes ?? head?.sizeBytes ?? 0);

    const assetKey = `${video.storageKey}.m3u8`;
    await this.prisma.videoAsset.deleteMany({ where: { videoId: video.id } });
    await this.prisma.videoAsset.create({
      data: {
        videoId: video.id,
        quality: "720p",
        format: "hls",
        storageKey: assetKey,
        sizeBytes,
      },
    });
    await this.prisma.video.update({
      where: { id: video.id },
      data: { status: "READY" },
    });
    await this.prisma.videoProcessingJob.updateMany({
      where: { videoId: video.id, status: "QUEUED" },
      data: { status: "READY" },
    });
    return { videoId: video.id, status: "READY" };
  }

  async createDocumentUpload(user: RequestUser, dto: DocumentUploadDto) {
    this.assertTeacher(user);
    try {
      assertAllowedMime(dto.contentType);
    } catch {
      throw new AppError(ErrorCodes.VALIDATION, `MIME not allowed: ${dto.contentType}`, 400);
    }
    const document = await this.prisma.document.findFirst({
      where: {
        id: String(dto.documentId),
        appId: user.appId,
        ownerUserId: user.userId,
      },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!document) throw new AppError(ErrorCodes.NOT_FOUND, "Document not found", 404);

    const nextVersion = (document.versions[0]?.version ?? 0) + 1;
    const key = buildObjectKey({
      appId: user.appId,
      type: "documents",
      id: `${document.id}-v${nextVersion}`,
      filename: dto.filename,
    });
    const upload = await this.storage.createUploadUrl({
      key,
      contentType: dto.contentType,
      ttlSeconds: 900,
    });
    const version = await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version: nextVersion,
        storageKey: key,
        mime: dto.contentType,
        sizeBytes: BigInt(dto.sizeBytes ?? 0),
      },
    });
    return {
      documentId: document.id,
      versionId: version.id,
      version: nextVersion,
      upload,
      next: "PUT bytes to upload.url then POST /documents/versions/:versionId/complete",
    };
  }

  async completeDocumentUpload(user: RequestUser, versionId: string, dto: CompleteUploadDto) {
    this.assertTeacher(user);
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: String(versionId) },
      include: { document: true },
    });
    if (!version || version.document.appId !== user.appId || version.document.ownerUserId !== user.userId) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Document version not found", 404);
    }
    const head = await this.storage.head(version.storageKey);
    await this.prisma.documentVersion.update({
      where: { id: version.id },
      data: { sizeBytes: BigInt(dto.sizeBytes ?? head?.sizeBytes ?? version.sizeBytes) },
    });
    return { versionId: version.id, documentId: version.documentId, ok: true };
  }

  async playback(user: RequestUser, videoId: string, lessonId: string) {
    const decision = await this.access.evaluateLesson(user, lessonId);
    if (decision.code !== "CAN_ACCESS") {
      throw new AppError(decision.code, "Playback not allowed", 403, decision as never);
    }
    const video = await this.prisma.video.findUnique({
      where: { id: String(videoId) },
      include: { assets: true },
    });
    if (!video || video.status !== "READY") {
      throw new AppError(ErrorCodes.NOT_FOUND, "Video not ready", 404);
    }
    const asset = video.assets[0];
    if (!asset) throw new AppError(ErrorCodes.NOT_FOUND, "No rendition", 404);
    const signed = await this.storage.createDownloadUrl({
      key: asset.storageKey,
      ttlSeconds: 600,
    });
    return {
      videoId,
      quality: asset.quality,
      format: asset.format,
      playbackUrl: signed.url,
      expiresAt: signed.expiresAt,
      access: decision,
    };
  }

  async documentContent(user: RequestUser, documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: String(documentId) },
      include: { versions: { orderBy: { version: "desc" }, take: 1 }, product: true },
    });
    if (!doc) throw new AppError(ErrorCodes.NOT_FOUND, "Document not found", 404);

    const isOwner = doc.ownerUserId === user.userId;
    const isAdmin = hasAnyRole(user as never, ["admin", "super_admin"]);
    if (!isOwner && !isAdmin) {
      let allowed = false;
      if (doc.productId) {
        const entitlement = await this.prisma.entitlement.findFirst({
          where: {
            userId: user.userId,
            status: "ACTIVE",
            resourceType: "product",
            resourceId: doc.productId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        });
        if (entitlement) allowed = true;
      }
      if (!allowed) {
        const refs = await this.prisma.lessonContent.findMany({
          where: { contentType: "DOCUMENT", refId: doc.id },
          select: { lessonId: true },
          take: 20,
        });
        for (const ref of refs) {
          const decision = await this.access.evaluateLesson(user, ref.lessonId);
          if (decision.code === "CAN_ACCESS") {
            allowed = true;
            break;
          }
        }
      }
      if (!allowed) {
        if (doc.productId) {
          throw new AppError(ErrorCodes.NEEDS_PURCHASE, "Purchase required", 403, {
            productIds: [doc.productId],
          });
        }
        throw new AppError(ErrorCodes.FORBIDDEN, "Document is not available", 403);
      }
    }

    const version = doc.versions[0];
    if (!version) throw new AppError(ErrorCodes.NOT_FOUND, "No document version", 404);
    const signed = await this.storage.createDownloadUrl({
      key: version.storageKey,
      ttlSeconds: 600,
    });
    return {
      documentId,
      title: doc.title,
      mime: version.mime,
      version: version.version,
      url: signed.url,
      expiresAt: signed.expiresAt,
    };
  }

  async markVideoReadyFromJob(videoId: string, playlistPath?: string) {
    const video = await this.prisma.video.findUnique({ where: { id: String(videoId) } });
    if (!video) return null;
    const assetKey =
      playlistPath?.replace(/^s3:\/\/[^/]+\//, "") ||
      (video.storageKey ? `${video.storageKey}.m3u8` : `renditions/${video.id}/index.m3u8`);
    await this.prisma.videoAsset.deleteMany({ where: { videoId: video.id } });
    await this.prisma.videoAsset.create({
      data: {
        videoId: video.id,
        quality: "720p",
        format: "hls",
        storageKey: assetKey,
        sizeBytes: BigInt(0),
      },
    });
    await this.prisma.video.update({ where: { id: video.id }, data: { status: "READY" } });
    await this.prisma.videoProcessingJob.updateMany({
      where: { videoId: video.id, status: { in: ["QUEUED", "PROCESSING"] } },
      data: { status: "READY" },
    });
    return { videoId: video.id, status: "READY" };
  }

  async markVideoFailed(videoId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: String(videoId) } });
    if (!video) return null;
    await this.prisma.video.update({
      where: { id: video.id },
      data: { status: "FAILED" },
    });
    await this.prisma.videoProcessingJob.updateMany({
      where: { videoId: video.id, status: { in: ["QUEUED", "PROCESSING"] } },
      data: { status: "FAILED", error: "MediaConvert ERROR" },
    });
    return { videoId: video.id, status: "FAILED" };
  }
}

function readUploadedBytes(req: { body?: unknown; rawBody?: Buffer }): Buffer {
  if (Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0) return req.rawBody;
  if (Buffer.isBuffer(req.body)) return req.body;
  return Buffer.alloc(0);
}

@SkipThrottle()
@Controller("media/local")
export class LocalMediaController {
  private assertSigned(key: string, exp: string | undefined, sig: string | undefined) {
    if (!allowLocalMedia()) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Local media disabled", 404);
    }
    if (!verifyLocalMedia(key, Number(exp), sig)) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Invalid or expired media signature", 403);
    }
  }

  @Put()
  put(
    @Query("key") key: string,
    @Query("exp") exp: string | undefined,
    @Query("sig") sig: string | undefined,
    @Req() req: { headers: Record<string, string | undefined>; body?: unknown; rawBody?: Buffer },
  ) {
    if (!key) throw new AppError(ErrorCodes.VALIDATION, "Missing key", 400);
    this.assertSigned(key, exp, sig);
    const storage = getSharedMemoryStorage();
    const bytes = readUploadedBytes(req);
    storage.put(key, bytes, req.headers["content-type"] || "application/octet-stream");
    return { ok: true, key, sizeBytes: bytes.length };
  }

  @Get()
  get(
    @Query("key") key: string,
    @Query("exp") exp: string | undefined,
    @Query("sig") sig: string | undefined,
    @Res()
    res: {
      setHeader: (k: string, v: string) => void;
      status: (n: number) => { send: (b: Buffer | string) => void };
    },
  ) {
    try {
      if (!key) throw new AppError(ErrorCodes.VALIDATION, "Missing key", 400);
      this.assertSigned(key, exp, sig);
    } catch (e) {
      const status = e instanceof AppError ? e.status : 403;
      res.status(status).send(e instanceof Error ? e.message : "Forbidden");
      return;
    }
    const storage = getSharedMemoryStorage();
    const obj = storage.get(key);
    if (!obj) {
      res.status(404).send("Not found");
      return;
    }
    res.setHeader("Content-Type", obj.contentType);
    res.setHeader("Cache-Control", "private, max-age=60");
    res.status(200).send(obj.bytes);
  }
}

@Controller()
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Post("videos/upload-sessions")
  @UseGuards(AuthGuard)
  upload(@CurrentUser() user: RequestUser, @Body() dto: UploadSessionDto) {
    return this.media.createVideoUpload(user, dto);
  }

  @Post("videos/:id/complete")
  @UseGuards(AuthGuard)
  completeVideo(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: CompleteUploadDto,
  ) {
    return this.media.completeVideoUpload(user, id, dto);
  }

  @Post("documents/upload-sessions")
  @UseGuards(AuthGuard)
  documentUpload(@CurrentUser() user: RequestUser, @Body() dto: DocumentUploadDto) {
    return this.media.createDocumentUpload(user, dto);
  }

  @Post("documents/versions/:versionId/complete")
  @UseGuards(AuthGuard)
  completeDocument(
    @CurrentUser() user: RequestUser,
    @Param("versionId") versionId: string,
    @Body() dto: CompleteUploadDto,
  ) {
    return this.media.completeDocumentUpload(user, versionId, dto);
  }

  @Post("videos/:id/playback")
  @UseGuards(AuthGuard)
  playback(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: PlaybackDto,
  ) {
    return this.media.playback(user, id, dto.lessonId);
  }

  @Post("documents/:id/content")
  @UseGuards(AuthGuard)
  document(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.media.documentContent(user, id);
  }

  @Post("media/webhooks/mediaconvert")
  async mediaConvertWebhook(
    @Req() req: { body: Buffer | object; rawBody?: Buffer },
    @Headers("x-webhook-secret") webhookSecret?: string,
  ) {
    const expected = process.env.MEDIA_WEBHOOK_SECRET || "";
    if (isProduction() && !expected) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Media webhook is not configured", 401);
    }
    if (expected && webhookSecret !== expected) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Invalid media webhook secret", 401);
    }
    const raw =
      req.rawBody?.toString("utf8") ??
      (Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body));
    let payload: {
      detail?: { status?: string; userMetadata?: { videoId?: string }; outputGroupDetails?: Array<{ playlistFilePaths?: string[] }> };
      Message?: string;
    };
    try {
      payload = JSON.parse(raw) as typeof payload;
      if (payload.Message) {
        payload = JSON.parse(payload.Message) as typeof payload;
      }
    } catch {
      throw new AppError(ErrorCodes.VALIDATION, "Invalid MediaConvert webhook body", 400);
    }
    const detail = payload.detail;
    const videoId = detail?.userMetadata?.videoId;
    if (!videoId) return { ok: true, ignored: true };
    if (detail?.status === "COMPLETE") {
      const playlist = detail.outputGroupDetails?.[0]?.playlistFilePaths?.[0];
      const result = await this.media.markVideoReadyFromJob(videoId, playlist);
      if (!result) return { ok: true, ignored: true, reason: "video_not_found", videoId };
      return { ok: true, videoId, status: "READY" };
    }
    if (detail?.status === "ERROR") {
      const result = await this.media.markVideoFailed(videoId);
      if (!result) return { ok: true, ignored: true, reason: "video_not_found", videoId };
      return { ok: true, videoId, status: "FAILED" };
    }
    return { ok: true, videoId, status: detail?.status };
  }
}

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [MediaController, LocalMediaController, VideoAiEditController],
  providers: [MediaService, VideoAiEditService],
})
export class MediaModule {}
