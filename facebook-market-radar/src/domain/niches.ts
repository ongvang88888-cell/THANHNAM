export type NicheDef = {
  slug: string;
  nameVi: string;
  nameEn: string;
  group: string;
  keywords: readonly string[];
  searchKeywords: readonly string[];
};

export const LOCKED_NICHES: readonly NicheDef[] = [
  {
    slug: "my-pham",
    nameVi: "Mỹ phẩm / chăm sóc da",
    nameEn: "Beauty",
    group: "Làm đẹp",
    keywords: ["serum", "niacinamide", "retinol", "kem chống nắng", "dầu gội", "skincare", "dưỡng", "kem nền", "son"],
    searchKeywords: ["serum niacinamide", "kem chống nắng", "retinol", "dưỡng tóc"],
  },
  {
    slug: "cham-soc-ca-nhan",
    nameVi: "Chăm sóc cá nhân",
    nameEn: "Personal care",
    group: "Làm đẹp",
    keywords: ["sữa rửa mặt", "bàn chải", "khử mùi", "dao cạo", "nước hoa", "tắm"],
    searchKeywords: ["sữa rửa mặt", "nước hoa nam", "bàn chải điện"],
  },
  {
    slug: "tpcn",
    nameVi: "TPCN / sức khỏe",
    nameEn: "Supplements",
    group: "Sức khỏe",
    keywords: ["collagen", "vitamin", "omega", "glutathione", "viên uống", "giảm cân", "whey"],
    searchKeywords: ["collagen", "viên uống trắng da", "omega 3", "vitamin tổng hợp"],
  },
  {
    slug: "thiet-bi-y-te",
    nameVi: "Thiết bị y tế gia đình",
    nameEn: "Home medical",
    group: "Sức khỏe",
    keywords: ["máy đo", "huyết áp", "đường huyết", "massage", "xông mũi", "nhiệt kế"],
    searchKeywords: ["máy đo huyết áp", "máy massage cổ", "nhiệt kế"],
  },
  {
    slug: "me-be",
    nameVi: "Mẹ và bé",
    nameEn: "Mom and baby",
    group: "Gia đình",
    keywords: ["bỉm", "sữa công thức", "hút sữa", "ăn dặm", "xe đẩy", "em bé", "mẹ"],
    searchKeywords: ["bỉm quần", "máy hút sữa", "sữa công thức", "ăn dặm"],
  },
  {
    slug: "thu-cung",
    nameVi: "Thú cưng",
    nameEn: "Pets",
    group: "Gia đình",
    keywords: ["chó", "mèo", "thức ăn hạt", "cát vệ sinh", "vòng cổ", "pet"],
    searchKeywords: ["thức ăn hạt chó", "cát vệ sinh mèo", "sữa tắm thú cưng"],
  },
  {
    slug: "nha-cua",
    nameVi: "Nhà cửa / đời sống",
    nameEn: "Home living",
    group: "Nhà cửa",
    keywords: ["máy lọc", "khử mùi", "rèm", "thảm trải", "hộp đựng", "treo tường"],
    searchKeywords: ["máy lọc không khí", "hộp đựng đồ", "thảm trải sàn"],
  },
  {
    slug: "nha-bep",
    nameVi: "Nhà bếp",
    nameEn: "Kitchen",
    group: "Nhà cửa",
    keywords: ["nồi", "chiên", "gia vị", "chảo", "máy xay", "bếp"],
    searchKeywords: ["nồi chiên không dầu", "kệ gia vị", "máy xay sinh tố"],
  },
  {
    slug: "noi-that",
    nameVi: "Nội thất",
    nameEn: "Furniture",
    group: "Nhà cửa",
    keywords: ["sofa", "giường", "tủ", "bàn làm việc", "kệ sách", "ghế"],
    searchKeywords: ["sofa bed", "kệ sách gỗ", "bàn làm việc"],
  },
  {
    slug: "gadget",
    nameVi: "Thiết bị nhà thông minh",
    nameEn: "Smart home gadgets",
    group: "Điện máy",
    keywords: ["đèn", "led", "ổ cắm", "wifi", "cảm ứng", "thông minh"],
    searchKeywords: ["đèn led cảm ứng", "ổ cắm thông minh", "đèn tủ bếp"],
  },
  {
    slug: "dien-tu",
    nameVi: "Điện tử / di động",
    nameEn: "Electronics",
    group: "Điện máy",
    keywords: ["ốp lưng", "sạc", "tai nghe", "cáp", "iphone", "samsung", "tablet"],
    searchKeywords: ["ốp lưng iphone", "tai nghe chống ồn", "sạc nhanh"],
  },
  {
    slug: "dien-may",
    nameVi: "Điện máy gia dụng",
    nameEn: "Appliances",
    group: "Điện máy",
    keywords: ["máy giặt", "tủ lạnh", "quạt", "máy hút bụi", "điều hòa", "nồi cơm"],
    searchKeywords: ["máy giặt mini", "máy hút bụi", "quạt không cánh"],
  },
  {
    slug: "thoi-trang-nu",
    nameVi: "Thời trang nữ",
    nameEn: "Women fashion",
    group: "Thời trang",
    keywords: ["đầm", "váy", "áo kiểu", "set bộ", "croptop", "jumpsuit"],
    searchKeywords: ["đầm dự tiệc", "set bộ nữ", "váy body"],
  },
  {
    slug: "thoi-trang-nam",
    nameVi: "Thời trang nam",
    nameEn: "Men fashion",
    group: "Thời trang",
    keywords: ["áo polo", "sơ mi", "quần jean nam", "áo thun nam", "blazer"],
    searchKeywords: ["áo polo nam", "sơ mi nam", "quần jean nam"],
  },
  {
    slug: "giay-dep",
    nameVi: "Giày dép",
    nameEn: "Footwear",
    group: "Thời trang",
    keywords: ["giày", "sneaker", "dép", "boot", "sandal"],
    searchKeywords: ["giày sneaker trắng", "dép quai ngang", "boot nữ"],
  },
  {
    slug: "tui-vi",
    nameVi: "Túi ví",
    nameEn: "Bags",
    group: "Thời trang",
    keywords: ["túi", "ví", "balo", "đeo chéo", "clutch"],
    searchKeywords: ["túi đeo chéo da", "balo laptop", "ví da nam"],
  },
  {
    slug: "trang-suc",
    nameVi: "Trang sức / phụ kiện",
    nameEn: "Jewelry",
    group: "Thời trang",
    keywords: ["dây chuyền", "nhẫn", "bông tai", "lắc", "bạc", "vàng"],
    searchKeywords: ["dây chuyền bạc", "bông tai nụ", "lắc tay"],
  },
  {
    slug: "thuc-pham",
    nameVi: "Thực phẩm khô",
    nameEn: "Dry food",
    group: "Ẩm thực",
    keywords: ["hạt điều", "nấm", "khô", "gia vị", "yến", "hạt dinh dưỡng"],
    searchKeywords: ["hạt điều rang muối", "nấm linh chi", "yến sào"],
  },
  {
    slug: "do-uong",
    nameVi: "Đồ uống",
    nameEn: "Beverages",
    group: "Ẩm thực",
    keywords: ["cà phê", "trà", "nước ép", "matcha", "cacao"],
    searchKeywords: ["cà phê rang xay", "trà sữa", "matcha"],
  },
  {
    slug: "o-to-xe-may",
    nameVi: "Ô tô / xe máy",
    nameEn: "Auto",
    group: "Xe cộ",
    keywords: ["camera hành trình", "thảm lót", "dầu nhớt", "mũ bảo hiểm", "xe máy"],
    searchKeywords: ["camera hành trình", "mũ bảo hiểm", "thảm lót sàn ô tô"],
  },
  {
    slug: "the-thao",
    nameVi: "Thể thao / dã ngoại",
    nameEn: "Sports",
    group: "Thể thao",
    keywords: ["yoga", "tạ", "cháy mỡ", "áo thể thao", "xe đạp", "cắm trại"],
    searchKeywords: ["thảm yoga", "tạ tay", "áo gym nam"],
  },
  {
    slug: "khoa-hoc",
    nameVi: "Khóa học / số",
    nameEn: "Digital courses",
    group: "Giáo dục",
    keywords: ["khóa", "excel", "tiếng anh", "figma", "ôn thi", "digital", "khóa học"],
    searchKeywords: ["khóa học excel", "tiếng anh giao tiếp", "ôn thi"],
  },
  {
    slug: "sach-vpp",
    nameVi: "Sách / văn phòng phẩm",
    nameEn: "Books & stationery",
    group: "Giáo dục",
    keywords: ["sách", "sổ", "planner", "bút", "flashcard"],
    searchKeywords: ["sổ planner", "sách kỹ năng", "flashcard"],
  },
  {
    slug: "do-choi",
    nameVi: "Đồ chơi / hobby",
    nameEn: "Toys",
    group: "Giải trí",
    keywords: ["xếp hình", "lego", "mô hình", "board game", "đồ chơi"],
    searchKeywords: ["xếp hình", "mô hình lắp ráp", "board game"],
  },
  {
    slug: "nong-san",
    nameVi: "Nông sản / vườn",
    nameEn: "Agriculture",
    group: "Nông nghiệp",
    keywords: ["phân bón", "hạt giống", "vườn", "tưới", "nông"],
    searchKeywords: ["phân bón hữu cơ", "hạt giống rau", "béc tưới"],
  },
  {
    slug: "khac",
    nameVi: "Khác / chưa phân loại",
    nameEn: "Other",
    group: "Khác",
    keywords: [],
    searchKeywords: [],
  },
] as const;

export const NICHE_GROUPS = [
  "Làm đẹp",
  "Sức khỏe",
  "Gia đình",
  "Nhà cửa",
  "Điện máy",
  "Thời trang",
  "Ẩm thực",
  "Xe cộ",
  "Thể thao",
  "Giáo dục",
  "Giải trí",
  "Nông nghiệp",
  "Khác",
] as const;

export function nicheName(slug: string): string {
  return LOCKED_NICHES.find((n) => n.slug === slug)?.nameVi ?? slug;
}

export function nicheGroup(slug: string): string {
  return LOCKED_NICHES.find((n) => n.slug === slug)?.group ?? "Khác";
}

export function isLockedNiche(slug: string): boolean {
  return LOCKED_NICHES.some((n) => n.slug === slug);
}

export function nichesInGroup(group: string): readonly NicheDef[] {
  return LOCKED_NICHES.filter((n) => n.group === group);
}

export function catalogKeywordCount(): number {
  return LOCKED_NICHES.reduce((sum, n) => sum + n.searchKeywords.length, 0);
}
