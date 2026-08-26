export const OWNERSHIP_DISCLAIMER =
  "Chỉ dùng video bạn sở hữu. Đổi phong cách hay giảm nhạc nền không xóa bản quyền nội dung người khác.";

export const AI_EDIT_TOOL_IDS = [
  "owned_abc",
  "studio_sound",
  "speech_focus",
  "silence_trim",
  "course_enhance",
  "picture_enhance",
  "toon_talking_head",
  "illustrated_edition",
  "auto_thumbnail",
  "ai_cover",
  "captions",
  "lesson_copy",
] as const;

export type AiEditToolId = (typeof AI_EDIT_TOOL_IDS)[number];

export type AiEditToolGroup = "audio" | "image" | "copy";
export type AiEditOutputKind = "video" | "image" | "vtt" | "copy";
export type AiCapabilityName = "ffmpeg" | "speech" | "imageGen" | "llm";

export interface AiEditToolDef {
  id: AiEditToolId;
  group: AiEditToolGroup;
  label: string;
  description: string;
  market: string;
  outputKind: AiEditOutputKind;
  needs: AiCapabilityName[];
  prefers: AiCapabilityName[];
}

export const AI_EDIT_TOOLS: readonly AiEditToolDef[] = [
  {
    id: "owned_abc",
    group: "image",
    label: "A+C — bài của tôi",
    description:
      "Công thức lecture_expert_v1: một lần encode làm nét nhẹ + lọc tiếng giảng, cắt im lặng conservative, ảnh bìa và phụ đề. Giữ camera giáo viên. Không tô hoạt hình mặc định. Chỉ video bạn sở hữu.",
    market: "Descript Studio Sound + Premiere Enhance Speech / Auto Color",
    outputKind: "video",
    needs: ["ffmpeg"],
    prefers: ["speech", "llm"],
  },
  {
    id: "studio_sound",
    group: "audio",
    label: "Lọc tạp âm (Studio Sound)",
    description: "Lọc ù, quạt máy, cân âm lượng giọng nói — giữ nguyên hình.",
    market: "Descript Studio Sound / Adobe Enhance Speech",
    outputKind: "video",
    needs: ["ffmpeg"],
    prefers: [],
  },
  {
    id: "speech_focus",
    group: "audio",
    label: "Giữ tiếng giảng, giảm nhạc nền",
    description: "Giữ 100% lời giảng, thu hẹp dải nhạc/B-roll dễ bị claim. Không phải Content ID và không rửa video người khác.",
    market: "Adobe Enhance Speech + YouTube mute/replace claimed audio",
    outputKind: "video",
    needs: ["ffmpeg"],
    prefers: [],
  },
  {
    id: "silence_trim",
    group: "audio",
    label: "Cắt đoạn im lặng",
    description: "Bỏ khoảng lặng dài đầu/cuối và giữa câu để bài gọn hơn.",
    market: "Descript / CapCut silence remove",
    outputKind: "video",
    needs: ["ffmpeg"],
    prefers: [],
  },
  {
    id: "course_enhance",
    group: "image",
    label: "Làm nét an toàn cho bài học",
    description: "Khử nhiễu và nét nhẹ, ưu tiên chữ slide/màn hình không bị vỡ. Giữ nguyên tiếng.",
    market: "Topaz Video (lite) + slide-safe grade",
    outputKind: "video",
    needs: ["ffmpeg"],
    prefers: [],
  },
  {
    id: "picture_enhance",
    group: "image",
    label: "Nâng cấp hình ảnh",
    description: "Sáng, tương phản, màu và làm nét nhẹ — giữ nguyên tiếng.",
    market: "CapCut Enhance / Topaz Video (lite)",
    outputKind: "video",
    needs: ["ffmpeg"],
    prefers: [],
  },
  {
    id: "toon_talking_head",
    group: "image",
    label: "Biến người thành hoạt hình",
    description: "Tô cả người/khung kiểu hoạt hình (màu đậm, nét mực), giữ 100% tiếng gốc. Chọn full khung để cả giáo viên thành cartoon.",
    market: "CapCut restyle + Runway Aleph (mặt), overlay slide gốc",
    outputKind: "video",
    needs: ["ffmpeg"],
    prefers: [],
  },
  {
    id: "illustrated_edition",
    group: "image",
    label: "Bản hoạt hình mới theo bài giảng",
    description: "Giữ 100% tiếng gốc, dựng minh họa mới theo transcript. Không lọc đè lên slide/code. Đây là edition riêng, không thay thế bản gốc nếu cần đọc chữ.",
    market: "Descript Overdub timeline + Firefly/DALL·E scene cards",
    outputKind: "video",
    needs: ["ffmpeg"],
    prefers: ["speech", "imageGen"],
  },
  {
    id: "auto_thumbnail",
    group: "image",
    label: "Ảnh bìa từ khung hình",
    description: "Lấy khung ở khoảng 25% thời lượng làm ảnh bìa, tránh frame đen đầu clip.",
    market: "YouTube / CapCut cover",
    outputKind: "image",
    needs: ["ffmpeg"],
    prefers: [],
  },
  {
    id: "ai_cover",
    group: "image",
    label: "Ảnh bìa AI từ tiêu đề",
    description: "Tạo poster từ tên bài. Có khóa OpenAI thì vẽ ảnh; không có thì làm poster chữ.",
    market: "Adobe Firefly / DALL·E",
    outputKind: "image",
    needs: [],
    prefers: ["imageGen"],
  },
  {
    id: "captions",
    group: "audio",
    label: "Phụ đề AI + transcript",
    description: "Chuyển lời nói thành phụ đề VTT. Có Whisper thì transcript thật; không có thì bản nháp từ tiêu đề.",
    market: "Descript / CapCut / Opus Clip captions",
    outputKind: "vtt",
    needs: [],
    prefers: ["speech"],
  },
  {
    id: "lesson_copy",
    group: "copy",
    label: "Gợi ý tiêu đề & mô tả",
    description: "Viết lại tiêu đề, mô tả ngắn và thẻ từ transcript hoặc tên bài.",
    market: "YouTube copilot",
    outputKind: "copy",
    needs: [],
    prefers: ["llm"],
  },
] as const;

export interface AiCapabilities {
  enabled: boolean;
  ffmpeg: boolean;
  speech: boolean;
  imageGen: boolean;
  llm: boolean;
}

export function isAiEditToolId(value: string): value is AiEditToolId {
  return (AI_EDIT_TOOL_IDS as readonly string[]).includes(value);
}

export function getAiEditTool(id: string): AiEditToolDef | null {
  return AI_EDIT_TOOLS.find((tool) => tool.id === id) ?? null;
}

export function envAiCapabilities(ffmpeg: boolean): AiCapabilities {
  const enabled = process.env.AI_EDIT_ENABLED !== "false";
  return {
    enabled,
    ffmpeg,
    speech: Boolean(process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY),
    imageGen: Boolean(process.env.OPENAI_API_KEY),
    llm: Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY),
  };
}

export function toolAvailability(
  tool: AiEditToolDef,
  caps: AiCapabilities,
  hasSource: boolean,
): { available: boolean; mode: "full" | "fallback"; note: string | null } {
  if (!caps.enabled) {
    return { available: false, mode: "fallback", note: "Chỉnh sửa AI đang tắt (AI_EDIT_ENABLED)." };
  }
  for (const need of tool.needs) {
    if (!caps[need]) {
      return {
        available: false,
        mode: "fallback",
        note:
          need === "ffmpeg"
            ? "Máy chủ chưa có ffmpeg — cần cài để sửa hình/tiếng."
            : `Thiếu khả năng ${need}.`,
      };
    }
  }
  if (tool.outputKind === "video" || tool.id === "auto_thumbnail") {
    if (!hasSource) {
      return { available: false, mode: "fallback", note: "Chưa có file video gốc. Hãy tải lại video." };
    }
  }
  const missingPrefer = tool.prefers.filter((name) => !caps[name]);
  if (missingPrefer.length > 0) {
    const notes: Record<AiCapabilityName, string> = {
      ffmpeg: "Chạy không có ffmpeg.",
      speech: "Chưa có khóa Whisper — sẽ tạo phụ đề nháp từ tiêu đề.",
      imageGen: "Chưa có khóa ảnh AI — sẽ tạo poster chữ.",
      llm: "Chưa có khóa LLM — sẽ gợi ý từ tiêu đề.",
    };
    return { available: true, mode: "fallback", note: notes[missingPrefer[0]!] };
  }
  return { available: true, mode: "full", note: null };
}
