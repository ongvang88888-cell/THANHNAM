export type UnicaCategory = {
  slug: string;
  name: string;
  children: Array<{ slug: string; name: string }>;
};

export const UNICA_CATEGORIES: UnicaCategory[] = [
  {
    slug: "kinh-doanh-khoi-nghiep",
    name: "Kinh doanh & Khởi nghiệp",
    children: [
      { slug: "quan-tri-kinh-doanh", name: "Quản trị kinh doanh" },
      { slug: "khoi-nghiep", name: "Khởi nghiệp theo ngành" },
      { slug: "xay-dung-doi-nhom", name: "Xây dựng đội nhóm" },
      { slug: "van-hanh-doanh-nghiep", name: "Vận hành doanh nghiệp" },
      { slug: "quan-tri-nhan-su", name: "Quản trị nhân sự" },
    ],
  },
  {
    slug: "marketing-ban-hang",
    name: "Marketing & Bán hàng",
    children: [
      { slug: "digital-marketing", name: "Digital Marketing" },
      { slug: "quang-cao-online", name: "Quảng cáo online" },
      { slug: "ban-hang-chot-sale", name: "Bán hàng & chốt sale" },
      { slug: "thuong-mai-dien-tu", name: "Thương mại điện tử" },
      { slug: "crm-chatbot-ai", name: "CRM & Chatbot AI" },
    ],
  },
  {
    slug: "ai-cong-nghe",
    name: "AI & Công nghệ",
    children: [
      { slug: "chatgpt", name: "ChatGPT & GenAI" },
      { slug: "ai-automation", name: "AI Automation" },
      { slug: "lap-trinh", name: "Lập trình" },
      { slug: "data-bi", name: "Data & BI" },
    ],
  },
  {
    slug: "thiet-ke-sang-tao",
    name: "Thiết kế & Sáng tạo",
    children: [
      { slug: "photoshop", name: "Photoshop" },
      { slug: "illustrator", name: "Illustrator" },
      { slug: "thiet-ke-do-hoa", name: "Thiết kế đồ họa" },
      { slug: "ui-ux", name: "UI / UX" },
    ],
  },
  {
    slug: "video-nhiep-anh",
    name: "Video & Nhiếp ảnh",
    children: [
      { slug: "capcut", name: "CapCut" },
      { slug: "dung-video", name: "Dựng video" },
      { slug: "nhiep-anh", name: "Nhiếp ảnh" },
      { slug: "youtube", name: "YouTube" },
    ],
  },
  {
    slug: "ngoai-ngu",
    name: "Ngoại ngữ",
    children: [
      { slug: "tieng-anh", name: "Tiếng Anh" },
      { slug: "tieng-trung", name: "Tiếng Trung" },
      { slug: "tieng-nhat", name: "Tiếng Nhật" },
      { slug: "tieng-han", name: "Tiếng Hàn" },
    ],
  },
  {
    slug: "tin-hoc-van-phong",
    name: "Tin học văn phòng",
    children: [
      { slug: "excel", name: "Excel" },
      { slug: "word", name: "Word" },
      { slug: "powerpoint", name: "PowerPoint" },
      { slug: "autocad", name: "AutoCAD" },
    ],
  },
  {
    slug: "ky-nang-mem",
    name: "Kỹ năng mềm",
    children: [
      { slug: "giao-tiep", name: "Giao tiếp" },
      { slug: "lanh-dao", name: "Lãnh đạo" },
      { slug: "thuyet-trinh", name: "Thuyết trình" },
    ],
  },
  {
    slug: "suc-khoe-lam-dep",
    name: "Sức khỏe & Làm đẹp",
    children: [
      { slug: "yoga", name: "Yoga" },
      { slug: "dinh-duong", name: "Dinh dưỡng" },
      { slug: "cham-soc-sac-dep", name: "Chăm sóc sắc đẹp" },
    ],
  },
  {
    slug: "tai-chinh-dau-tu",
    name: "Tài chính & Đầu tư",
    children: [
      { slug: "chung-khoan", name: "Chứng khoán" },
      { slug: "ke-toan", name: "Kế toán" },
      { slug: "dau-tu", name: "Đầu tư" },
    ],
  },
  {
    slug: "phong-cach-song",
    name: "Phong cách sống",
    children: [
      { slug: "am-nhac", name: "Âm nhạc" },
      { slug: "nau-an", name: "Nấu ăn" },
      { slug: "gia-dinh", name: "Gia đình" },
    ],
  },
  {
    slug: "sach-hay",
    name: "Sách hay nên đọc",
    children: [
      { slug: "sach-ky-nang", name: "Sách kỹ năng" },
      { slug: "sach-kinh-doanh", name: "Sách kinh doanh" },
    ],
  },
];

export type LiveClass = {
  id: string;
  title: string;
  date: string;
  time: string;
  platform: string;
  priceLabel: string;
  tone: "red" | "navy" | "orange";
};

export const LIVE_CLASSES: LiveClass[] = [
  {
    id: "lc-1",
    title: "Xây dựng siêu trợ lý AI toàn năng cho công việc hàng ngày",
    date: "26/08",
    time: "13:15 - 17:00",
    platform: "Zoom",
    priceLabel: "Miễn phí",
    tone: "red",
  },
  {
    id: "lc-2",
    title: "7 cấp độ kiếm tiền và bứt phá doanh thu với AI",
    date: "27/08",
    time: "19:30 - 22:30",
    platform: "Zoom",
    priceLabel: "Miễn phí",
    tone: "navy",
  },
  {
    id: "lc-3",
    title: "Kiến tạo cuộc sống thịnh vượng",
    date: "27/08 - 29/08",
    time: "19:45 - 22:00",
    platform: "Zoom",
    priceLabel: "Miễn phí",
    tone: "orange",
  },
  {
    id: "lc-4",
    title: "X5 tốc độ hoàn thành công việc với ChatGPT và Claude",
    date: "27/08 - 28/08",
    time: "19:30 - 22:30",
    platform: "Zoom",
    priceLabel: "Miễn phí",
    tone: "red",
  },
  {
    id: "lc-5",
    title: "Tạo app bằng AI mà không cần biết code",
    date: "28/08",
    time: "19:30 - 22:30",
    platform: "Zoom",
    priceLabel: "Miễn phí",
    tone: "navy",
  },
  {
    id: "lc-6",
    title: "Ứng dụng AI tự động hóa kinh doanh và bùng nổ doanh số",
    date: "29/08",
    time: "13:15 - 17:00",
    platform: "Zoom",
    priceLabel: "Miễn phí",
    tone: "orange",
  },
];

export type HeroSlide = {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  tone: "tax" | "ai" | "voice";
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "s1",
    kicker: "Học miễn phí qua Zoom",
    title: "Quản trị rủi ro thuế doanh nghiệp 2026",
    subtitle: "Chủ doanh nghiệp, chủ shop, chủ hộ kinh doanh cần biết",
    cta: "Nhận vé miễn phí",
    href: "/khoa-hoc",
    tone: "tax",
  },
  {
    id: "s2",
    kicker: "Top bán chạy",
    title: "Học online mọi kỹ năng từ chuyên gia hàng đầu",
    subtitle: "2000+ khóa học video, xem trước miễn phí, sở hữu trọn đời",
    cta: "Xem khóa học",
    href: "/khoa-hoc",
    tone: "ai",
  },
  {
    id: "s3",
    kicker: "Siêu ưu đãi hôm nay",
    title: "Làm chủ kỹ năng mới chỉ sau một khóa học",
    subtitle: "Giảm giá sốc — hoàn tiền trong 07 ngày nếu không hài lòng",
    cta: "Săn ưu đãi",
    href: "/khoa-hoc?sort=sale",
    tone: "voice",
  },
];

export const QUICK_LINKS = [
  { href: "/affiliate", label: "Affiliate", icon: "share" },
  { href: "/khoa-hoc", label: "Market", icon: "bag" },
  { href: "/giang-vien", label: "Seller", icon: "home" },
  { href: "/library", label: "LMS", icon: "cap" },
  { href: "/", label: "Web", icon: "grid" },
] as const;

export const FEATURED_TEACHERS = [
  { name: "Chuyên gia Marketing", role: "Giảng viên Digital Marketing" },
  { name: "Chuyên gia Yoga", role: "Huấn luyện viên sức khỏe" },
  { name: "Chuyên gia Đào tạo", role: "Giám đốc đào tạo doanh nghiệp" },
  { name: "CEO iNet", role: "Marketing Online Master" },
  { name: "Giảng viên Guitar", role: "Nhạc cụ & biểu diễn" },
  { name: "Luật sư — Diễn giả", role: "Pháp lý doanh nghiệp" },
  { name: "Chuyên gia Tài chính", role: "Đầu tư & lãnh đạo" },
  { name: "Chuyên gia Giọng nói", role: "Giao tiếp & thuyết trình" },
];
