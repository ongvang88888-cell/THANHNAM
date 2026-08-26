import { describe, expect, it } from "vitest";
import {
  isAllowedCharacterImageUrl,
  isAllowedHeygenMediaUrl,
  isAllowedMinimaxMediaUrl,
  isAllowedRemoteMediaUrl,
  isAllowedVeoMediaUrl,
  isBlockedDownloadHost,
  parsePublicHttpsUrl,
  withGoogleApiKey,
} from "./remote-media";

describe("remote media allowlists", () => {
  it("blocks private and local hosts", () => {
    expect(isBlockedDownloadHost("localhost")).toBe(true);
    expect(isBlockedDownloadHost("127.0.0.1")).toBe(true);
    expect(isBlockedDownloadHost("10.0.0.2")).toBe(true);
    expect(isBlockedDownloadHost("192.168.1.9")).toBe(true);
    expect(isBlockedDownloadHost("169.254.169.254")).toBe(true);
    expect(isBlockedDownloadHost("172.16.0.4")).toBe(true);
    expect(isBlockedDownloadHost("cdn.heygen.com")).toBe(false);
  });

  it("requires public https", () => {
    expect(() => parsePublicHttpsUrl("http://cdn.heygen.com/a.jpg")).toThrow(/https/);
    expect(() => parsePublicHttpsUrl("https://127.0.0.1/a.jpg")).toThrow(/nội bộ/);
    expect(parsePublicHttpsUrl("https://cdn.heygen.com/a.jpg").hostname).toBe("cdn.heygen.com");
  });

  it("allows provider media hosts only", () => {
    expect(isAllowedHeygenMediaUrl("https://files2.heygen.com/out.mp4")).toBe(true);
    expect(isAllowedMinimaxMediaUrl("https://filecdn.minimax.chat/out.mp4")).toBe(true);
    expect(isAllowedMinimaxMediaUrl("https://cdn.hailuoai.com/out.mp4")).toBe(true);
    expect(isAllowedVeoMediaUrl("https://generativelanguage.googleapis.com/v1beta/files/x")).toBe(true);
    expect(isAllowedRemoteMediaUrl("https://evil.example/out.mp4")).toBe(false);
    expect(isAllowedCharacterImageUrl("https://ideogram.ai/a.png")).toBe(true);
    expect(isAllowedCharacterImageUrl("https://127.0.0.1/a.png")).toBe(false);
  });

  it("appends a Google key only on Veo hosts", () => {
    const url = withGoogleApiKey("https://generativelanguage.googleapis.com/v1beta/files/x", "secret");
    expect(url).toContain("key=secret");
    expect(() => withGoogleApiKey("https://evil.example/x", "secret")).toThrow();
  });
});
