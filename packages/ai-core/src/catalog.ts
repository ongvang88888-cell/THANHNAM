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
  "avatar_presenter",
  "hailuo_character",
  "veo_intro",
  "video_translate",
  "eye_contact",
  "overdub",
] as const;

export type AiEditToolId = (typeof AI_EDIT_TOOL_IDS)[number];

export type AiEditToolGroup = "audio" | "image" | "copy";
export type AiEditOutputKind = "video" | "image" | "vtt" | "copy";
export const PUBLIC_AI_EDIT_TOOL_IDS = ["owned_abc"] as const;

export type PublicAiEditToolId = (typeof PUBLIC_AI_EDIT_TOOL_IDS)[number];

export type AiCapabilityName =
  | "ffmpeg"
  | "speech"
  | "imageGen"
  | "llm"
  | "tts"
  | "heygen"
  | "minimax"
  | "veo"
  | "elevenlabs"
  | "fal"
  | "dashscope"
  | "nanoBanana"
  | "wan";

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
    label: "Wan 2.2 thay người",
    description:
      "Học từ Short Nano Banana + Wan 2.2: vẽ một ảnh nhân vật (Gemini Nano Banana) rồi Wan 2.2 animate replace từng đoạn ~20 giây — giữ chuyển động và cảnh, thay người trong video. Ghép lại tiếng gốc. Không thẻ chữ, không Ken Burns, không tô hoạt hình trên máy. Cần FAL_KEY hoặc DASHSCOPE_API_KEY, và ảnh https hoặc GEMINI_API_KEY. Chỉ video bạn sở hữu.",
    market: "Wan 2.2 Animate Replace + Google Nano Banana",
    outputKind: "video",
    needs: ["ffmpeg", "wan"],
    prefers: ["nanoBanana"],
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
    description:
      "Tô đậm giáo viên trên máy (làm phẳng + bảng màu + nét mực), giữ 100% tiếng gốc. Sau khi tải lên, hệ thống tự tô người giữa khung. Studio thủ công để đổi vùng/độ đậm. Bản trên máy — không phải DomoAI / Kling / Dreamina. Cần xác nhận sửa mặt khi chạy tay.",
    market: "DomoAI + CapCut Restyle + Runway Aleph (giữ chuyển động/tiếng, tô phong cách)",
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
  {
    id: "avatar_presenter",
    group: "image",
    label: "Người dẫn ảo (avatar)",
    description:
      "Dựng người dẫn ảo rồi che người trong video gốc (khung giữa), lặp clip ngắn, giữ slide ngoài khung và tiếng bài. Tự chạy trên mọi video tải lên. Có HEYGEN_API_KEY thì tái dùng avatar_id; không khóa thì thẻ nhân vật trên máy. Studio vẫn chạy tay.",
    market: "HeyGen Photo to Video / Avatar IV",
    outputKind: "video",
    needs: ["ffmpeg"],
    prefers: ["heygen", "tts"],
  },
  {
    id: "hailuo_character",
    group: "image",
    label: "Nhân vật 3D Hailuo (MiniMax)",
    description:
      "Ảnh tĩnh (cùng một ảnh cho mọi bài) → MiniMax Hailuo chuyển động → che người trong video gốc, lặp clip, giữ tiếng bài. Môi kém hơn HeyGen. Tự chạy nếu chưa có HeyGen nhưng đã lưu nhân vật + MINIMAX_API_KEY. Studio vẫn chạy tay.",
    market: "Hailuo / MiniMax H3 image-to-video + Vbee/Gemini TTS",
    outputKind: "video",
    needs: ["ffmpeg"],
    prefers: ["tts", "imageGen"],
  },
  {
    id: "veo_intro",
    group: "image",
    label: "Mở bài Veo 3 (8 giây)",
    description:
      "Sinh clip ~8 giây có tiếng nói (Google Veo 3.1 qua Gemini API). Mặc định nối trước bài. Có thể chọn thay người — lúc đó clip lặp để che người gốc, miệng không khớp cả bài. Cần GEMINI_API_KEY/VEO_API_KEY gói trả phí. Không chạy tự động.",
    market: "Google Veo 3.1 / Gemini / Flow",
    outputKind: "video",
    needs: ["ffmpeg"],
    prefers: ["imageGen"],
  },
  {
    id: "video_translate",
    group: "audio",
    label: "Dịch / lồng tiếng bài giảng",
    description:
      "Dịch lời sang ngôn ngữ khác. Có HeyGen thì lip-sync trên máy họ; không có thì lồng tiếng mới, giữ hình gốc (miệng không khớp). Không chạy tự động.",
    market: "HeyGen Video Translate",
    outputKind: "video",
    needs: ["ffmpeg"],
    prefers: ["heygen", "speech", "tts", "llm"],
  },
  {
    id: "eye_contact",
    group: "image",
    label: "Canh mắt nhìn camera",
    description:
      "Kéo mặt/mắt vào giữa khung (talking-head). Đây là bản trên máy — không warp từng con ngươi như Descript đám mây. Cần xác nhận sửa khuôn mặt. Không chạy tự động.",
    market: "Descript Eye Contact",
    outputKind: "video",
    needs: ["ffmpeg"],
    prefers: [],
  },
  {
    id: "overdub",
    group: "audio",
    label: "Overdub — sửa câu bằng giọng",
    description:
      "Thay một đoạn lời bằng câu bạn gõ. Có ElevenLabs thì clone giọng từ chính video; không có thì TTS giọng khác. Chỉ giọng bạn sở hữu. Không chạy tự động.",
    market: "Descript Overdub / ElevenLabs",
    outputKind: "video",
    needs: ["ffmpeg", "tts"],
    prefers: ["elevenlabs", "speech"],
  },
] as const;

export interface AiCapabilities {
  enabled: boolean;
  ffmpeg: boolean;
  speech: boolean;
  imageGen: boolean;
  llm: boolean;
  tts: boolean;
  heygen: boolean;
  minimax: boolean;
  veo: boolean;
  elevenlabs: boolean;
  fal: boolean;
  dashscope: boolean;
  nanoBanana: boolean;
  wan: boolean;
}

export function isAiEditToolId(value: string): value is AiEditToolId {
  return (AI_EDIT_TOOL_IDS as readonly string[]).includes(value);
}

export function isPublicAiEditToolId(value: string): value is PublicAiEditToolId {
  return (PUBLIC_AI_EDIT_TOOL_IDS as readonly string[]).includes(value);
}

export function getAiEditTool(id: string): AiEditToolDef | null {
  return AI_EDIT_TOOLS.find((tool) => tool.id === id) ?? null;
}

export function envAiCapabilities(ffmpeg: boolean): AiCapabilities {
  const enabled = process.env.AI_EDIT_ENABLED !== "false";
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const elevenlabs = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  const fal = Boolean(process.env.FAL_KEY?.trim());
  const dashscope = Boolean(process.env.DASHSCOPE_API_KEY?.trim());
  const nanoBanana = Boolean(process.env.GEMINI_API_KEY?.trim());
  return {
    enabled,
    ffmpeg,
    speech: Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.GROQ_API_KEY?.trim()),
    imageGen: openai || nanoBanana,
    llm: Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()),
    tts: openai || elevenlabs,
    heygen: Boolean(process.env.HEYGEN_API_KEY?.trim()),
    minimax: Boolean(process.env.MINIMAX_API_KEY?.trim()),
    veo: Boolean(process.env.VEO_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()),
    elevenlabs,
    fal,
    dashscope,
    nanoBanana,
    wan: fal || dashscope,
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
            ? "Máy chủ chưa có ffmpeg — cần cài để cắt đoạn và ghép tiếng gốc."
            : need === "wan"
              ? "Cần FAL_KEY (Fal) hoặc DASHSCOPE_API_KEY (Alibaba) để gọi Wan 2.2. Không thay người bằng thẻ chữ trên máy."
              : `Thiếu khả năng ${need}.`,
      };
    }
  }
  if (tool.id !== "owned_abc") {
    return {
      available: false,
      mode: "fallback",
      note: "Công cụ này đã gỡ. Chỉ còn Wan 2.2 + Nano Banana khi tải video.",
    };
  }
  if (!hasSource) {
    return { available: false, mode: "fallback", note: "Chưa có file video gốc. Hãy tải lại video." };
  }
  const missingPrefer = tool.prefers.filter((name) => !caps[name]);
  if (missingPrefer.length > 0) {
    const notes: Record<AiCapabilityName, string> = {
      ffmpeg: "Chạy không có ffmpeg.",
      speech: "Chưa có khóa Whisper — sẽ tạo phụ đề nháp từ tiêu đề.",
      imageGen: "Chưa có khóa ảnh AI — sẽ tạo poster chữ.",
      llm: "Chưa có khóa LLM — sẽ gợi ý từ tiêu đề.",
      tts: "Chưa có khóa TTS — không đọc được lời mới.",
      heygen: "Chưa có HEYGEN_API_KEY — công cụ này đã gỡ.",
      minimax: "Chưa có MINIMAX_API_KEY — công cụ này đã gỡ.",
      veo: "Chưa có khóa Veo/Gemini — công cụ này đã gỡ.",
      elevenlabs: "Chưa có ElevenLabs — công cụ này đã gỡ.",
      fal: "Chưa có FAL_KEY — sẽ thử DashScope nếu có.",
      dashscope: "Chưa có DASHSCOPE_API_KEY — sẽ dùng Fal nếu có.",
      nanoBanana: "Chưa có GEMINI_API_KEY — cần ảnh nhân vật https sẵn.",
      wan: "Chưa có FAL_KEY hoặc DASHSCOPE_API_KEY — không gọi Wan 2.2.",
    };
    return { available: true, mode: "fallback", note: notes[missingPrefer[0]!] };
  }
  return { available: true, mode: "full", note: null };
}
