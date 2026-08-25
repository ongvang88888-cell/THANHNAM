import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

class ReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  body?: string;
}

@Injectable()
export class ReviewsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(productId: string) {
    return this.prisma.review.findMany({
      where: { productId, status: "VISIBLE" },
      include: { user: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async upsert(user: RequestUser, productId: string, dto: ReviewDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, appId: user.appId },
    });
    if (!product) throw new AppError(ErrorCodes.NOT_FOUND, "Product not found", 404);
    const owned = await this.prisma.entitlement.findFirst({
      where: {
        userId: user.userId,
        resourceType: "product",
        resourceId: productId,
        status: "ACTIVE",
      },
    });
    if (!owned) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Only purchasers can review", 403);
    }
    return this.prisma.review.upsert({
      where: { productId_userId: { productId, userId: user.userId } },
      update: { rating: dto.rating, body: dto.body ?? "" },
      create: {
        productId,
        userId: user.userId,
        rating: dto.rating,
        body: dto.body ?? "",
      },
    });
  }
}

@Controller("products")
export class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly reviews: ReviewsService) {}

  @Get(":id/reviews")
  list(@Param("id") id: string) {
    return this.reviews.list(id);
  }

  @Post(":id/reviews")
  @UseGuards(AuthGuard)
  create(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: ReviewDto,
  ) {
    return this.reviews.upsert(user, id, dto);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
