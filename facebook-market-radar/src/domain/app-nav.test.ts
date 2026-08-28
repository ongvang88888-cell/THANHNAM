import { describe, expect, it } from "vitest";
import {
  APP_NAV_GROUPS,
  isActiveNav,
  listPlatformNavHrefs,
  platformIdFromPath,
  TOP_PLATFORM_PILLS,
} from "./app-nav";

describe("app nav platforms", () => {
  it("puts Shopee, Google, YouTube and 999 products in the first menu group", () => {
    const hrefs = listPlatformNavHrefs();
    expect(hrefs).toContain("/kenh/shopee");
    expect(hrefs).toContain("/kenh/lazada");
    expect(hrefs).toContain("/kenh/google");
    expect(hrefs).toContain("/kenh/youtube");
    expect(hrefs).toContain("/kenh/tiktok");
    expect(hrefs).toContain("/top/shopee");
    expect(APP_NAV_GROUPS[0]?.title).toMatch(/nền tảng/i);
    expect(TOP_PLATFORM_PILLS.map((pill) => pill.id)).toEqual([
      "facebook",
      "instagram",
      "google",
      "youtube",
      "tiktok",
      "shopee",
      "lazada",
      "tiki",
      "sendo",
    ]);
  });

  it("highlights the open platform from /kenh and /top paths", () => {
    expect(platformIdFromPath("/kenh/shopee")).toBe("shopee");
    expect(platformIdFromPath("/top/youtube")).toBe("youtube");
    expect(platformIdFromPath("/xu-huong")).toBe("facebook");
    expect(isActiveNav("/kenh/shopee", "/kenh/shopee")).toBe(true);
    expect(isActiveNav("/xu-huong", "/xu-huong")).toBe(true);
    expect(isActiveNav("/xu-huong", "/")).toBe(false);
  });
});
