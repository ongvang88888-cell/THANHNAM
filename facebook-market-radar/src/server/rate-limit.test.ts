import { describe, expect, it } from "vitest";
import { allowRequest } from "./rate-limit";

describe("allowRequest", () => {
  it("allows under the cap and blocks bursts", () => {
    const now = 1_000_000;
    expect(allowRequest("t1", now, 2, 1000)).toBe(true);
    expect(allowRequest("t1", now + 10, 2, 1000)).toBe(true);
    expect(allowRequest("t1", now + 20, 2, 1000)).toBe(false);
    expect(allowRequest("t1", now + 2000, 2, 1000)).toBe(true);
  });
});
