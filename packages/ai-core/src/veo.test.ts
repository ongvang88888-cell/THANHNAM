import { describe, expect, it } from "vitest";
import { buildVeoGenerateBody, parseVeoOperationName, parseVeoStatus, veoGenerateUrl, veoOperationUrl } from "./veo";

describe("veo", () => {
  it("builds an 8 second 16:9 request", () => {
    const body = buildVeoGenerateBody({ prompt: "Classroom intro", imageBase64: "abc", imageMime: "image/png" });
    expect(body.parameters.durationSeconds).toBe(8);
    expect(body.parameters.aspectRatio).toBe("16:9");
    expect(body.instances[0]?.image).toEqual({ bytesBase64Encoded: "abc", mimeType: "image/png" });
  });

  it("parses operation name and completed uri", () => {
    expect(parseVeoOperationName({ name: "operations/abc" })).toBe("operations/abc");
    const done = parseVeoStatus({
      done: true,
      response: {
        generateVideoResponse: {
          generatedSamples: [{ video: { uri: "https://generativelanguage.googleapis.com/v1beta/files/x" } }],
        },
      },
    });
    expect(done.status).toBe("completed");
    expect(done.videoUrl).toContain("googleapis.com");
    expect(parseVeoStatus({ error: { message: "quota" } }).error).toBe("quota");
  });

  it("builds Gemini REST urls", () => {
    expect(veoGenerateUrl("k")).toContain("veo-3.1-generate-preview:predictLongRunning");
    expect(veoOperationUrl("operations/abc", "k")).toContain("/v1beta/operations/abc");
    expect(() => veoOperationUrl("evil", "k")).toThrow(/operation/);
  });
});
