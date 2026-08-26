export type LessonContentType = "TEXT" | "VIDEO" | "DOCUMENT";

export type LessonContentInput = {
  contentType: LessonContentType;
  body?: string;
  refId?: string;
  position: number;
};

export function buildLessonContents(input: {
  body?: string | null;
  videoId?: string | null;
  documentIds?: string[] | null;
}): LessonContentInput[] {
  const contents: LessonContentInput[] = [];
  const body = input.body?.trim();
  if (body) {
    contents.push({ contentType: "TEXT", body, position: contents.length + 1 });
  }
  const videoId = input.videoId?.trim();
  if (videoId) {
    contents.push({ contentType: "VIDEO", refId: videoId, position: contents.length + 1 });
  }
  const seen = new Set<string>();
  for (const raw of input.documentIds ?? []) {
    const documentId = raw.trim();
    if (!documentId || seen.has(documentId)) continue;
    seen.add(documentId);
    contents.push({
      contentType: "DOCUMENT",
      refId: documentId,
      position: contents.length + 1,
    });
  }
  return contents;
}

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
  txt: "text/plain",
  md: "text/plain",
};

export function inferMime(filename: string, fallback: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? fallback;
}
