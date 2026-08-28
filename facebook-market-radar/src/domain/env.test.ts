import { describe, expect, it } from "vitest";
import { marketingAccountId } from "./env";

describe("marketingAccountId", () => {
  it("falls back when env is empty", () => {
    expect(marketingAccountId(undefined)).toBe("act_demo");
    expect(marketingAccountId("")).toBe("act_demo");
    expect(marketingAccountId("   ")).toBe("act_demo");
    expect(marketingAccountId("act_123")).toBe("act_123");
  });
});
