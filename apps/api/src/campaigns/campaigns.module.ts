import {
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Module,
  Post,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { IsArray, IsDateString, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { computeCouponDiscountMinor } from "@edu/monetization-core";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  slug!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  percentOff?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountOffMinor?: number;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  badgeText?: string;

  @IsArray()
  productIds!: string[];
}

@Injectable()
export class CampaignsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resolveAppId(header?: string) {
    const slug = header || process.env.APP_ID || "education_app";
    const app = await this.prisma.app.findFirst({
      where: { OR: [{ id: slug }, { slug }] },
    });
    if (!app) throw new AppError(ErrorCodes.NOT_FOUND, "App not found", 404);
    return app.id;
  }

  async activeForProduct(appId: string, productId: string, now = new Date()) {
    return this.prisma.promotionCampaign.findFirst({
      where: {
        appId,
        enabled: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
        products: { some: { productId } },
      },
      orderBy: { startsAt: "desc" },
    });
  }

  discountForCampaign(
    campaign: { percentOff: number | null; amountOffMinor: number | null; enabled: boolean },
    listPrice: number,
  ) {
    return computeCouponDiscountMinor(
      {
        enabled: campaign.enabled,
        percentOff: campaign.percentOff,
        amountOffMinor: campaign.amountOffMinor,
      },
      listPrice,
    );
  }

  async listActive(appId: string, now = new Date()) {
    return this.prisma.promotionCampaign.findMany({
      where: {
        appId,
        enabled: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: {
        products: { include: { product: { select: { id: true, slug: true, name: true } } } },
      },
      orderBy: { endsAt: "asc" },
    });
  }

  async create(actor: RequestUser, dto: CreateCampaignDto) {
    if (!hasAnyRole(actor as never, ["admin", "super_admin"])) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Admin only", 403);
    }
    if (!dto.percentOff && !dto.amountOffMinor) {
      throw new AppError(ErrorCodes.VALIDATION, "percentOff or amountOffMinor required", 400);
    }
    return this.prisma.promotionCampaign.create({
      data: {
        appId: actor.appId,
        name: dto.name,
        slug: dto.slug.trim().toLowerCase(),
        percentOff: dto.percentOff ?? null,
        amountOffMinor: dto.amountOffMinor ?? null,
        badgeText: dto.badgeText || "Flash sale",
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        products: {
          create: dto.productIds.map((productId) => ({ productId })),
        },
      },
      include: { products: true },
    });
  }
}

@Controller()
export class CampaignsController {
  constructor(@Inject(CampaignsService) private readonly campaigns: CampaignsService) {}

  @Get("campaigns/active")
  async active(@Headers("x-app-id") appHeader?: string) {
    const appId = await this.campaigns.resolveAppId(appHeader);
    return this.campaigns.listActive(appId);
  }

  @Post("admin/campaigns")
  @UseGuards(AuthGuard)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(user, dto);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
