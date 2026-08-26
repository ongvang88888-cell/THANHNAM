import { describe, expect, it } from "vitest";
import { throttleTracker } from "./throttle-tracker";

describe("throttleTracker", () => {
  it("uses the first X-Forwarded-For hop", () => {
    expect(
      throttleTracker({
        headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
        ip: "127.0.0.1",
      }),
    ).toBe("203.0.113.9");
  });

  it("falls back to req.ip", () => {
    expect(throttleTracker({ headers: {}, ip: "198.51.100.4" })).toBe("198.51.100.4");
  });
});
