import { describe, expect, it } from "vitest";
import { buildLessonContents, inferMime } from "./lesson-contents";

describe("buildLessonContents", () => {
  it("omits empty fields and de-duplicates documents", () => {
    expect(
      buildLessonContents({
        body: "  Hello  ",
        videoId: " vid-1 ",
        documentIds: ["doc-a", "doc-a", "  ", "doc-b"],
      }),
    ).toEqual([
      { contentType: "TEXT", body: "Hello", position: 1 },
      { contentType: "VIDEO", refId: "vid-1", position: 2 },
      { contentType: "DOCUMENT", refId: "doc-a", position: 3 },
      { contentType: "DOCUMENT", refId: "doc-b", position: 4 },
    ]);
  });

  it("returns an empty list when nothing is set", () => {
    expect(buildLessonContents({ body: "   ", videoId: "", documentIds: [] })).toEqual([]);
  });
});

describe("inferMime", () => {
  it("maps research document extensions", () => {
    expect(inferMime("notes.PDF", "application/octet-stream")).toBe("application/pdf");
    expect(inferMime("slide.pptx", "application/octet-stream")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    expect(inferMime("unknown.bin", "application/pdf")).toBe("application/pdf");
  });
});
