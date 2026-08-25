import { Controller, Get, Injectable, Module, Param, Query, Req, Inject } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { AuthModule } from "../auth/auth.module";

@Injectable()
export class CatalogService {
  constructor(
  @Inject(PrismaService) private readonly prisma: PrismaService,
) {}

  private async appId(header?: string) {
    const slug = header || process.env.APP_ID || "education_app";
    const app = await this.prisma.app.findFirst({ where: { OR: [{ id: slug }, { slug }] } });
    if (!app) throw new AppError(ErrorCodes.NOT_FOUND, "App not found", 404);
    return app.id;
  }

  async listProducts(appHeader?: string, cursor?: string, limit = 20) {
    const appId = await this.appId(appHeader);
    const items = await this.prisma.product.findMany({
      where: { appId, status: "PUBLISHED", visibility: "PUBLIC" },
      include: { prices: { orderBy: { validFrom: "desc" }, take: 1 }, category: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    return {
      items: page.map((p) => ({
        id: p.id,
        type: p.type,
        name: p.name,
        slug: p.slug,
        description: p.description,
        thumbnailUrl: p.thumbnailUrl,
        category: p.category?.slug ?? null,
        price: p.prices[0]
          ? { currency: p.prices[0].currency, amountMinor: p.prices[0].amountMinor, compareAtMinor: p.prices[0].compareAtMinor }
          : null,
      })),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      hasMore,
    };
  }

  async getBySlug(slug: string, appHeader?: string) {
    const appId = await this.appId(appHeader);
    const p = await this.prisma.product.findUnique({
      where: { appId_slug: { appId, slug } },
      include: {
        prices: { orderBy: { validFrom: "desc" }, take: 1 },
        category: true,
        course: {
          include: {
            sections: {
              include: {
                lessons: {
                  include: { contents: { orderBy: { position: "asc" } } },
                  orderBy: { position: "asc" },
                },
              },
              orderBy: { position: "asc" },
            },
          },
        },
        document: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } },
        bundle: {
          include: {
            items: {
              orderBy: { position: "asc" },
              include: {
                product: {
                  include: { prices: { orderBy: { validFrom: "desc" }, take: 1 } },
                },
              },
            },
          },
        },
      },
    });
    if (!p || p.status !== "PUBLISHED") {
      throw new AppError(ErrorCodes.NOT_FOUND, "Product not found", 404);
    }
    return {
      ...p,
      course: p.course
        ? {
            ...p.course,
            sections: p.course.sections.map((s) => ({
              ...s,
              lessons: s.lessons.map((l) => ({
                ...l,
                contents: l.contents.map((c) => ({
                  id: c.id,
                  contentType: c.contentType,
                  position: c.position,
                })),
              })),
            })),
          }
        : null,
      bundleChildren:
        p.bundle?.items.map((item) => ({
          productId: item.productId,
          position: item.position,
          type: item.product.type,
          name: item.product.name,
          slug: item.product.slug,
          description: item.product.description,
          price: item.product.prices[0]
            ? {
                currency: item.product.prices[0].currency,
                amountMinor: item.product.prices[0].amountMinor,
              }
            : null,
        })) ?? [],
    };
  }

  async categories(appHeader?: string) {
    const appId = await this.appId(appHeader);
    return this.prisma.category.findMany({ where: { appId }, orderBy: { name: "asc" } });
  }

  async search(q: string, appHeader?: string) {
    const appId = await this.appId(appHeader);
    const items = await this.prisma.product.findMany({
      where: {
        appId,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 30,
      include: { prices: { take: 1, orderBy: { validFrom: "desc" } } },
    });
    return { items };
  }
}

@Controller()
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get("products")
  list(
    @Req() req: { headers: Record<string, string | undefined> },
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return this.catalog.listProducts(req.headers["x-app-id"], cursor, limit ? Number(limit) : 20);
  }

  @Get("products/:slug")
  get(@Param("slug") slug: string, @Req() req: { headers: Record<string, string | undefined> }) {
    return this.catalog.getBySlug(slug, req.headers["x-app-id"]);
  }

  @Get("categories")
  categories(@Req() req: { headers: Record<string, string | undefined> }) {
    return this.catalog.categories(req.headers["x-app-id"]);
  }

  @Get("search")
  search(@Query("q") q: string, @Req() req: { headers: Record<string, string | undefined> }) {
    return this.catalog.search(q || "", req.headers["x-app-id"]);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
