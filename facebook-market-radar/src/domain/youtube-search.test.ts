import { describe, expect, it } from "vitest";
import { parseYoutubeSearchList, sanitizeYoutubeSearchQuery } from "./youtube-search";

describe("YouTube search.list parser", () => {
  it("keeps video ids and drops channels", () => {
    const hits = parseYoutubeSearchList({
      items: [
        { id: { videoId: "dQw4w9wgXcQ" }, snippet: { title: "Review serum" } },
        { id: { kind: "youtube#channel", channelId: "UCxxxx" }, snippet: { title: "Shop" } },
        { id: { videoId: "bad" }, snippet: { title: "nope" } },
      ],
    });
    expect(hits).toEqual([{ videoId: "dQw4w9wgXcQ", title: "Review serum" }]);
  });

  it("strips urls from search titles", () => {
    expect(sanitizeYoutubeSearchQuery("Serum C https://tiki.vn/x !!!")).toBe("Serum C");
  });
});
