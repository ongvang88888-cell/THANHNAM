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
      { slug: "khoi-nghiep-online", name: "Kinh doanh online" },
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
      { slug: "facebook-ads", name: "Facebook Ads" },
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
      { slug: "ai-agent", name: "AI Agent" },
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
      { slug: "reels", name: "Reels / Shorts" },
    ],
  },
  {
    slug: "ngoai-ngu",
    name: "Ngoại Ngữ",
    children: [
      { slug: "tieng-anh", name: "Tiếng Anh" },
      { slug: "tieng-trung", name: "Tiếng Trung" },
      { slug: "tieng-nhat", name: "Tiếng Nhật" },
      { slug: "tieng-han", name: "Tiếng Hàn" },
    ],
  },
  {
    slug: "tin-hoc-van-phong",
    name: "Tin Học Văn Phòng",
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
    name: "Tài Chính & Đầu tư",
    children: [
      { slug: "chung-khoan", name: "Chứng khoán" },
      { slug: "ke-toan", name: "Kế toán" },
      { slug: "dau-tu", name: "Đầu tư" },
      { slug: "thue", name: "Thuế doanh nghiệp" },
    ],
  },
  {
    slug: "phong-cach-song",
    name: "Phong Cách Sống",
    children: [
      { slug: "am-nhac", name: "Âm nhạc" },
      { slug: "nau-an", name: "Nấu ăn" },
      { slug: "gia-dinh", name: "Gia đình" },
    ],
  },
  {
    slug: "sach-hay-nen-doc",
    name: "Sách hay nên đọc",
    children: [
      { slug: "sach-ky-nang", name: "Sách kỹ năng" },
      { slug: "sach-kinh-doanh", name: "Sách kinh doanh" },
      { slug: "sach-ai", name: "Sách AI" },
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
  tone: "red" | "navy" | "orange" | "teal" | "gold";
};

export const LIVE_CLASSES: LiveClass[] = [
  {
    id: "lc-1",
    title: "Xây dựng siêu trợ lý AI toàn năng với OpenClaw",
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
    tone: "gold",
  },
  {
    id: "lc-4",
    title: "X5 tốc độ hoàn thành công việc với ChatGPT Work & Claude Cowork",
    date: "27/08 - 28/08",
    time: "19:30 - 22:30",
    platform: "Zoom",
    priceLabel: "Miễn phí",
    tone: "orange",
  },
  {
    id: "lc-5",
    title: "Tạo app bằng AI mà không cần biết code",
    date: "28/08",
    time: "19:30 - 22:30",
    platform: "Zoom",
    priceLabel: "Miễn phí",
    tone: "teal",
  },
  {
    id: "lc-6",
    title: "Ứng dụng AI tự động hóa kinh doanh và bùng nổ doanh số",
    date: "29/08",
    time: "13:15 - 17:00",
    platform: "Zoom",
    priceLabel: "Miễn phí",
    tone: "navy",
  },
];

export type HeroSlide = {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  tone: "tax" | "youtube" | "aihouse" | "autosale" | "reels" | "claude" | "wealth" | "agent" | "health";
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "s-tax",
    kicker: "Zoom miễn phí",
    title: "Kế toán thuế doanh nghiệp 2026",
    subtitle: "Chủ doanh nghiệp, chủ shop, hộ kinh doanh cần biết",
    cta: "Nhận vé miễn phí",
    href: "/live",
    tone: "tax",
  },
  {
    id: "s-yt",
    kicker: "Khóa học Zoom",
    title: "YouTube A.I thực chiến",
    subtitle: "Kịch bản, dựng video và tăng trưởng kênh bằng AI",
    cta: "Xem lịch học",
    href: "/live",
    tone: "youtube",
  },
  {
    id: "s-inhouse",
    kicker: "Doanh nghiệp",
    title: "AI Inhouse cho đội ngũ",
    subtitle: "Đào tạo nội bộ, LMS và gói học theo công ty",
    cta: "Tư vấn doanh nghiệp",
    href: "/doanh-nghiep",
    tone: "aihouse",
  },
  {
    id: "s-auto",
    kicker: "Siêu ưu đãi",
    title: "Tự động hóa kinh doanh với AI",
    subtitle: "Bùng nổ doanh số, giảm thao tác lặp lại mỗi ngày",
    cta: "Săn ưu đãi",
    href: "/khoa-hoc?sort=sale",
    tone: "autosale",
  },
  {
    id: "s-reels",
    kicker: "Video ngắn",
    title: "Reels Facebook 2026",
    subtitle: "Dựng video triệu view bằng CapCut và AI",
    cta: "Xem khóa học",
    href: "/course/video-nhiep-anh",
    tone: "reels",
  },
  {
    id: "s-claude",
    kicker: "Claude AI",
    title: "Hệ thống hóa kinh doanh một người",
    subtitle: "Xây quy trình, nội dung và bán hàng với Claude",
    cta: "Học ngay",
    href: "/course/ai-cong-nghe",
    tone: "claude",
  },
  {
    id: "s-wealth",
    kicker: "Phong cách sống",
    title: "Kiến tạo cuộc sống thịnh vượng",
    subtitle: "Tư duy, tài chính và thói quen của người dẫn đầu",
    cta: "Đăng ký Zoom",
    href: "/live",
    tone: "wealth",
  },
  {
    id: "s-agent",
    kicker: "AI Agent",
    title: "Siêu trợ lý AI toàn năng",
    subtitle: "OpenClaw, ChatGPT và Claude cho công việc hàng ngày",
    cta: "Nhận vé miễn phí",
    href: "/live",
    tone: "agent",
  },
  {
    id: "s-health",
    kicker: "Sức khỏe",
    title: "Bí quyết ăn đúng, sống trường thọ",
    subtitle: "Dinh dưỡng thực chiến trong 3 ngày Zoom",
    cta: "Xem lịch",
    href: "/course/suc-khoe-lam-dep",
    tone: "health",
  },
];

export type QuickLink = {
  href: string;
  label: string;
  icon: "share" | "bag" | "store" | "cap" | "video" | "users" | "game" | "book" | "chart";
};

export const QUICK_LINKS: QuickLink[] = [
  { href: "/affiliate", label: "Affiliate", icon: "share" },
  { href: "/khoa-hoc", label: "Market", icon: "bag" },
  { href: "/giang-vien", label: "Seller", icon: "store" },
  { href: "/library", label: "LMS", icon: "cap" },
  { href: "/live", label: "Webinar", icon: "video" },
  { href: "/community", label: "Community", icon: "users" },
  { href: "/khoa-hoc", label: "Game", icon: "game" },
  { href: "/doanh-nghiep", label: "Edubit", icon: "book" },
  { href: "/doanh-nghiep", label: "Salekit", icon: "chart" },
];

export const FEATURED_TEACHERS = [
  { name: "Chuyên gia Marketing", role: "Giảng viên Digital Marketing" },
  { name: "Huấn luyện viên Yoga", role: "Sức khỏe & thiền" },
  { name: "Giám đốc đào tạo", role: "Đào tạo doanh nghiệp" },
  { name: "CEO Marketing", role: "Marketing Online Master" },
  { name: "Giảng viên Guitar", role: "Nhạc cụ & biểu diễn" },
  { name: "Luật sư — Diễn giả", role: "Pháp lý doanh nghiệp" },
  { name: "Chuyên gia Tài chính", role: "Đầu tư & lãnh đạo" },
  { name: "Chuyên gia Giọng nói", role: "Giao tiếp & thuyết trình" },
];
