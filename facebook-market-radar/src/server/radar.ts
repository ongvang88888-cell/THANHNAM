import { GoogleCseListingProvider } from "../adapters/google-cse";
import { LazadaOpenApiProvider } from "../adapters/lazada-open-api";
import { PrismaRadarRepository } from "../adapters/prisma-repository";
import { ShopeeOpenApiProvider } from "../adapters/shopee-open-api";
import { TiktokShopApiProvider } from "../adapters/tiktok-shop-api";
import { YoutubeDataApiProvider } from "../adapters/youtube-data-api";
import { RadarService, DEFAULT_APP_ID } from "../application/radar-service";
import { getPrisma } from "./prisma";

export function getRadarService(): RadarService {
  const youtube = new YoutubeDataApiProvider(process.env.YOUTUBE_API_KEY);
  return new RadarService(
    new PrismaRadarRepository(getPrisma()),
    process.env.FMR_APP_ID ?? DEFAULT_APP_ID,
    youtube,
    {
      youtubeSearch: youtube,
      listingSearch: new GoogleCseListingProvider(
        process.env.GOOGLE_CSE_KEY ?? process.env.GOOGLE_API_KEY,
        process.env.GOOGLE_CSE_CX,
      ),
      ownShops: [
        new ShopeeOpenApiProvider({
          partnerId: process.env.SHOPEE_PARTNER_ID,
          partnerKey: process.env.SHOPEE_PARTNER_KEY,
          shopId: process.env.SHOPEE_SHOP_ID,
          accessToken: process.env.SHOPEE_ACCESS_TOKEN,
        }),
        new LazadaOpenApiProvider({
          appKey: process.env.LAZADA_APP_KEY,
          appSecret: process.env.LAZADA_APP_SECRET,
          accessToken: process.env.LAZADA_ACCESS_TOKEN,
          sellerId: process.env.LAZADA_SELLER_ID,
        }),
        new TiktokShopApiProvider({
          appKey: process.env.TIKTOK_SHOP_APP_KEY,
          appSecret: process.env.TIKTOK_SHOP_APP_SECRET,
          accessToken: process.env.TIKTOK_SHOP_ACCESS_TOKEN,
          shopId: process.env.TIKTOK_SHOP_ID,
        }),
      ],
    },
  );
}

export function collectKeyFromRequest(header: string | null): string | null {
  return header;
}

export function expectedCollectKey(): string | undefined {
  return process.env.FMR_COLLECT_KEY;
}
