import { describe, expect, it } from "vitest";
import { assertCollectAuthorized, UnauthorizedError } from "./authz";

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
