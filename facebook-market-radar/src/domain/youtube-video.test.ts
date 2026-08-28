import { describe, expect, it } from "vitest";
import {
  collectYoutubeVideoIds,
  extractYoutubeVideoId,
  mapYoutubeVideosToClusters,
  parseYoutubeVideosList,
  peakViewsByCluster,
  youtubeWatchUrl,
} from "./youtube-video";

describe("youtube video ids", () => {
  it("extracts ids from official url shapes and ignores other hosts", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9wgXcQ")).toBe("dQw4w9wgXcQ");
    expect(extractYoutubeVideoId("https://youtu.be/dQw4w9wgXcQ?si=x")).toBe("dQw4w9wgXcQ");
    expect(extractYoutubeVideoId("https://www.youtube.com/embed/dQw4w9wgXcQ")).toBe("dQw4w9wgXcQ");
    expect(extractYoutubeVideoId("https://www.youtube.com/shorts/dQw4w9wgXcQ")).toBe("dQw4w9wgXcQ");
    expect(extractYoutubeVideoId("https://tiki.vn/watch?v=dQw4w9wgXcQ")).toBeNull();
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(collectYoutubeVideoIds(["https://youtu.be/dQw4w9wgXcQ", "https://youtu.be/dQw4w9wgXcQ"])).toEqual([
      "dQw4w9wgXcQ",
    ]);
    expect(youtubeWatchUrl("dQw4w9wgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9wgXcQ");
  });

  it("parses videos.list statistics and peaks per cluster", () => {
    const counts = parseYoutubeVideosList({
      items: [
        { id: "dQw4w9wgXcQ", statistics: { viewCount: "4100" } },
        { id: "bad", statistics: { viewCount: "9" } },
        { id: "xxxxxxxxxxx", statistics: { viewCount: "not-a-number" } },
      ],
    });
    expect(counts).toEqual([{ videoId: "dQw4w9wgXcQ", viewCount: 4100 }]);
    const mapping = mapYoutubeVideosToClusters([
      {
        clusterSlug: "serum",
        landingUrl: "https://www.youtube.com/watch?v=dQw4w9wgXcQ",
        body: "https://tiki.vn/x",
      },
    ]);
    expect(mapping.get("dQw4w9wgXcQ")).toEqual(["serum"]);
    expect(peakViewsByCluster(mapping, counts)).toEqual([{ clusterSlug: "serum", viewCount: 4100 }]);
  });
});
