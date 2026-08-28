import { describe, expect, it } from "vitest";
import { assertCollectAuthorized, assertCronAuthorized, UnauthorizedError } from "./authz";

describe("assertCollectAuthorized", () => {
  it("allows when no key configured", () => {
    expect(() => assertCollectAuthorized(null, undefined)).not.toThrow();
    expect(() => assertCollectAuthorized(null, "")).not.toThrow();
  });

  it("accepts matching key and rejects others", () => {
    expect(() => assertCollectAuthorized("secret", "secret")).not.toThrow();
    expect(() => assertCollectAuthorized("nope", "secret")).toThrow(UnauthorizedError);
    expect(() => assertCollectAuthorized(null, "secret")).toThrow(UnauthorizedError);
  });
});

describe("assertCronAuthorized", () => {
  it("allows when neither cron nor collect is configured", () => {
    expect(() => assertCronAuthorized(null, null, undefined, undefined)).not.toThrow();
    expect(() => assertCronAuthorized(null, null, "", "")).not.toThrow();
  });

  it("accepts cron or collect and rejects a mismatch", () => {
    expect(() => assertCronAuthorized("cron", null, "cron", "collect")).not.toThrow();
    expect(() => assertCronAuthorized(null, "collect", "cron", "collect")).not.toThrow();
    expect(() => assertCronAuthorized("nope", "nope", "cron", "collect")).toThrow(UnauthorizedError);
    expect(() => assertCronAuthorized(null, null, "cron", undefined)).toThrow(UnauthorizedError);
  });
});
