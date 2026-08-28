import { describe, expect, it } from "vitest";
import { hasActiveResearchQuery, queryFromParams, researchHref } from "./research-query";

describe("research query", () => {
  it("keeps kenh when building hrefs", () => {
    const query = queryFromParams({ kenh: "google", view: "table", ten: "serum" });
    expect(query.kenh).toBe("google");
    expect(researchHref("/", query, { view: "ads" })).toContain("kenh=google");
    expect(researchHref("/", query, { ten: undefined })).not.toContain("ten=");
  });

  it("treats display fields as inactive filters", () => {
    expect(hasActiveResearchQuery({ view: "ads", sort: "heat", kenh: "shopee" })).toBe(false);
    expect(hasActiveResearchQuery({ lane: "all", landing: "any" })).toBe(false);
    expect(hasActiveResearchQuery({ ten: "serum" })).toBe(true);
  });
});
