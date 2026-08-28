import { describe, expect, it } from "vitest";
import { HttpLicensedFeedReader } from "./http-licensed-reader";
import { YoutubeDataApiProvider } from "./youtube-data-api";
import { LicensedAdIndexProvider, JsonLicensedFeedReader } from "./licensed-provider";
import { ManualAdIndexProvider } from "./manual-provider";
import {
  FIXTURE_GRAPH_INSIGHTS,
  FixtureMarketingHttp,
  OwnAdsMarketingApiProvider,
} from "./marketing-api-provider";
import type { NormalizedAd } from "../domain/ports";

const sample: NormalizedAd = {
  libraryId: "111",
  pageId: "900",
  pageName: "Demo",
  body: "copy",
  title: "Serum",
  startDate: "2026-08-01",
  isActive: true,
  platforms: ["facebook"],
  snapshotUrl: null,
  landingUrl: null,
  imageUrl: null,
  productHint: "Serum",
  nicheHint: "my-pham",
};

describe("IAdIndexProvider adapters", () => {
  it("manual provider filters local ads", async () => {
    const provider = new ManualAdIndexProvider([sample]);
    const hit = await provider.fetchAds({ nowMs: 1, searchText: "serum" });
    const miss = await provider.fetchAds({ nowMs: 1, searchText: "bỉm" });
    expect(provider.source).toBe("manual");
    expect(hit).toHaveLength(1);
    expect(miss).toHaveLength(0);
  });

  it("licensed provider reads feed JSON", async () => {
    const provider = new LicensedAdIndexProvider(
      new JsonLicensedFeedReader(JSON.stringify({ ads: [sample] })),
    );
    expect(provider.source).toBe("licensed");
    const ads = await provider.fetchAds({ nowMs: 1, pageId: "900" });
    expect(ads).toHaveLength(1);
  });

  it("own ads provider maps fixture insights and does not mix into market source", async () => {
    const provider = new OwnAdsMarketingApiProvider(
      "test-token",
      new FixtureMarketingHttp(FIXTURE_GRAPH_INSIGHTS),
    );
    expect(provider.source).toBe("own_ads");
    const rows = await provider.fetchInsights({
      adAccountId: "123",
      since: "2026-08-20",
      until: "2026-08-27",
    });
    expect(rows.length).toBe(2);
    expect(rows[0]?.spendMinor).toBe(150);
  });

  it("http licensed reader refuses Facebook hosts and reads vendor JSON", async () => {
    await expect(
      new HttpLicensedFeedReader("https://graph.facebook.com/v26.0/ads_archive", "secret").read(),
    ).rejects.toThrow(/Facebook/);
    const reader = new HttpLicensedFeedReader(
      "https://vendor.example.com/feed",
      "secret-token",
      async (url, init) => {
        expect(url).toBe("https://vendor.example.com/feed");
        expect(init.headers).toMatchObject({ Authorization: "secret-token" });
        return new Response(JSON.stringify({ ads: [sample] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    );
    const payload = (await reader.read()) as { ads: unknown[] };
    expect(payload.ads).toHaveLength(1);
  });

  it("YouTube Data API only hits googleapis videos.list and never youtube.com", async () => {
    const empty = new YoutubeDataApiProvider("");
    expect(empty.enabled).toBe(false);
    const provider = new YoutubeDataApiProvider("test-key", async (url) => {
      const parsed = new URL(url);
      expect(parsed.hostname).toBe("www.googleapis.com");
      expect(parsed.pathname).toBe("/youtube/v3/videos");
      expect(parsed.searchParams.get("id")).toBe("dQw4w9wgXcQ");
      expect(url.includes("youtube.com/watch")).toBe(false);
      return new Response(
        JSON.stringify({ items: [{ id: "dQw4w9wgXcQ", statistics: { viewCount: "99" } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    expect(provider.enabled).toBe(true);
    const rows = await provider.fetchViewCounts(["dQw4w9wgXcQ", "bad"]);
    expect(rows).toEqual([{ videoId: "dQw4w9wgXcQ", viewCount: 99 }]);
  });

  it("YouTube search.list then videos.list never touches youtube.com HTML", async () => {
    const provider = new YoutubeDataApiProvider("test-key", async (url) => {
      const parsed = new URL(url);
      expect(parsed.hostname).toBe("www.googleapis.com");
      expect(url.includes("youtube.com/results")).toBe(false);
      if (parsed.pathname === "/youtube/v3/search") {
        expect(parsed.searchParams.get("q")).toBe("Serum C");
        return new Response(
          JSON.stringify({ items: [{ id: { videoId: "dQw4w9wgXcQ" }, snippet: { title: "Review" } }] }),
          { status: 200 },
        );
      }
      expect(parsed.pathname).toBe("/youtube/v3/videos");
      return new Response(
        JSON.stringify({ items: [{ id: "dQw4w9wgXcQ", statistics: { viewCount: "88" } }] }),
        { status: 200 },
      );
    });
    const hits = await provider.searchVideos("Serum C !!!", 2);
    expect(hits).toEqual([{ videoId: "dQw4w9wgXcQ", title: "Review", viewCount: 88 }]);
  });
});

describe("official listing and own-shop adapters", () => {
  it("Google CSE only hits customsearch/v1 and drops non-tiki links", async () => {
    const { GoogleCseListingProvider } = await import("./google-cse");
    const provider = new GoogleCseListingProvider("k", "cx", async (url) => {
      const parsed = new URL(url);
      expect(parsed.hostname).toBe("www.googleapis.com");
      expect(parsed.pathname).toBe("/customsearch/v1");
      expect(parsed.searchParams.get("q")?.includes("site:tiki.vn")).toBe(true);
      expect(url.includes("tiki.vn/api")).toBe(false);
      return new Response(
        JSON.stringify({
          items: [
            { link: "https://tiki.vn/serum-p1.html", title: "Serum" },
            { link: "https://shopee.vn/x", title: "wrong" },
          ],
        }),
        { status: 200 },
      );
    });
    const hits = await provider.searchOfficialListings({ query: "Serum C", site: "tiki" });
    expect(hits).toEqual([{ url: "https://tiki.vn/serum-p1.html", title: "Serum", site: "tiki" }]);
  });

  it("Shopee Open only calls partner.shopeemobile.com", async () => {
    const { ShopeeOpenApiProvider } = await import("./shopee-open-api");
    const seen: string[] = [];
    const provider = new ShopeeOpenApiProvider(
      { partnerId: "1", partnerKey: "secret", shopId: "99", accessToken: "tok" },
      async (url) => {
        seen.push(new URL(url).hostname + new URL(url).pathname);
        expect(new URL(url).hostname).toBe("partner.shopeemobile.com");
        expect(url.includes("shopee.vn")).toBe(false);
        if (url.includes("get_item_list")) {
          return new Response(JSON.stringify({ response: { item: [{ item_id: 11 }] } }), { status: 200 });
        }
        if (url.includes("get_item_base_info")) {
          return new Response(
            JSON.stringify({ response: { item_list: [{ item_id: 11, item_name: "Kem" }] } }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ response: { item_list: [{ item_id: 11, sale: 2 }] } }), {
          status: 200,
        });
      },
      () => 1_700_000_000,
    );
    const items = await provider.fetchOwnItems();
    expect(items[0]?.soldCount).toBe(2);
    expect(items[0]?.itemName).toBe("Kem");
    expect(seen.every((row) => row.startsWith("partner.shopeemobile.com/api/v2/"))).toBe(true);
  });
});
