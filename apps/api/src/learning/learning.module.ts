import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { IsOptional, IsString, MinLength } from "class-validator";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

class BookmarkDto {
  @IsString()
  resourceType!: string;

  @IsString()
  resourceId!: string;
}

class NoteCreateDto {
  @IsString()
  resourceType!: string;

  @IsString()
  resourceId!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  anchorJson?: Record<string, unknown>;
}

class NoteUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  anchorJson?: Record<string, unknown>;
}

class WishlistDto {
  @IsString()
  productId!: string;
}

@Injectable()
export class LearningService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listBookmarks(user: RequestUser) {
    return this.prisma.bookmark.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async addBookmark(user: RequestUser, dto: BookmarkDto) {
    return this.prisma.bookmark.upsert({
      where: {
        userId_resourceType_resourceId: {
          userId: user.userId,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
        },
      },
      update: {},
      create: {
        userId: user.userId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
      },
    });
  }

  async removeBookmark(user: RequestUser, id: string) {
    const row = await this.prisma.bookmark.findFirst({
      where: { id, userId: user.userId },
    });
    if (!row) throw new AppError(ErrorCodes.NOT_FOUND, "Bookmark not found", 404);
    await this.prisma.bookmark.delete({ where: { id } });
    return { ok: true };
  }

  listNotes(
    user: RequestUser,
    q: { resourceType?: string; resourceId?: string },
  ) {
    return this.prisma.note.findMany({
      where: {
        userId: user.userId,
        ...(q.resourceType ? { resourceType: q.resourceType } : {}),
        ...(q.resourceId ? { resourceId: q.resourceId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
  }

  createNote(user: RequestUser, dto: NoteCreateDto) {
    return this.prisma.note.create({
      data: {
        userId: user.userId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        body: dto.body,
        anchorJson: (dto.anchorJson ?? {}) as object,
      },
    });
  }

  async updateNote(user: RequestUser, id: string, dto: NoteUpdateDto) {
    const row = await this.prisma.note.findFirst({
      where: { id, userId: user.userId },
    });
    if (!row) throw new AppError(ErrorCodes.NOT_FOUND, "Note not found", 404);
    return this.prisma.note.update({
      where: { id },
      data: {
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.anchorJson !== undefined ? { anchorJson: dto.anchorJson as object } : {}),
      },
    });
  }

  async deleteNote(user: RequestUser, id: string) {
    const row = await this.prisma.note.findFirst({
      where: { id, userId: user.userId },
    });
    if (!row) throw new AppError(ErrorCodes.NOT_FOUND, "Note not found", 404);
    await this.prisma.note.delete({ where: { id } });
    return { ok: true };
  }

  listWishlist(user: RequestUser) {
    return this.prisma.wishlistItem.findMany({
      where: { userId: user.userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            status: true,
            prices: { orderBy: { validFrom: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async addWishlist(user: RequestUser, dto: WishlistDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, appId: user.appId },
    });
    if (!product) throw new AppError(ErrorCodes.NOT_FOUND, "Product not found", 404);
    return this.prisma.wishlistItem.upsert({
      where: {
        userId_productId: { userId: user.userId, productId: dto.productId },
      },
      update: {},
      create: { userId: user.userId, productId: dto.productId },
    });
  }

  async removeWishlist(user: RequestUser, productId: string) {
    const row = await this.prisma.wishlistItem.findFirst({
      where: { userId: user.userId, productId },
    });
    if (!row) throw new AppError(ErrorCodes.NOT_FOUND, "Wishlist item not found", 404);
    await this.prisma.wishlistItem.delete({ where: { id: row.id } });
    return { ok: true };
  }
}

@Controller()
export class LearningController {
  constructor(@Inject(LearningService) private readonly learning: LearningService) {}

  @Get("bookmarks")
  @UseGuards(AuthGuard)
  bookmarks(@CurrentUser() user: RequestUser) {
    return this.learning.listBookmarks(user);
  }

  @Post("bookmarks")
  @UseGuards(AuthGuard)
  addBookmark(@CurrentUser() user: RequestUser, @Body() dto: BookmarkDto) {
    return this.learning.addBookmark(user, dto);
  }

  @Delete("bookmarks/:id")
  @UseGuards(AuthGuard)
  removeBookmark(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.learning.removeBookmark(user, id);
  }

  @Get("notes")
  @UseGuards(AuthGuard)
  notes(
    @CurrentUser() user: RequestUser,
    @Query("resourceType") resourceType?: string,
    @Query("resourceId") resourceId?: string,
  ) {
    return this.learning.listNotes(user, { resourceType, resourceId });
  }

  @Post("notes")
  @UseGuards(AuthGuard)
  createNote(@CurrentUser() user: RequestUser, @Body() dto: NoteCreateDto) {
    return this.learning.createNote(user, dto);
  }

  @Patch("notes/:id")
  @UseGuards(AuthGuard)
  updateNote(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: NoteUpdateDto,
  ) {
    return this.learning.updateNote(user, id, dto);
  }

  @Delete("notes/:id")
  @UseGuards(AuthGuard)
  deleteNote(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.learning.deleteNote(user, id);
  }

  @Get("wishlist")
  @UseGuards(AuthGuard)
  wishlist(@CurrentUser() user: RequestUser) {
    return this.learning.listWishlist(user);
  }

  @Post("wishlist")
  @UseGuards(AuthGuard)
  addWishlist(@CurrentUser() user: RequestUser, @Body() dto: WishlistDto) {
    return this.learning.addWishlist(user, dto);
  }

  @Delete("wishlist/:productId")
  @UseGuards(AuthGuard)
  removeWishlist(@CurrentUser() user: RequestUser, @Param("productId") productId: string) {
    return this.learning.removeWishlist(user, productId);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [LearningController],
  providers: [LearningService],
})
export class LearningModule {}
