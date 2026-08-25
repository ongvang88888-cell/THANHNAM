import { Body, Controller, Injectable, Module, Param, Post, UseGuards, Inject } from "@nestjs/common";
import { IsString } from "class-validator";
import {
  createStorageFromEnv,
  createTranscodeFromEnv,
  assertAllowedMime,
  buildObjectKey,
  type IStorageProvider,
  type TranscodePort,
} from "@edu/media-core";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AccessService } from "../access/access.module";
import { AccessModule } from "../access/access.module";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

class UploadSessionDto {
  @IsString()
  filename!: string;

  @IsString()
  contentType!: string;

  @IsString()
  title!: string;
}

class PlaybackDto {
  @IsString()
  lessonId!: string;
}

@Injectable()
export class MediaService {
  private storage: IStorageProvider = createStorageFromEnv();
  private transcode: TranscodePort = createTranscodeFromEnv();

  constructor(
  @Inject(PrismaService) private readonly prisma: PrismaService,
  @Inject(AccessService) private readonly access: AccessService,
) {}

  async createVideoUpload(user: RequestUser, dto: UploadSessionDto) {
    assertAllowedMime(dto.contentType);
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
        provider: "mediaconvert",
        status: "QUEUED",
      },
    });
    await this.transcode.enqueue({
      videoId: video.id,
      sourceKey: key,
      outputPrefix: `app/${user.appId}/renditions/${video.id}`,
    });
    // Local: mark ready immediately for demo playback token flow
    await this.prisma.video.update({ where: { id: video.id }, data: { status: "READY" } });
    await this.prisma.videoAsset.create({
      data: {
        videoId: video.id,
        quality: "720p",
        format: "hls",
        storageKey: `${key}.m3u8`,
        sizeBytes: BigInt(0),
      },
    });
    return { videoId: video.id, upload };
  }

  async playback(user: RequestUser, videoId: string, lessonId: string) {
    const decision = await this.access.evaluateLesson(user, lessonId);
    if (decision.code !== "CAN_ACCESS") {
      throw new AppError(decision.code, "Playback not allowed", 403, decision as never);
    }
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
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
      where: { id: documentId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 }, product: true },
    });
    if (!doc) throw new AppError(ErrorCodes.NOT_FOUND, "Document not found", 404);

    if (doc.productId) {
      const entitlement = await this.prisma.entitlement.findFirst({
        where: {
          userId: user.userId,
          status: "ACTIVE",
          resourceType: "product",
          resourceId: doc.productId,
        },
      });
      if (!entitlement) {
        throw new AppError(ErrorCodes.NEEDS_PURCHASE, "Purchase required", 403, {
          productIds: [doc.productId],
        });
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
      mime: version.mime,
      url: signed.url,
      expiresAt: signed.expiresAt,
    };
  }
}

@Controller()
export class MediaController {
  constructor(
  @Inject(MediaService) private readonly media: MediaService,
) {}

  @Post("videos/upload-sessions")
  @UseGuards(AuthGuard)
  upload(@CurrentUser() user: RequestUser, @Body() dto: UploadSessionDto) {
    return this.media.createVideoUpload(user, dto);
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
}

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
