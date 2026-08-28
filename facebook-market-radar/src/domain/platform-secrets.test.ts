import { describe, expect, it } from "vitest";
import {
  applyPlatformSecretsPatch,
  parsePlatformSecretsPatch,
  platformSecretFlags,
  resolvePlatformSecrets,
} from "./platform-secrets";

describe("platform secrets overlay", () => {
  it("ignores unknown keys and empty strings so a save cannot invent sold", () => {
    const parsed = parsePlatformSecretsPatch({
      YOUTUBE_API_KEY: "  yt-1  ",
      GOOGLE_CSE_KEY: "",
      EXTRA_HACK: "nope",
      SHOPEE_SOLD: "999999",
    });
    expect(parsed.patch).toEqual({ YOUTUBE_API_KEY: "yt-1" });
    expect(parsed.patch).not.toHaveProperty("EXTRA_HACK");
    expect(parsed.patch).not.toHaveProperty("SHOPEE_SOLD");
    const flags = platformSecretFlags(parsed.patch);
    expect(flags.youtube).toBe(true);
    expect(flags.googleCse).toBe(false);
    expect(flags.shopeeShop).toBe(false);
  });

  it("merges without wiping stored keys and lets env win over overlay", () => {
    const stored = applyPlatformSecretsPatch({ YOUTUBE_API_KEY: "old" }, { YOUTUBE_API_KEY: "  ", GOOGLE_CSE_CX: "cx" });
    expect(stored.YOUTUBE_API_KEY).toBe("old");
    expect(stored.GOOGLE_CSE_CX).toBe("cx");
    const cleared = applyPlatformSecretsPatch(stored, { clear: ["YOUTUBE_API_KEY"], GOOGLE_CSE_KEY: "cse" });
    expect(cleared.YOUTUBE_API_KEY).toBeUndefined();
    expect(cleared.GOOGLE_CSE_KEY).toBe("cse");
    const resolved = resolvePlatformSecrets(
      { YOUTUBE_API_KEY: "from-env", GOOGLE_CSE_KEY: "", GOOGLE_CSE_CX: "cx-env" },
      { YOUTUBE_API_KEY: "from-file", GOOGLE_CSE_KEY: "cse-file" },
    );
    expect(resolved.YOUTUBE_API_KEY).toBe("from-env");
    expect(resolved.GOOGLE_CSE_KEY).toBe("cse-file");
    expect(resolved.GOOGLE_CSE_CX).toBe("cx-env");
    expect(platformSecretFlags(resolved).googleCse).toBe(true);
  });
});
