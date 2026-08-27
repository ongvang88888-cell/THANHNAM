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
/** Expanded library: Wikimedia Commons Vietnam road sign SVGs (QCVN 41). */
export const GPLX_SIGNS: GplxSign[] = [
  sign("s1", "I.401", 'Bắt đầu đường ưu tiên', "chi_dan", 'Đoạn đường phía trước là đường ưu tiên.', "commons"),
  sign("s2", "I.402", 'Hết đường ưu tiên', "chi_dan", 'Kết thúc đoạn đường ưu tiên.', "commons"),
  sign("s3", "I.405a", 'Đường cụt', "chi_dan", 'Chỉ dẫn đường cụt.', "commons"),
  sign("s4", "I.407a", 'Hết đường ưu tiên', "chi_dan", 'Kết thúc đoạn đường ưu tiên.', "commons"),
  sign("s5", "I.408", 'Chỗ quay đầu xe', "chi_dan", 'Chỉ dẫn chỗ quay đầu.', "commons"),
  sign("s6", "I.409", 'Chỗ đỗ xe', "chi_dan", 'Chỉ dẫn chỗ đỗ xe.', "commons"),
  sign("s7", "I.423a", 'Bệnh viện', "chi_dan", 'Chỉ dẫn vị trí bệnh viện.', "commons"),
  sign("s8", "I.423b", 'Cấp cứu', "chi_dan", 'Chỉ dẫn nơi cấp cứu.', "commons"),
  sign("s9", "I.434a", 'Bến xe buýt', "chi_dan", 'Chỉ dẫn bến xe buýt.', "commons"),
  sign("s10", "I.434b", 'Bến xe buýt nhanh', "chi_dan", 'Chỉ dẫn bến xe buýt nhanh.', "commons"),
  sign("s11", "I.439", 'Đường cao tốc', "chi_dan", 'Chỉ dẫn đường cao tốc.', "commons"),
  sign("s12", "I.443", 'Trạm kiểm tra', "chi_dan", 'Chỉ dẫn trạm kiểm tra.', "commons"),
  sign("s13", "I.447a", 'Trạm dừng nghỉ', "chi_dan", 'Chỉ dẫn trạm dừng nghỉ.', "commons"),
  sign("s14", "I.449", 'Lối ra đường cao tốc', "chi_dan", 'Chỉ dẫn lối ra cao tốc.', "commons"),
  sign("s15", "P.101", 'Đường cấm', "cam", 'Cấm các loại xe đi vào theo hướng đặt biển.', "commons"),
  sign("s16", "P.102", 'Cấm đi ngược chiều', "cam", 'Cấm đi vào theo chiều đặt biển.', "commons"),
  sign("s17", "P.103a", 'Cấm ô tô', "cam", 'Cấm xe ô tô đi vào.', "commons"),
  sign("s18", "P.103b", 'Cấm ô tô rẽ trái', "cam", 'Cấm ô tô rẽ trái.', "commons"),
  sign("s19", "P.103c", 'Cấm ô tô rẽ phải', "cam", 'Cấm ô tô rẽ phải.', "commons"),
  sign("s20", "P.104", 'Cấm mô tô', "cam", 'Cấm xe mô tô đi vào.', "commons"),
  sign("s21", "P.105", 'Cấm ô tô và mô tô', "cam", 'Cấm đồng thời ô tô và mô tô.', "commons"),
  sign("s22", "P.106a", 'Cấm xe tải', "cam", 'Cấm xe tải theo quy định trên biển.', "commons"),
  sign("s23", "P.106b", 'Cấm xe tải theo trọng lượng', "cam", 'Cấm xe tải vượt trọng lượng ghi trên biển.', "commons"),
  sign("s24", "P.106c", 'Cấm xe tải theo số trục', "cam", 'Cấm xe tải theo số trục quy định.', "commons"),
  sign("s25", "P.107", 'Cấm xe máy kéo', "cam", 'Cấm xe máy kéo, máy nông nghiệp.', "commons"),
  sign("s26", "P.107a", 'Cấm xe công nông', "cam", 'Cấm xe công nông.', "commons"),
  sign("s27", "P.107b", 'Cấm xe kéo rơ-moóc', "cam", 'Cấm xe kéo rơ-moóc.', "commons"),
  sign("s28", "P.108", 'Cấm xe có kéo theo rơ-moóc', "cam", 'Cấm xe có kéo theo rơ-moóc.', "commons"),
  sign("s29", "P.109", 'Cấm xe đạp', "cam", 'Cấm xe đạp đi vào.', "commons"),
  sign("s30", "P.110a", 'Cấm xe thô sơ', "cam", 'Cấm các loại xe thô sơ.', "commons"),
  sign("s31", "P.110b", 'Cấm xe súc vật kéo', "cam", 'Cấm xe súc vật kéo.', "commons"),
  sign("s32", "P.111a", 'Cấm xe máy chuyên dùng', "cam", 'Cấm xe máy chuyên dùng.', "commons"),
  sign("s33", "P.111b", 'Cấm xe chở hàng nguy hiểm', "cam", 'Cấm xe chở hàng nguy hiểm.', "commons"),
  sign("s34", "P.111c", 'Cấm xe buýt', "cam", 'Cấm xe buýt.', "commons"),
  sign("s35", "P.111d", 'Cấm xe taxi', "cam", 'Cấm xe taxi.', "commons"),
  sign("s36", "P.112", 'Cấm người đi bộ', "cam", 'Cấm người đi bộ đi vào.', "commons"),
  sign("s37", "P.113", 'Cấm xe người kéo, đẩy', "cam", 'Cấm xe người kéo, đẩy.', "commons"),
  sign("s38", "P.115", 'Hạn chế trọng lượng xe', "cam", 'Cấm xe có trọng lượng vượt trị số ghi trên biển.', "commons"),
  sign("s39", "P.116", 'Hạn chế tải trọng trục', "cam", 'Cấm xe có tải trọng trục vượt trị số ghi trên biển.', "commons"),
  sign("s40", "P.117", 'Hạn chế chiều cao', "cam", 'Cấm xe có chiều cao vượt trị số ghi trên biển.', "commons"),
  sign("s41", "P.118", 'Hạn chế chiều rộng', "cam", 'Cấm xe có chiều rộng vượt trị số ghi trên biển.', "commons"),
  sign("s42", "P.119", 'Hạn chế chiều dài', "cam", 'Cấm xe có chiều dài vượt trị số ghi trên biển.', "commons"),
  sign("s43", "P.120", 'Cấm quay đầu', "cam", 'Cấm các xe quay đầu.', "commons"),
  sign("s44", "P.121", 'Cấm rẽ trái và rẽ phải', "cam", 'Cấm rẽ trái và rẽ phải.', "commons"),
  sign("s45", "P.122", 'Dừng lại', "cam", 'Phải dừng hẳn trước biển/vạch.', "commons"),
  sign("s46", "P.123a", 'Cấm rẽ trái', "cam", 'Cấm các xe rẽ trái.', "commons"),
  sign("s47", "P.123b", 'Cấm rẽ trái và quay đầu', "cam", 'Cấm rẽ trái và quay đầu.', "commons"),
  sign("s48", "P.124a", 'Cấm rẽ phải', "cam", 'Cấm các xe rẽ phải.', "commons"),
  sign("s49", "P.124b", 'Cấm rẽ phải và quay đầu', "cam", 'Cấm rẽ phải và quay đầu.', "commons"),
  sign("s50", "P.125", 'Cấm vượt', "cam", 'Cấm các xe vượt nhau.', "commons"),
  sign("s51", "P.126", 'Cấm xe cơ giới vượt', "cam", 'Cấm xe cơ giới vượt.', "commons"),
  sign("s52", "P.127a", 'Tốc độ tối đa cho phép', "cam", 'Không vượt tốc độ ghi trên biển.', "commons"),
  sign("s53", "P.127b", 'Tốc độ tối đa theo làn', "cam", 'Tốc độ tối đa theo từng làn.', "commons"),
  sign("s54", "P.127c", 'Tốc độ tối đa theo phương tiện', "cam", 'Tốc độ tối đa theo loại phương tiện.', "commons"),
  sign("s55", "P.128", 'Cấm sử dụng còi', "cam", 'Cấm bấm còi trong phạm vi hiệu lực.', "commons"),
  sign("s56", "P.129", 'Cấm kiểm tra', "cam", 'Biển báo khu vực kiểm tra (theo QCVN).', "commons"),
  sign("s57", "P.130", 'Cấm dừng và đỗ xe', "cam", 'Cấm dừng và đỗ xe.', "commons"),
  sign("s58", "P.131a", 'Cấm đỗ xe', "cam", 'Cấm đỗ xe bên đường có đặt biển.', "commons"),
  sign("s59", "P.131b", 'Cấm đỗ xe ngày chẵn', "cam", 'Cấm đỗ xe vào ngày chẵn.', "commons"),
  sign("s60", "P.131c", 'Cấm đỗ xe ngày lẻ', "cam", 'Cấm đỗ xe vào ngày lẻ.', "commons"),
  sign("s61", "P.132", 'Nhường đường cho xe cơ giới ngược chiều', "cam", 'Nhường đường cho xe cơ giới đi ngược chiều qua đường hẹp.', "commons"),
  sign("s62", "P.133", 'Hết cấm vượt', "cam", 'Bãi bỏ hiệu lực biển cấm vượt.', "commons"),
  sign("s63", "P.134", 'Hết hạn chế tốc độ tối đa', "cam", 'Bãi bỏ hiệu lực biển hạn chế tốc độ tối đa.', "commons"),
  sign("s64", "P.135", 'Hết tất cả các lệnh cấm', "cam", 'Bãi bỏ hiệu lực các biển cấm đã đặt trước.', "commons"),
  sign("s65", "P.136", 'Cấm đi thẳng', "cam", 'Cấm các xe đi thẳng.', "commons"),
  sign("s66", "P.137", 'Cấm rẽ trái (biến thể)', "cam", 'Cấm rẽ trái theo hình biển.', "commons"),
  sign("s67", "P.138", 'Cấm rẽ phải (biến thể)', "cam", 'Cấm rẽ phải theo hình biển.', "commons"),
  sign("s68", "P.139", 'Cấm xe kéo móc', "cam", 'Cấm xe kéo móc.', "commons"),
  sign("s69", "P.140", 'Cấm xe chở hàng nguy hiểm', "cam", 'Cấm xe chở hàng nguy hiểm.', "commons"),
  sign("s70", "R.301a", 'Hướng đi phải theo (trái)', "hieu_lenh", 'Chỉ được đi theo mũi tên sang trái.', "commons"),
  sign("s71", "R.301b", 'Hướng đi phải theo (phải)', "hieu_lenh", 'Chỉ được đi theo mũi tên sang phải.', "commons"),
  sign("s72", "R.301c", 'Hướng đi phải theo (thẳng)', "hieu_lenh", 'Chỉ được đi thẳng.', "commons"),
  sign("s73", "R.301d", 'Hướng đi phải theo (thẳng và trái)', "hieu_lenh", 'Chỉ được đi thẳng hoặc rẽ trái.', "commons"),
  sign("s74", "R.301e", 'Hướng đi phải theo (thẳng và phải)', "hieu_lenh", 'Chỉ được đi thẳng hoặc rẽ phải.', "commons"),
  sign("s75", "R.301f", 'Hướng đi phải theo (trái và phải)', "hieu_lenh", 'Chỉ được rẽ trái hoặc rẽ phải.', "commons"),
  sign("s76", "R.301g", 'Hướng đi phải theo (vòng)', "hieu_lenh", 'Hướng đi phải theo vòng.', "commons"),
  sign("s77", "R.302a", 'Hướng đi phải theo (thẳng)', "hieu_lenh", 'Các xe chỉ được đi thẳng.', "commons"),
  sign("s78", "R.302b", 'Hướng đi phải theo', "hieu_lenh", 'Hướng đi bắt buộc theo mũi tên.', "commons"),
  sign("s79", "R.302c", 'Hướng đi phải theo', "hieu_lenh", 'Hướng đi bắt buộc theo mũi tên.', "commons"),
  sign("s80", "R.303", 'Nơi giao nhau chạy theo vòng xuyến', "hieu_lenh", 'Phải chạy theo vòng xuyến.', "commons"),
  sign("s81", "R.304", 'Đường dành cho xe thô sơ', "hieu_lenh", 'Đường dành cho xe thô sơ.', "commons"),
  sign("s82", "R.305", 'Đường dành cho người đi bộ', "hieu_lenh", 'Đường chỉ dành cho người đi bộ.', "commons"),
  sign("s83", "R.306", 'Đường dành cho xe đạp', "hieu_lenh", 'Đường dành cho xe đạp.', "commons"),
  sign("s84", "R.307", 'Đường dành cho người đi bộ và xe đạp', "hieu_lenh", 'Đường dành chung người đi bộ và xe đạp.', "commons"),
  sign("s85", "R.308a", 'Tốc độ tối thiểu', "hieu_lenh", 'Phải đi với tốc độ không thấp hơn trị số ghi trên biển.', "commons"),
  sign("s86", "R.308b", 'Hết tốc độ tối thiểu', "hieu_lenh", 'Hết hiệu lực biển tốc độ tối thiểu.', "commons"),
  sign("s87", "R.309", 'Tốc độ tối thiểu theo làn', "hieu_lenh", 'Tốc độ tối thiểu theo làn.', "commons"),
  sign("s88", "R.310a", 'Hướng đi trên đường phải theo', "hieu_lenh", 'Hướng đi bắt buộc.', "commons"),
  sign("s89", "R.310b", 'Hướng đi trên đường phải theo', "hieu_lenh", 'Hướng đi bắt buộc.', "commons"),
  sign("s90", "R.310c", 'Hướng đi trên đường phải theo', "hieu_lenh", 'Hướng đi bắt buộc.', "commons"),
  sign("s91", "R.403a", 'Làn đường dành cho ô tô', "hieu_lenh", 'Làn đường dành cho ô tô.', "commons"),
  sign("s92", "R.403b", 'Làn đường dành cho mô tô', "hieu_lenh", 'Làn đường dành cho mô tô.', "commons"),
  sign("s93", "R.404a", 'Làn đường dành cho xe buýt', "hieu_lenh", 'Làn đường dành cho xe buýt.', "commons"),
  sign("s94", "R.404b", 'Làn đường dành cho xe đạp', "hieu_lenh", 'Làn đường dành cho xe đạp.', "commons"),
  sign("s95", "R.411", 'Biển báo khu vực có hiệu lực', "hieu_lenh", 'Khu vực bắt đầu áp dụng quy định.', "commons"),
  sign("s96", "R.412a", 'Hết khu vực có hiệu lực', "hieu_lenh", 'Hết khu vực hiệu lực.', "commons"),
  sign("s97", "R.415a", 'Làn đường', "hieu_lenh", 'Chỉ dẫn/hiệu lệnh làn đường.', "commons"),
  sign("s98", "R.415b", 'Làn đường', "hieu_lenh", 'Chỉ dẫn/hiệu lệnh làn đường.', "commons"),
  sign("s99", "R.420", 'Bắt đầu khu vực đông dân cư', "hieu_lenh", 'Bắt đầu khu vực đông dân cư.', "commons"),
  sign("s100", "R.421", 'Hết khu vực đông dân cư', "hieu_lenh", 'Hết khu vực đông dân cư.', "commons"),
  sign("s101", "S.501", 'Phạm vi tác dụng của biển', "phu", 'Khoảng cách/phạm vi hiệu lực của biển chính.', "commons"),
  sign("s102", "S.502", 'Khoảng cách đến đối tượng báo hiệu', "phu", 'Khoảng cách đến chỗ nguy hiểm/đối tượng.', "commons"),
  sign("s103", "S.503a", 'Hướng tác dụng của biển', "phu", 'Hướng tác dụng của biển chính.', "commons"),
  sign("s104", "S.503b", 'Hướng tác dụng của biển', "phu", 'Hướng tác dụng của biển chính.', "commons"),
  sign("s105", "S.504", 'Làn đường', "phu", 'Biển phụ chỉ làn đường áp dụng.', "commons"),
  sign("s106", "S.505a", 'Loại xe', "phu", 'Biển phụ chỉ loại xe áp dụng.', "commons"),
  sign("s107", "S.505b", 'Loại xe', "phu", 'Biển phụ chỉ loại xe áp dụng.', "commons"),
  sign("s108", "S.507", 'Hướng đường ưu tiên', "phu", 'Chỉ hướng đường ưu tiên.', "commons"),
  sign("s109", "S.509a", 'Hướng đường ưu tiên', "phu", 'Hướng đường ưu tiên.', "commons"),
  sign("s110", "S.509b", 'Hướng đường ưu tiên', "phu", 'Hướng đường ưu tiên.', "commons"),
  sign("s111", "S.510", 'Chiều mũi tên', "phu", 'Biển phụ hướng mũi tên.', "commons"),
  sign("s112", "W.201a", 'Chỗ ngoặt nguy hiểm bên trái', "nguy_hiem", 'Chỗ ngoặt nguy hiểm bên trái.', "commons"),
  sign("s113", "W.201b", 'Chỗ ngoặt nguy hiểm bên phải', "nguy_hiem", 'Chỗ ngoặt nguy hiểm bên phải.', "commons"),
  sign("s114", "W.201c", 'Nhiều chỗ ngoặt nguy hiểm liên tiếp bên trái', "nguy_hiem", 'Nhiều chỗ ngoặt liên tiếp bên trái.', "commons"),
  sign("s115", "W.201d", 'Nhiều chỗ ngoặt nguy hiểm liên tiếp bên phải', "nguy_hiem", 'Nhiều chỗ ngoặt liên tiếp bên phải.', "commons"),
  sign("s116", "W.202a", 'Đường bị hẹp cả hai bên', "nguy_hiem", 'Đường phía trước bị hẹp cả hai bên.', "commons"),
  sign("s117", "W.202b", 'Đường bị hẹp về phía trái', "nguy_hiem", 'Đường bị hẹp về phía trái.', "commons"),
  sign("s118", "W.203a", 'Đường hai chiều', "nguy_hiem", 'Đường phía trước có xe đi hai chiều.', "commons"),
  sign("s119", "W.203b", 'Đường hai chiều tạm thời', "nguy_hiem", 'Đường hai chiều tạm thời.', "commons"),
  sign("s120", "W.203c", 'Đường hai chiều hết tạm thời', "nguy_hiem", 'Hết đoạn đường hai chiều tạm thời.', "commons"),
  sign("s121", "W.204", 'Đường giao nhau cùng mức với đường tàu điện', "nguy_hiem", 'Giao nhau với đường tàu điện.', "commons"),
  sign("s122", "W.205a", 'Đường giao nhau', "nguy_hiem", 'Sắp đến nơi đường giao nhau.', "commons"),
  sign("s123", "W.205b", 'Đường giao nhau (biến thể)', "nguy_hiem", 'Đường giao nhau dạng chữ.', "commons"),
  sign("s124", "W.205c", 'Đường giao nhau (biến thể)', "nguy_hiem", 'Đường giao nhau dạng chữ.', "commons"),
  sign("s125", "W.205d", 'Đường giao nhau (biến thể)', "nguy_hiem", 'Đường giao nhau dạng chữ.', "commons"),
  sign("s126", "W.205e", 'Đường giao nhau (biến thể)', "nguy_hiem", 'Đường giao nhau dạng chữ.', "commons"),
  sign("s127", "W.206", 'Giao nhau với đường không ưu tiên', "nguy_hiem", 'Giao nhau với đường không ưu tiên.', "commons"),
  sign("s128", "W.207a", 'Giao nhau với đường không ưu tiên', "nguy_hiem", 'Giao nhau với đường không ưu tiên.', "commons"),
  sign("s129", "W.207b", 'Giao nhau với đường không ưu tiên', "nguy_hiem", 'Giao nhau với đường không ưu tiên.', "commons"),
  sign("s130", "W.207c", 'Giao nhau với đường không ưu tiên', "nguy_hiem", 'Giao nhau với đường không ưu tiên.', "commons"),
  sign("s131", "W.208", 'Giao nhau với đường ưu tiên', "nguy_hiem", 'Sắp giao với đường ưu tiên.', "commons"),
  sign("s132", "W.209", 'Giao nhau với đường ưu tiên', "nguy_hiem", 'Giao với đường ưu tiên.', "commons"),
  sign("s133", "W.210", 'Giao nhau với đường ưu tiên', "nguy_hiem", 'Cảnh báo giao với đường ưu tiên.', "commons"),
  sign("s134", "W.211a", 'Hết đoạn đường ưu tiên', "nguy_hiem", 'Hết đoạn đường ưu tiên.', "commons"),
  sign("s135", "W.211b", 'Bắt đầu đoạn đường ưu tiên', "nguy_hiem", 'Bắt đầu đoạn đường ưu tiên.', "commons"),
  sign("s136", "W.212", 'Cầu hẹp', "nguy_hiem", 'Phía trước có cầu hẹp.', "commons"),
  sign("s137", "W.213", 'Cầu tạm', "nguy_hiem", 'Phía trước có cầu tạm.', "commons"),
  sign("s138", "W.214", 'Cầu xoay / cầu cất', "nguy_hiem", 'Phía trước có cầu xoay hoặc cầu cất.', "commons"),
  sign("s139", "W.215a", 'Kè vực sâu bên đường bên trái', "nguy_hiem", 'Có kè/vực sâu bên trái.', "commons"),
  sign("s140", "W.215b", 'Kè vực sâu bên đường bên phải', "nguy_hiem", 'Có kè/vực sâu bên phải.', "commons"),
  sign("s141", "W.215c", 'Kè vực sâu hai bên', "nguy_hiem", 'Có kè/vực sâu hai bên.', "commons"),
  sign("s142", "W.216a", 'Đường ngầm', "nguy_hiem", 'Phía trước có đường ngầm.', "commons"),
  sign("s143", "W.216b", 'Bến phà', "nguy_hiem", 'Phía trước có bến phà.', "commons"),
  sign("s144", "W.217", 'Đá lở', "nguy_hiem", 'Khu vực có nguy cơ đá lở.', "commons"),
  sign("s145", "W.218", 'Sạt lở đất đá', "nguy_hiem", 'Nguy cơ sạt lở đất đá.', "commons"),
  sign("s146", "W.219", 'Dốc xuống nguy hiểm', "nguy_hiem", 'Đoạn đường có dốc xuống nguy hiểm.', "commons"),
  sign("s147", "W.220", 'Dốc lên nguy hiểm', "nguy_hiem", 'Đoạn đường có dốc lên nguy hiểm.', "commons"),
  sign("s148", "W.221a", 'Đường trơn', "nguy_hiem", 'Đoạn đường phía trước dễ trơn trượt.', "commons"),
  sign("s149", "W.221b", 'Lề đường nguy hiểm', "nguy_hiem", 'Lề đường nguy hiểm.', "commons"),
  sign("s150", "W.222a", 'Vách núi bên trái', "nguy_hiem", 'Có vách núi bên trái.', "commons"),
  sign("s151", "W.222b", 'Vách núi bên phải', "nguy_hiem", 'Có vách núi bên phải.', "commons"),
  sign("s152", "W.223a", 'Đường người đi bộ cắt ngang', "nguy_hiem", 'Có đường người đi bộ cắt ngang.', "commons"),
  sign("s153", "W.223b", 'Đường người đi bộ cắt ngang (biến thể)', "nguy_hiem", 'Người đi bộ cắt ngang.', "commons"),
  sign("s154", "W.224", 'Đường người đi bộ cắt ngang', "nguy_hiem", 'Có đường người đi bộ cắt ngang.', "commons"),
  sign("s155", "W.225", 'Trẻ em', "nguy_hiem", 'Khu vực gần trường học / trẻ em.', "commons"),
  sign("s156", "W.226", 'Đường người đi xe đạp cắt ngang', "nguy_hiem", 'Người đi xe đạp cắt ngang.', "commons"),
  sign("s157", "W.227", 'Công trường', "nguy_hiem", 'Phía trước có công trường.', "commons"),
  sign("s158", "W.228a", 'Đá rơi', "nguy_hiem", 'Nguy cơ đá rơi bên trái.', "commons"),
  sign("s159", "W.228b", 'Đá rơi', "nguy_hiem", 'Nguy cơ đá rơi bên phải.', "commons"),
  sign("s160", "W.228c", 'Đá rơi', "nguy_hiem", 'Nguy cơ đá rơi.', "commons"),
  sign("s161", "W.228d", 'Đá rơi', "nguy_hiem", 'Nguy cơ đá rơi.', "commons"),
  sign("s162", "W.229", 'Gió ngang', "nguy_hiem", 'Đoạn đường có gió ngang mạnh.', "commons"),
  sign("s163", "W.230", 'Nguy hiểm cháy nổ', "nguy_hiem", 'Khu vực nguy hiểm cháy nổ.', "commons"),
  sign("s164", "W.231", 'Thú rừng qua đường', "nguy_hiem", 'Có thú rừng qua đường.', "commons"),
  sign("s165", "W.232", 'Máy bay', "nguy_hiem", 'Gần khu vực máy bay hạ/cất cánh.', "commons"),
  sign("s166", "W.233", 'Nguy hiểm khác', "nguy_hiem", 'Nguy hiểm khác không thể hiện bằng biển riêng.', "commons"),
  sign("s167", "W.234", 'Giao nhau với đường sắt có rào chắn', "nguy_hiem", 'Đường ngang cắt đường sắt có rào chắn.', "commons"),
  sign("s168", "W.235", 'Giao nhau với đường sắt không rào chắn', "nguy_hiem", 'Đường ngang cắt đường sắt không rào chắn.', "commons"),
  sign("s169", "W.236", 'Giao nhau với đường tàu điện', "nguy_hiem", 'Giao nhau với đường tàu điện.', "commons"),
  sign("s170", "W.237", 'Đường cao tốc phía trước', "nguy_hiem", 'Sắp vào đường cao tốc.', "commons"),
  sign("s171", "W.238", 'Đường hầm', "nguy_hiem", 'Phía trước có đường hầm.', "commons"),
  sign("s172", "W.239a", 'Đường đôi', "nguy_hiem", 'Bắt đầu đường đôi.', "commons"),
  sign("s173", "W.239b", 'Hết đường đôi', "nguy_hiem", 'Hết đường đôi.', "commons"),
  sign("s174", "W.240", 'Đường có sóng', "nguy_hiem", 'Đường có nhiều chỗ lồi lõm.', "commons"),
  sign("s175", "W.241", 'Nền đường yếu', "nguy_hiem", 'Nền đường yếu.', "commons"),
  sign("s176", "W.242a", 'Đoạn đường hay xảy ra tai nạn', "nguy_hiem", 'Đoạn đường hay xảy ra tai nạn.', "commons"),
  sign("s177", "W.242b", 'Đoạn đường hay xảy ra tai nạn', "nguy_hiem", 'Đoạn đường hay xảy ra tai nạn.', "commons"),
  sign("s178", "W.243a", 'Gần đường sắt', "nguy_hiem", 'Gần khu vực đường sắt.', "commons"),
  sign("s179", "W.244", 'Đoạn đường ứ đọng nước', "nguy_hiem", 'Có đoạn đường ứ đọng nước.', "commons"),
  sign("s180", "W.245a", 'Đi chậm', "nguy_hiem", 'Cần đi chậm tại đoạn đường phía trước.', "commons"),
  sign("s181", "W.245b", 'Đi chậm (biến thể)', "nguy_hiem", 'Cần đi chậm.', "commons"),
  sign("s182", "W.246a", 'Chú ý chướng ngại vật', "nguy_hiem", 'Có chướng ngại vật phía trước.', "commons"),
  sign("s183", "W.246b", 'Chú ý chướng ngại vật', "nguy_hiem", 'Có chướng ngại vật phía trước.', "commons"),
  sign("s184", "W.247", 'Chú ý xe đỗ', "nguy_hiem", 'Có xe đỗ bên đường.', "commons"),
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
  {
    id: "sit-solid-yellow",
    title: "Vạch vàng liền",
    description: "Không vượt / không sang phần đường ngược chiều khi có vạch vàng liền.",
    imageUrl: gplxSituationImagePath("solid-yellow-line"),
    topicHints: ["signs", "situations", "vạch"],
  },
  {
    id: "sit-dashed-white",
    title: "Vạch trắng đứt",
    description: "Được vượt khi bảo đảm an toàn và không bị biển cấm vượt.",
    imageUrl: gplxSituationImagePath("dashed-white-line"),
    topicHints: ["signs", "situations", "vạch"],
  },
  {
    id: "sit-bus-lane",
    title: "Làn xe buýt",
    description: "Không đi vào làn dành riêng cho xe buýt trừ khi được phép.",
    imageUrl: gplxSituationImagePath("bus-lane"),
    topicHints: ["signs", "situations", "xe buýt"],
  },
  {
    id: "sit-rain",
    title: "Đường mưa trơn",
    description: "Giảm tốc, tăng khoảng cách an toàn khi trời mưa / đường trơn.",
    imageUrl: gplxSituationImagePath("rain-wet-road"),
    topicHints: ["situations", "technique", "mưa"],
  },
  {
    id: "sit-narrow",
    title: "Đường hẹp tránh xe ngược chiều",
    description: "Nhường / dừng đúng chỗ để hai xe qua đường hẹp an toàn.",
    imageUrl: gplxSituationImagePath("narrow-road-yield"),
    topicHints: ["situations", "đường hẹp"],
  },
  {
    id: "sit-left-turn",
    title: "Rẽ trái tại đèn",
    description: "Theo tín hiệu và nhường xe/người đi bộ đúng quy tắc.",
    imageUrl: gplxSituationImagePath("left-turn-signal"),
    topicHints: ["situations", "rẽ trái"],
  },
  {
    id: "sit-exit",
    title: "Ra khỏi cao tốc",
    description: "Chuyển sớm sang làn giảm tốc trước khi ra khỏi cao tốc.",
    imageUrl: gplxSituationImagePath("highway-exit"),
    topicHints: ["situations", "cao tốc"],
  },
  {
    id: "sit-emergency-lane",
    title: "Làn dừng khẩn cấp",
    description: "Chỉ dùng khi sự cố; bật đèn cảnh báo.",
    imageUrl: gplxSituationImagePath("emergency-lane"),
    topicHints: ["situations", "cao tốc"],
  },
  {
    id: "sit-slope",
    title: "Dừng đỗ trên dốc",
    description: "Phanh tay / số phù hợp; chống trôi khi dừng trên dốc.",
    imageUrl: gplxSituationImagePath("stop-on-slope"),
    topicHints: ["situations", "dốc"],
  },
  {
    id: "sit-no-stop",
    title: "Cấm dừng tại giao lộ",
    description: "Không dừng/đỗ trong phạm vi cấm gần giao lộ.",
    imageUrl: gplxSituationImagePath("no-stop-intersection"),
    topicHints: ["situations", "dừng đỗ"],
  },
  {
    id: "sit-reverse",
    title: "Lùi xe",
    description: "Quan sát phía sau; không lùi trên cao tốc / nơi cấm.",
    imageUrl: gplxSituationImagePath("reverse-maneuver"),
    topicHints: ["situations", "lùi"],
  },
  {
    id: "sit-lane-change",
    title: "Chuyển làn",
    description: "Báo hiệu sớm, quan sát điểm mù, nhường xe đã ở làn đích.",
    imageUrl: gplxSituationImagePath("lane-change"),
    topicHints: ["situations", "chuyển làn"],
  },
  {
    id: "sit-flood",
    title: "Đường ngập nước",
    description: "Giảm tốc; không cố qua đoạn ngập sâu không rõ đáy.",
    imageUrl: gplxSituationImagePath("flooded-road"),
    topicHints: ["situations", "ngập"],
  },
  {
    id: "sit-sudden-brake",
    title: "Xe trước phanh gấp",
    description: "Giữ khoảng cách; giảm tốc kịp thời, tránh đánh lái đột ngột.",
    imageUrl: gplxSituationImagePath("sudden-brake"),
    topicHints: ["situations", "phanh"],
  },
  {
    id: "sit-school-park",
    title: "Cổng trường giờ tan học",
    description: "Không dừng/đỗ cản trở học sinh trước cổng trường.",
    imageUrl: gplxSituationImagePath("school-no-parking"),
    topicHints: ["situations", "trường"],
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
    [/cổng trường|tan học/, "sit-school-park"],
    [/trường học|học sinh|trẻ em/, "sit-school"],
    [/ra khỏi cao tốc|làn giảm tốc/, "sit-exit"],
    [/làn dừng khẩn cấp|dừng khẩn cấp/, "sit-emergency-lane"],
    [/nhập làn tăng tốc|nhập làn từ/, "sit-merge"],
    [/cao tốc/, "sit-merge"],
    [/vạch vàng|vạch liền màu vàng/, "sit-solid-yellow"],
    [/vạch (trắng )?(nét )?đứt|vạch đứt màu trắng/, "sit-dashed-white"],
    [/làn.*xe buýt|xe buýt/, "sit-bus-lane"],
    [/mưa|đường trơn/, "sit-rain"],
    [/ngập nước|ngập/, "sit-flood"],
    [/đường hẹp|ngược chiều trên đường hẹp/, "sit-narrow"],
    [/rẽ trái.*đèn|đèn.*rẽ trái/, "sit-left-turn"],
    [/xe trước đang rẽ trái/, "sit-overtake"],
    [/trên dốc|đỗ xe trên dốc|dừng.*dốc|xuống dốc|lên dốc|đèo/, "sit-slope"],
    [/cấm dừng.*giao lộ|giao lộ.*cấm dừng|trên cầu|đường hầm/, "sit-no-stop"],
    [/lùi xe|khi muốn lùi/, "sit-reverse"],
    [/chuyển làn|chuyển hướng/, "sit-lane-change"],
    [/phanh gấp|khoảng cách an toàn/, "sit-sudden-brake"],
    [/ban đêm|thiếu sáng/, "sit-rain"],
    [/vượt/, "sit-overtake"],
    [/đường ưu tiên|đường nhánh/, "sit-priority"],
    [/giao lộ|ngã tư|hiệu lệnh nào được ưu tiên/, "sit-intersection"],
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
    [/biển báo cấm thường có hình|hình dạng.*cấm|biển báo cấm thường/, "P.101"],
    [/biển báo nguy hiểm thường|nguy hiểm thường có dạng/, "W.210"],
    [/biển báo nguy hiểm giao nhau|nguy hiểm giao nhau/, "W.205a"],
    [/biển hiệu lệnh/, "R.301a"],
    [/biển chỉ dẫn|chỉ dẫn hướng đi/, "I.401"],
    [/cấm đi ngược chiều/, "P.102"],
    [/đường cấm(?! dừng)/, "P.101"],
    [/cấm rẽ trái/, "P.123a"],
    [/cấm rẽ phải/, "P.124a"],
    [/cấm vượt|biển báo cấm vượt/, "P.125"],
    [/cấm đỗ xe(?! ngày)/, "P.131a"],
    [/cấm dừng và đỗ|cấm dừng đỗ/, "P.130"],
    [/tốc độ tối đa|hết biển hạn chế tốc độ/, "P.127a"],
    [/hết hạn chế tốc độ/, "P.134"],
    [/hết mọi lệnh cấm|hết tất cả các lệnh cấm/, "P.135"],
    [/biển stop|dừng lại/, "P.122"],
    [/cấm sử dụng còi|cấm bấm còi/, "P.128"],
    [/cấm quay đầu/, "P.120"],
    [/trẻ em|học sinh/, "W.225"],
    [/người đi bộ cắt ngang/, "W.224"],
    [/đường sắt không rào/, "W.235"],
    [/đường sắt có rào/, "W.234"],
    [/dốc xuống/, "W.219"],
    [/dốc lên/, "W.220"],
    [/đường trơn/, "W.221a"],
    [/công trường/, "W.227"],
    [/đi chậm/, "W.245a"],
    [/vòng xuyến/, "R.303"],
    [/hiệu lệnh đi thẳng|hướng đi phải theo.*thẳng/, "R.302a"],
    [/làn.*xe buýt|đường dành cho xe buýt/, "R.404a"],
    [/bến xe buýt/, "I.434a"],
    [/đường ưu tiên/, "I.401"],
    [/chỗ đỗ xe/, "I.409"],
    [/bệnh viện/, "I.423a"],
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
