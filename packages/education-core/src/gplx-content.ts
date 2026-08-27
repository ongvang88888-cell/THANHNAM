import type { GplxLicenseClassCode } from "./gplx";
import { getGplxExamRules } from "./gplx";

export type GplxTip = {
  id: string;
  title: string;
  body: string;
  topicCode?: string;
};

export type GplxSign = {
  id: string;
  code: string;
  name: string;
  group: "cam" | "nguy_hiem" | "hieu_lenh" | "chi_dan" | "phu";
  meaning: string;
};

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
    body: "Tròn viền đỏ = cấm; tam giác vàng = nguy hiểm; vuông/chữ nhật xanh = chỉ dẫn. Học theo hình trước khi học chữ.",
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

export const GPLX_SIGNS: GplxSign[] = [
  {
    id: "s1",
    code: "P.101",
    name: "Đường cấm",
    group: "cam",
    meaning: "Cấm các loại xe đi vào theo hướng đặt biển (trừ ưu tiên khi được phép).",
  },
  {
    id: "s2",
    code: "P.102",
    name: "Cấm đi ngược chiều",
    group: "cam",
    meaning: "Cấm đi vào theo chiều đặt biển trên đường một chiều / đoạn cấm ngược chiều.",
  },
  {
    id: "s3",
    code: "P.123a",
    name: "Cấm rẽ trái",
    group: "cam",
    meaning: "Cấm các xe rẽ trái (có thể vẫn được quay đầu tùy biển phụ).",
  },
  {
    id: "s4",
    code: "P.124a",
    name: "Cấm rẽ phải",
    group: "cam",
    meaning: "Cấm các xe rẽ phải tại vị trí đặt biển.",
  },
  {
    id: "s5",
    code: "P.127",
    name: "Tốc độ tối đa cho phép",
    group: "cam",
    meaning: "Không được vượt quá tốc độ ghi trên biển trong khu vực hiệu lực.",
  },
  {
    id: "s6",
    code: "P.130",
    name: "Cấm dừng và đỗ xe",
    group: "cam",
    meaning: "Cấm dừng và đỗ xe bên đường có đặt biển.",
  },
  {
    id: "s7",
    code: "W.201",
    name: "Chỗ ngoặt nguy hiểm bên trái",
    group: "nguy_hiem",
    meaning: "Cảnh báo đoạn đường sắp có chỗ ngoặt nguy hiểm bên trái; giảm tốc, đi đúng phần đường.",
  },
  {
    id: "s8",
    code: "W.210",
    name: "Giao nhau với đường ưu tiên",
    group: "nguy_hiem",
    meaning: "Sắp đến nơi giao nhau với đường ưu tiên; phải nhường đường theo quy định.",
  },
  {
    id: "s9",
    code: "W.224",
    name: "Đường người đi bộ cắt ngang",
    group: "nguy_hiem",
    meaning: "Có đường người đi bộ cắt ngang; giảm tốc, quan sát, nhường người đi bộ.",
  },
  {
    id: "s10",
    code: "W.225",
    name: "Trẻ em",
    group: "nguy_hiem",
    meaning: "Khu vực gần trường học / trẻ em qua đường; đi chậm, chú ý quan sát.",
  },
  {
    id: "s11",
    code: "R.301",
    name: "Hướng đi phải theo",
    group: "hieu_lenh",
    meaning: "Các xe chỉ được đi theo hướng mũi tên ghi trên biển.",
  },
  {
    id: "s12",
    code: "R.122",
    name: "Dừng lại",
    group: "hieu_lenh",
    meaning: "Phải dừng hẳn trước biển/vạch và chỉ đi khi bảo đảm an toàn.",
  },
  {
    id: "s13",
    code: "I.401",
    name: "Bắt đầu đường ưu tiên",
    group: "chi_dan",
    meaning: "Đoạn đường phía trước là đường ưu tiên.",
  },
  {
    id: "s14",
    code: "I.434",
    name: "Bến xe buýt",
    group: "chi_dan",
    meaning: "Chỉ dẫn vị trí bến xe buýt.",
  },
  {
    id: "s15",
    code: "S.501",
    name: "Phạm vi tác dụng của biển",
    group: "phu",
    meaning: "Biển phụ ghi khoảng cách/phạm vi hiệu lực của biển chính.",
  },
];

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
      title: "Biển báo",
      focus: "Nhóm cấm · nguy hiểm · hiệu lệnh",
      actions: ["Học thư viện biển báo", "Ôn chuyên đề Biển báo", "Ôn 10 câu điểm liệt"],
      targetMocks: 1,
    },
    {
      day: 3,
      title: "Sa hình & tình huống",
      focus: "Nhường đường, vượt, giao lộ",
      actions: ["Ôn chuyên đề Sa hình", "Xem lại câu hay sai", "Thi thử 1 đề"],
      targetMocks: 1,
    },
    {
      day: 4,
      title: "Đạo đức & kỹ thuật",
      focus: "An toàn · cứu nạn · kỹ thuật cơ bản",
      actions: ["Ôn Văn hóa giao thông", "Ôn Kỹ thuật lái xe", "Ôn toàn bộ câu liệt"],
      targetMocks: 1,
    },
    {
      day: 5,
      title: "Luyện đề cường độ",
      focus: `Đạt ổn định ≥ ${rules.passCorrectCount}/${rules.questionCount}`,
      actions: ["Thi thử 2 đề đủ giờ", "Chỉ ôn câu sai sau mỗi đề"],
      targetMocks: 2,
    },
    {
      day: 6,
      title: "Vá lỗ hổng",
      focus: "Chuyên đề yếu nhất theo thống kê",
      actions: ["Ôn lại chuyên đề có nhiều câu sai", "Thi thử 1–2 đề", "Ôn mẹo nhanh"],
      targetMocks: 2,
    },
    {
      day: 7,
      title: "Chốt trước ngày thi",
      focus: "Giữ phong độ, không học nhồi",
      actions: [
        "Thi thử 1 đề sáng",
        "Ôn nhẹ câu liệt + biển báo",
        "Nghỉ sớm, kiểm tra giấy tờ thi",
      ],
      targetMocks: 1,
    },
  ];
}

export const GPLX_PRO_PRODUCT_SLUG = "gplx-pro";
export const GPLX_FREE_MOCKS_PER_DAY = 2;
