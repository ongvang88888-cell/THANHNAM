import type { GplxLicenseClassCode } from "./gplx";
import { getGplxExamRules } from "./gplx";

export type GplxTip = {
  id: string;
  title: string;
  body: string;
  topicCode?: string;
};

export type GplxSignGroup = "cam" | "nguy_hiem" | "hieu_lenh" | "chi_dan" | "phu";

export type GplxSign = {
  id: string;
  code: string;
  name: string;
  group: GplxSignGroup;
  meaning: string;
  /** Public path under web `/gplx/signs/…` (SVG). */
  imageUrl: string;
  /** Asset provenance for attribution UI. */
  source: "commons" | "edu_original";
};

export type GplxSituationIllustration = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  topicHints: string[];
};

/** Map QCVN-style code `P.101` → `/gplx/signs/P_101.svg`. */
export function gplxSignImagePath(code: string): string {
  return `/gplx/signs/${code.replace(/\./g, "_")}.svg`;
}

export function gplxSituationImagePath(slug: string): string {
  return `/gplx/situations/${slug}.svg`;
}

export const GPLX_TIPS: GplxTip[] = [
  {
    id: "tip-critical",
    title: "Ưu tiên thuộc câu điểm liệt",
    body: "Trong bài thi, sai một câu điểm liệt là không đạt dù tổng điểm cao. Ôn riêng bộ câu liệt mỗi ngày trước khi ngủ.",
    topicCode: "concepts",
  },
  {
    id: "tip-alcohol",
    title: "Cồn = liệt",
    body: "Các câu về nồng độ cồn, bỏ hiện trường, đi ngược chiều, vượt đèn đỏ thường là câu điểm liệt — đọc kỹ đáp án phủ định.",
    topicCode: "concepts",
  },
  {
    id: "tip-signs",
    title: "Nhận dạng biển nhanh",
    body: "Tròn viền đỏ = cấm; tam giác vàng = nguy hiểm; tròn xanh = hiệu lệnh; vuông/chữ nhật xanh = chỉ dẫn. Học theo hình trước khi học chữ.",
    topicCode: "signs",
  },
  {
    id: "tip-right-of-way",
    title: "Thứ tự ưu tiên ngã tư",
    body: "Người điều khiển giao thông → đèn/biển → xe ưu tiên → quy tắc nhường đường. Không đoán theo 'xe to hơn'.",
    topicCode: "situations",
  },
  {
    id: "tip-mock",
    title: "Thi thử đúng giờ",
    body: "Luyện ít nhất 5 đề thi thử đủ thời gian. Quen nhịp trả lời 30–40 giây/câu để không bị hết giờ.",
  },
  {
    id: "tip-review-wrong",
    title: "Ôn ngay câu vừa sai",
    body: "Sau mỗi đề, chỉ xem câu sai + giải thích. Làm lại cùng ngày giúp nhớ lâu hơn học thêm câu mới.",
  },
  {
    id: "tip-night",
    title: "Ban đêm / trời mưa",
    body: "Giảm tốc, tăng khoảng cách, dùng đèn đúng quy định. Tránh đánh lái/phanh đột ngột trên đường trơn.",
    topicCode: "technique",
  },
  {
    id: "tip-ethics",
    title: "Văn hóa giao thông",
    body: "Nhường người đi bộ đúng nơi quy định, không dùng điện thoại khi lái, không trả đũa khi bị cắt mặt.",
    topicCode: "ethics",
  },
];

function sign(
  id: string,
  code: string,
  name: string,
  group: GplxSignGroup,
  meaning: string,
  source: GplxSign["source"] = "commons",
): GplxSign {
  return { id, code, name, group, meaning, imageUrl: gplxSignImagePath(code), source };
}

/**
 * Biển báo kèm hình SVG (Wikimedia Commons / PD-VietnamGov + QCVN 41 diagrams).
 * Xem `apps/web/public/gplx/SOURCES.md`.
 */
export const GPLX_SIGNS: GplxSign[] = [
  sign("s1", "P.101", "Đường cấm", "cam", "Cấm các loại xe đi vào theo hướng đặt biển (trừ ưu tiên khi được phép)."),
  sign("s2", "P.102", "Cấm đi ngược chiều", "cam", "Cấm đi vào theo chiều đặt biển trên đường một chiều / đoạn cấm ngược chiều."),
  sign("s3", "P.103a", "Cấm ô tô", "cam", "Cấm xe ô tô đi vào."),
  sign("s4", "P.104", "Cấm mô tô", "cam", "Cấm xe mô tô đi vào."),
  sign("s5", "P.105", "Cấm ô tô và mô tô", "cam", "Cấm đồng thời ô tô và mô tô."),
  sign("s6", "P.106a", "Cấm xe tải", "cam", "Cấm xe tải (theo loại/khối lượng ghi trên biển hoặc biển phụ)."),
  sign("s7", "P.107", "Cấm xe máy kéo, máy nông nghiệp", "cam", "Cấm các loại xe máy kéo, máy nông nghiệp đi vào."),
  sign("s8", "P.112", "Cấm người đi bộ", "cam", "Cấm người đi bộ đi vào đoạn đường có đặt biển."),
  sign("s9", "P.117", "Hạn chế chiều cao", "cam", "Cấm xe có chiều cao (kể cả hàng hóa) vượt quá trị số ghi trên biển."),
  sign("s10", "P.122", "Dừng lại", "cam", "Phải dừng hẳn trước biển/vạch và chỉ đi khi bảo đảm an toàn."),
  sign("s11", "P.123a", "Cấm rẽ trái", "cam", "Cấm các xe rẽ trái (có thể vẫn được quay đầu tùy biển phụ)."),
  sign("s12", "P.124a", "Cấm rẽ phải", "cam", "Cấm các xe rẽ phải tại vị trí đặt biển.", "edu_original"),
  sign("s13", "P.127a", "Tốc độ tối đa cho phép", "cam", "Không được vượt quá tốc độ ghi trên biển trong khu vực hiệu lực."),
  sign("s14", "P.128", "Cấm sử dụng còi", "cam", "Cấm bấm còi trong phạm vi hiệu lực của biển."),
  sign("s15", "P.130", "Cấm dừng và đỗ xe", "cam", "Cấm dừng và đỗ xe bên đường có đặt biển."),
  sign("s16", "P.135", "Hết tất cả các lệnh cấm", "cam", "Bãi bỏ hiệu lực các biển cấm đã đặt trước đó."),

  sign("s17", "W.201a", "Chỗ ngoặt nguy hiểm bên trái", "nguy_hiem", "Cảnh báo chỗ ngoặt nguy hiểm bên trái; giảm tốc, đi đúng phần đường."),
  sign("s18", "W.205a", "Đường giao nhau", "nguy_hiem", "Sắp đến nơi đường giao nhau; quan sát, nhường đường đúng quy tắc."),
  sign("s19", "W.207a", "Giao nhau với đường không ưu tiên", "nguy_hiem", "Giao nhau với đường không ưu tiên; vẫn phải quan sát an toàn."),
  sign("s20", "W.208", "Giao nhau với đường ưu tiên", "nguy_hiem", "Sắp giao với đường ưu tiên; phải nhường đường."),
  sign("s21", "W.210", "Giao nhau với đường ưu tiên", "nguy_hiem", "Cảnh báo giao với đường ưu tiên (biến thể hình); nhường theo quy định."),
  sign("s22", "W.219", "Dốc xuống nguy hiểm", "nguy_hiem", "Đoạn đường phía trước có dốc xuống nguy hiểm; chủ động giảm tốc."),
  sign("s23", "W.224", "Đường người đi bộ cắt ngang", "nguy_hiem", "Có đường người đi bộ cắt ngang; giảm tốc, nhường người đi bộ."),
  sign("s24", "W.225", "Trẻ em", "nguy_hiem", "Khu vực gần trường học / trẻ em qua đường; đi chậm, chú ý quan sát."),
  sign("s25", "W.226", "Đường người đi xe đạp cắt ngang", "nguy_hiem", "Có người đi xe đạp cắt ngang; giảm tốc, quan sát."),
  sign("s26", "W.233", "Nguy hiểm khác", "nguy_hiem", "Có tình huống nguy hiểm khác không thể hiện bằng biển riêng."),
  sign("s27", "W.234", "Giao nhau với đường sắt có rào chắn", "nguy_hiem", "Sắp đến đường ngang cắt đường sắt có rào chắn."),
  sign("s28", "W.235", "Giao nhau với đường sắt không rào chắn", "nguy_hiem", "Sắp đến đường ngang cắt đường sắt không rào chắn; đặc biệt thận trọng."),
  sign("s29", "W.245a", "Đi chậm", "nguy_hiem", "Cảnh báo cần đi chậm tại đoạn đường phía trước."),

  sign("s30", "R.301a", "Hướng đi phải theo (trái)", "hieu_lenh", "Các xe chỉ được đi theo hướng mũi tên sang trái."),
  sign("s31", "R.301b", "Hướng đi phải theo (phải)", "hieu_lenh", "Các xe chỉ được đi theo hướng mũi tên sang phải."),
  sign("s32", "R.302a", "Hướng đi phải theo (thẳng)", "hieu_lenh", "Các xe chỉ được đi thẳng theo mũi tên."),
  sign("s33", "R.303", "Nơi giao nhau chạy theo vòng xuyến", "hieu_lenh", "Phải chạy theo vòng xuyến tại nơi giao nhau."),
  sign("s34", "R.305", "Đường dành cho người đi bộ", "hieu_lenh", "Đường chỉ dành cho người đi bộ."),
  sign("s35", "R.306", "Đường dành cho xe đạp", "hieu_lenh", "Đường dành cho xe đạp."),
  sign("s36", "R.307", "Đường dành cho người đi bộ và xe đạp", "hieu_lenh", "Đường dành chung cho người đi bộ và xe đạp."),
  sign("s37", "R.411", "Biển báo khu vực có hiệu lực", "hieu_lenh", "Thể hiện khu vực bắt đầu áp dụng quy định ghi trên biển."),

  sign("s38", "I.401", "Bắt đầu đường ưu tiên", "chi_dan", "Đoạn đường phía trước là đường ưu tiên."),
  sign("s39", "I.407a", "Hết đường ưu tiên", "chi_dan", "Kết thúc đoạn đường ưu tiên."),
  sign("s40", "I.423a", "Bệnh viện", "chi_dan", "Chỉ dẫn vị trí bệnh viện."),
  sign("s41", "I.434a", "Bến xe buýt", "chi_dan", "Chỉ dẫn vị trí bến xe buýt."),
  sign("s42", "I.439", "Đường cao tốc", "chi_dan", "Chỉ dẫn liên quan đường cao tốc / lối ra vào theo biển."),

  sign("s43", "S.501", "Phạm vi tác dụng của biển", "phu", "Biển phụ ghi khoảng cách/phạm vi hiệu lực của biển chính."),
];

export const GPLX_SITUATIONS: GplxSituationIllustration[] = [
  {
    id: "sit-intersection",
    title: "Ngã tư không đèn",
    description: "Xác định thứ tự ưu tiên khi không có đèn/biển điều khiển.",
    imageUrl: gplxSituationImagePath("intersection-uncontrolled"),
    topicHints: ["situations", "giao lộ", "ưu tiên"],
  },
  {
    id: "sit-pedestrian",
    title: "Vạch sang đường",
    description: "Nhường người đi bộ đang qua đường tại vạch.",
    imageUrl: gplxSituationImagePath("pedestrian-crossing"),
    topicHints: ["situations", "người đi bộ"],
  },
  {
    id: "sit-light",
    title: "Đèn tín hiệu",
    description: "Dừng trước vạch khi đèn đỏ; xử lý đèn vàng đúng quy tắc.",
    imageUrl: gplxSituationImagePath("traffic-light"),
    topicHints: ["situations", "đèn"],
  },
  {
    id: "sit-priority",
    title: "Đường ưu tiên",
    description: "Xe đường nhánh nhường xe trên đường ưu tiên.",
    imageUrl: gplxSituationImagePath("priority-road"),
    topicHints: ["situations", "ưu tiên"],
  },
  {
    id: "sit-overtake",
    title: "Vượt xe",
    description: "Chỉ vượt khi đủ tầm nhìn, đúng phần đường, không bị cấm.",
    imageUrl: gplxSituationImagePath("overtake"),
    topicHints: ["situations", "vượt"],
  },
  {
    id: "sit-rail",
    title: "Đường ngang cắt đường sắt",
    description: "Quan sát tín hiệu/rào; không vượt khi không bảo đảm an toàn.",
    imageUrl: gplxSituationImagePath("railway-crossing"),
    topicHints: ["situations", "đường sắt"],
  },
  {
    id: "sit-roundabout",
    title: "Vòng xuyến",
    description: "Tuân thủ biển và hiệu lệnh tại vòng xuyến.",
    imageUrl: gplxSituationImagePath("roundabout"),
    topicHints: ["situations", "vòng xuyến"],
  },
  {
    id: "sit-emergency",
    title: "Xe ưu tiên",
    description: "Giảm tốc, tránh hoặc dừng để nhường xe ưu tiên có tín hiệu.",
    imageUrl: gplxSituationImagePath("emergency-vehicle"),
    topicHints: ["situations", "ưu tiên", "cứu thương"],
  },
  {
    id: "sit-school",
    title: "Khu vực trường học",
    description: "Giảm tốc, chú ý trẻ em hai bên đường.",
    imageUrl: gplxSituationImagePath("school-zone"),
    topicHints: ["situations", "trường", "trẻ em"],
  },
  {
    id: "sit-merge",
    title: "Nhập làn cao tốc",
    description: "Tăng tốc trên làn tăng tốc rồi nhập khi khoảng trống an toàn.",
    imageUrl: gplxSituationImagePath("highway-merge"),
    topicHints: ["situations", "cao tốc"],
  },
];

/** Pick a situation illustration for a question stem (best-effort keyword match). */
export function matchSituationIllustration(stem: string): GplxSituationIllustration | null {
  const s = stem.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/đèn (đỏ|vàng|xanh)|tín hiệu/, "sit-light"],
    [/người đi bộ|vạch sang đường/, "sit-pedestrian"],
    [/đường sắt|đường ngang/, "sit-rail"],
    [/vòng xuyến/, "sit-roundabout"],
    [/xe ưu tiên|cứu thương|chữa cháy|cảnh sát/, "sit-emergency"],
    [/trường học|trẻ em/, "sit-school"],
    [/cao tốc|nhập làn tăng tốc/, "sit-merge"],
    [/vượt/, "sit-overtake"],
    [/đường ưu tiên|đường nhánh/, "sit-priority"],
    [/giao lộ|ngã tư/, "sit-intersection"],
  ];
  for (const [re, id] of rules) {
    if (re.test(s)) {
      return GPLX_SITUATIONS.find((x) => x.id === id) ?? null;
    }
  }
  return null;
}

/** Pick a sign illustration if stem mentions a known code or clear sign keyword. */
export function matchSignIllustration(stem: string): GplxSign | null {
  const codeMatch = stem.match(/\b([PWRIS]\.\d+[a-z]?)\b/i);
  if (codeMatch) {
    const code = codeMatch[1]!.toUpperCase().replace(/^([PWRIS])\.?/i, (_, p) => `${p.toUpperCase()}.`);
    const normalized = code.includes(".") ? code : code;
    const hit =
      GPLX_SIGNS.find((s) => s.code.toLowerCase() === codeMatch[1]!.toLowerCase()) ||
      GPLX_SIGNS.find((s) => s.code.replace(".", "").toLowerCase() === codeMatch[1]!.replace(".", "").toLowerCase());
    if (hit) return hit;
    void normalized;
  }
  const s = stem.toLowerCase();
  const keyword: Array<[RegExp, string]> = [
    [/cấm đi ngược chiều/, "P.102"],
    [/đường cấm(?! dừng)/, "P.101"],
    [/cấm rẽ trái/, "P.123a"],
    [/cấm rẽ phải/, "P.124a"],
    [/cấm dừng và đỗ|cấm dừng đỗ/, "P.130"],
    [/tốc độ tối đa/, "P.127a"],
    [/hết mọi lệnh cấm|hết tất cả các lệnh cấm/, "P.135"],
    [/biển stop|dừng lại/, "P.122"],
    [/trẻ em/, "W.225"],
    [/người đi bộ cắt ngang/, "W.224"],
    [/đường sắt không rào/, "W.235"],
    [/đường sắt có rào/, "W.234"],
    [/vòng xuyến/, "R.303"],
    [/bến xe buýt/, "I.434a"],
    [/đường ưu tiên/, "I.401"],
  ];
  for (const [re, code] of keyword) {
    if (re.test(s)) {
      return GPLX_SIGNS.find((x) => x.code === code) ?? null;
    }
  }
  return null;
}

export type GplxPlanDay = {
  day: number;
  title: string;
  focus: string;
  actions: string[];
  targetMocks: number;
};

/** Deterministic 7-day crash plan keyed by license class. */
export function buildGplxSevenDayPlan(licenseClass: string): GplxPlanDay[] {
  const rules = getGplxExamRules(licenseClass);
  const cls = rules.licenseClass as GplxLicenseClassCode;
  return [
    {
      day: 1,
      title: "Làm quen cấu trúc đề",
      focus: `Hạng ${cls}: ${rules.questionCount} câu / ${Math.round(rules.durationSec / 60)} phút`,
      actions: [
        "Đọc quy tắc đạt/không đạt và câu điểm liệt",
        "Ôn chuyên đề Khái niệm (20–30 câu)",
        "Xem 5 mẹo ghi nhớ",
      ],
      targetMocks: 0,
    },
    {
      day: 2,
      title: "Biển báo + hình",
      focus: "Nhận dạng nhanh theo nhóm biển",
      actions: [
        "Học thư viện biển có hình (cấm / nguy hiểm / hiệu lệnh)",
        "Flashcard biển báo 15–20 thẻ",
        "Ôn chuyên đề Biển báo",
      ],
      targetMocks: 0,
    },
    {
      day: 3,
      title: "Sa hình có minh họa",
      focus: "Ưu tiên, vượt, đèn, đường sắt",
      actions: [
        "Xem minh họa tình huống + làm chuyên đề Sa hình",
        "Drill câu điểm liệt",
      ],
      targetMocks: 1,
    },
    {
      day: 4,
      title: "Đạo đức & kỹ thuật",
      focus: "Cồn, cứu nạn, cao tốc",
      actions: ["Ôn Văn hóa – đạo đức", "Ôn Kỹ thuật lái xe", "Flashcard câu liệt"],
      targetMocks: 1,
    },
    {
      day: 5,
      title: "Thi thử chuẩn giờ",
      focus: `Đạt ổn định ≥ ${rules.passCorrectCount}/${rules.questionCount}`,
      actions: ["2 đề ngẫu nhiên đủ thời gian", "Xem lại toàn bộ câu sai"],
      targetMocks: 2,
    },
    {
      day: 6,
      title: "Bộ đề cố định",
      focus: "Lặp đến khi không còn sai liệt",
      actions: ["Làm 1–2 bộ đề cố định", "Ôn chuyên đề yếu"],
      targetMocks: 2,
    },
    {
      day: 7,
      title: "Chốt trước ngày thi",
      focus: "Giữ phong độ, ngủ đủ",
      actions: ["1 đề nhẹ buổi sáng", "Xem lại mẹo + biển khó", "Không học nhồi thêm"],
      targetMocks: 1,
    },
  ];
}

export const GPLX_PRO_PRODUCT_SLUG = "gplx-pro";
export const GPLX_FREE_MOCKS_PER_DAY = 2;
