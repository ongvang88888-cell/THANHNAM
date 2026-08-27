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
export type AiCapabilityName =
  | "ffmpeg"
  | "speech"
  | "imageGen"
  | "llm"
  | "tts"
  | "heygen"
  | "minimax"
  | "veo"
  | "elevenlabs";

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
      "Công thức lecture_expert_v1: làm nét nhẹ + lọc tiếng giảng, cắt im lặng. Nếu đã lưu nhân vật (ảnh/mô tả + xác nhận) và có HEYGEN_API_KEY hoặc MINIMAX_API_KEY thì tự che người gốc bằng nhân vật đó; không thì tô đậm người giữa khung trên máy. Ảnh bìa và phụ đề. Giữ slide hai bên và tiếng gốc. Không sinh nhân vật 3D kiểu Kling/Dreamina. Chỉ video bạn sở hữu.",
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
      "Dựng người dẫn ảo (HeyGen Instant Avatar / v3 photo hoặc prompt, tái dùng avatar_id) rồi che người trong video gốc (khung giữa), lặp clip ngắn, giữ slide ngoài khung và tiếng bài. Tự chạy khi đã lưu nhân vật chung. Studio vẫn chạy tay. Cần xác nhận người ảo / ảnh hợp lệ.",
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
}

export function isAiEditToolId(value: string): value is AiEditToolId {
  return (AI_EDIT_TOOL_IDS as readonly string[]).includes(value);
}

export function getAiEditTool(id: string): AiEditToolDef | null {
  return AI_EDIT_TOOLS.find((tool) => tool.id === id) ?? null;
}

export function envAiCapabilities(ffmpeg: boolean): AiCapabilities {
  const enabled = process.env.AI_EDIT_ENABLED !== "false";
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const elevenlabs = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  return {
    enabled,
    ffmpeg,
    speech: Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.GROQ_API_KEY?.trim()),
    imageGen: openai,
    llm: Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()),
    tts: openai || elevenlabs,
    heygen: Boolean(process.env.HEYGEN_API_KEY?.trim()),
    minimax: Boolean(process.env.MINIMAX_API_KEY?.trim()),
    veo: Boolean(process.env.VEO_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()),
    elevenlabs,
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
  if (tool.id === "avatar_presenter") {
    if (!caps.heygen && !caps.tts) {
      return {
        available: false,
        mode: "fallback",
        note: "Cần HEYGEN_API_KEY hoặc OPENAI/ELEVENLABS (TTS) để dựng người dẫn.",
      };
    }
    if (!hasSource && !caps.heygen && !caps.tts) {
      return { available: false, mode: "fallback", note: "Nhập kịch bản hoặc tải video gốc." };
    }
    if (caps.heygen) return { available: true, mode: "full", note: null };
    return {
      available: true,
      mode: "fallback",
      note: "Chưa có HeyGen — sẽ dựng avatar nháp (ảnh + TTS), không phải người ảo HeyGen.",
    };
  }
  if (tool.id === "hailuo_character") {
    if (!caps.minimax) {
      return {
        available: false,
        mode: "fallback",
        note: "Cần MINIMAX_API_KEY để gọi Hailuo / MiniMax. ffmpeg không sinh nhân vật 3D.",
      };
    }
    return {
      available: true,
      mode: caps.tts ? "full" : "fallback",
      note: caps.tts ? null : "Chưa có TTS — clip Hailuo sẽ giữ tiếng MiniMax (thường không khớp lời bài).",
    };
  }
  if (tool.id === "veo_intro") {
    if (!caps.veo) {
      return {
        available: false,
        mode: "fallback",
        note: "Cần GEMINI_API_KEY hoặc VEO_API_KEY (Veo 3.1 trả phí). Không giả clip Veo trên máy.",
      };
    }
    return {
      available: true,
      mode: "full",
      note: "Veo 3.1 trên Gemini API — khóa miễn phí thường bị từ chối. Clip ~8 giây, nối trước bài.",
    };
  }
  if (tool.id === "video_translate") {
    if (!hasSource) {
      return { available: false, mode: "fallback", note: "Chưa có file video gốc. Hãy tải lại video." };
    }
    if (caps.heygen) return { available: true, mode: "full", note: null };
    if (caps.speech && caps.tts && caps.llm) {
      return {
        available: true,
        mode: "fallback",
        note: "Chưa có HeyGen — lồng tiếng mới, giữ hình gốc, miệng không khớp.",
      };
    }
    return {
      available: false,
      mode: "fallback",
      note: "Cần HEYGEN_API_KEY, hoặc Whisper + TTS + LLM để lồng tiếng trên máy.",
    };
  }
  if (tool.id === "eye_contact") {
    if (!hasSource) {
      return { available: false, mode: "fallback", note: "Chưa có file video gốc. Hãy tải lại video." };
    }
    return {
      available: true,
      mode: "fallback",
      note: "Bản trên máy: canh mặt/mắt vào giữa khung. Không sửa hướng nhìn từng frame.",
    };
  }
  if (tool.id === "overdub") {
    if (!hasSource) {
      return { available: false, mode: "fallback", note: "Chưa có file video gốc. Hãy tải lại video." };
    }
    if (caps.elevenlabs) return { available: true, mode: "full", note: null };
    return {
      available: true,
      mode: "fallback",
      note: "Chưa có ElevenLabs — TTS sẽ khác giọng giáo viên.",
    };
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
      tts: "Chưa có khóa TTS — không đọc được lời mới.",
      heygen: "Chưa có HEYGEN_API_KEY — chạy bản trên máy.",
      minimax: "Chưa có MINIMAX_API_KEY — không gọi Hailuo.",
      veo: "Chưa có khóa Veo/Gemini — không sinh clip mở bài.",
      elevenlabs: "Chưa có ElevenLabs — TTS sẽ khác giọng giáo viên.",
    };
    return { available: true, mode: "fallback", note: notes[missingPrefer[0]!] };
  }
  return { available: true, mode: "full", note: null };
}
