import { GoogleCseListingProvider } from "../adapters/google-cse";
import { LazadaOpenApiProvider } from "../adapters/lazada-open-api";
import { PrismaRadarRepository } from "../adapters/prisma-repository";
import { ShopeeOpenApiProvider } from "../adapters/shopee-open-api";
import { TiktokShopApiProvider } from "../adapters/tiktok-shop-api";
import { YoutubeDataApiProvider } from "../adapters/youtube-data-api";
import { RadarService, DEFAULT_APP_ID } from "../application/radar-service";
import { getPrisma } from "./prisma";
import { resolvedPlatformSecrets } from "./platform-secrets-store";

export function getRadarService(): RadarService {
  const secrets = resolvedPlatformSecrets();
  const youtube = new YoutubeDataApiProvider(secrets.YOUTUBE_API_KEY);
  return new RadarService(
    new PrismaRadarRepository(getPrisma()),
    process.env.FMR_APP_ID ?? DEFAULT_APP_ID,
    youtube,
    {
      youtubeSearch: youtube,
      listingSearch: new GoogleCseListingProvider(
        secrets.GOOGLE_CSE_KEY ?? secrets.GOOGLE_API_KEY,
        secrets.GOOGLE_CSE_CX,
      ),
      ownShops: [
        new ShopeeOpenApiProvider({
          partnerId: secrets.SHOPEE_PARTNER_ID,
          partnerKey: secrets.SHOPEE_PARTNER_KEY,
          shopId: secrets.SHOPEE_SHOP_ID,
          accessToken: secrets.SHOPEE_ACCESS_TOKEN,
        }),
        new LazadaOpenApiProvider({
          appKey: secrets.LAZADA_APP_KEY,
          appSecret: secrets.LAZADA_APP_SECRET,
          accessToken: secrets.LAZADA_ACCESS_TOKEN,
          sellerId: secrets.LAZADA_SELLER_ID,
        }),
        new TiktokShopApiProvider({
          appKey: secrets.TIKTOK_SHOP_APP_KEY,
          appSecret: secrets.TIKTOK_SHOP_APP_SECRET,
          accessToken: secrets.TIKTOK_SHOP_ACCESS_TOKEN,
          shopId: secrets.TIKTOK_SHOP_ID,
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

export function expectedCronKey(): string | undefined {
  return process.env.FMR_CRON_KEY;
}
