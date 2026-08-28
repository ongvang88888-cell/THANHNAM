import { describe, expect, it } from "vitest";
import { HttpLicensedFeedReader } from "./http-licensed-reader";
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
});
