export type NicheDef = {
  slug: string;
  nameVi: string;
  nameEn: string;
};

export const LOCKED_NICHES: readonly NicheDef[] = [
  { slug: "my-pham", nameVi: "Mỹ phẩm / skincare", nameEn: "Beauty" },
  { slug: "me-be", nameVi: "Mẹ và bé", nameEn: "Mom and baby" },
  { slug: "gadget", nameVi: "Gadget / nhà cửa", nameEn: "Home gadgets" },
  { slug: "tpcn", nameVi: "TPCN / sức khỏe", nameEn: "Supplements" },
  { slug: "khoa-hoc", nameVi: "Khóa học / digital", nameEn: "Digital courses" },
] as const;

export function nicheName(slug: string): string {
  return LOCKED_NICHES.find((n) => n.slug === slug)?.nameVi ?? slug;
}

export function isLockedNiche(slug: string): boolean {
  return LOCKED_NICHES.some((n) => n.slug === slug);
}
