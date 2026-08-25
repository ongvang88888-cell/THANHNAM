import { afterEach, describe, expect, it } from "vitest";
import {
  ADMOB_SSV_KEYS_DEFAULT_URL,
  resolveAdmobVerifierKeysUrl,
} from "./ssv-verify";

describe("resolveAdmobVerifierKeysUrl", () => {
  const previous = process.env.ADMOB_SSV_KEYS_URL;

  afterEach(() => {
    if (previous === undefined) delete process.env.ADMOB_SSV_KEYS_URL;
    else process.env.ADMOB_SSV_KEYS_URL = previous;
  });

  it("defaults to the official Google AdMob keys URL", () => {
    expect(resolveAdmobVerifierKeysUrl(undefined)).toBe(
      ADMOB_SSV_KEYS_DEFAULT_URL,
    );
    expect(resolveAdmobVerifierKeysUrl("")).toBe(ADMOB_SSV_KEYS_DEFAULT_URL);
  });

  it("allows https gstatic overrides", () => {
    const url = "https://www.gstatic.com/admob/reward/verifier-keys.json";
    expect(resolveAdmobVerifierKeysUrl(url)).toBe(url);
  });

  it("rejects non-https URLs", () => {
    expect(() =>
      resolveAdmobVerifierKeysUrl("http://gstatic.com/admob/reward/verifier-keys.json"),
    ).toThrow(/https/);
  });

  it("rejects hosts outside the allowlist (SSRF)", () => {
    expect(() =>
      resolveAdmobVerifierKeysUrl("https://evil.example/keys.json"),
    ).toThrow(/not allowlisted/);
  });

  it("rejects URLs with credentials or non-default ports", () => {
    expect(() =>
      resolveAdmobVerifierKeysUrl(
        "https://user:pass@gstatic.com/admob/reward/verifier-keys.json",
      ),
    ).toThrow(/credentials/);
    expect(() =>
      resolveAdmobVerifierKeysUrl(
        "https://gstatic.com:8443/admob/reward/verifier-keys.json",
      ),
    ).toThrow(/port/);
  });
});
