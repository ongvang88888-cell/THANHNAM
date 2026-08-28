import { normalizeTitle } from "./clustering";

function foldVi(text: string): string {
  return normalizeTitle(text)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d");
}

export const CREATIVE_ANGLES = [
  "price",
  "ugc",
  "before_after",
  "testimonial",
  "combo",
  "official",
  "wholesale",
  "shipping",
] as const;

export type CreativeAngle = (typeof CREATIVE_ANGLES)[number];

export const CREATIVE_ANGLE_VI: Record<CreativeAngle, string> = {
  price: "Hook giá",
  ugc: "UGC / mình dùng",
  before_after: "Trước — sau",
  testimonial: "Feedback khách",
  combo: "Combo / tặng",
  official: "Chính hãng",
  wholesale: "Giá sỉ / xưởng",
  shipping: "Freeship / nội thành",
};

const RULES: Array<{ angle: CreativeAngle; needles: string[] }> = [
  { angle: "price", needles: ["gia soc", "chi ", "giam", "sale", "flash", "re hon", "re nhat"] },
  { angle: "ugc", needles: ["minh dung", "toi dung", "tu review", "dung thu", "ugc"] },
  { angle: "before_after", needles: ["truoc sau", "before after", "sau 7 ngay", "sau 14 ngay"] },
  { angle: "testimonial", needles: ["khach noi", "feedback", "danh gia", "review khach"] },
  { angle: "combo", needles: ["combo", "mua 1 tang", "tang kem", "set "] },
  { angle: "official", needles: ["chinh hang", "chinh hang", "auth", "tem"] },
  { angle: "wholesale", needles: ["gia si", "xuong", "si le", "ban si"] },
  { angle: "shipping", needles: ["freeship", "free ship", "noi thanh", "ship noi"] },
];

export function isCreativeAngle(value: string): value is CreativeAngle {
  return (CREATIVE_ANGLES as readonly string[]).includes(value);
}

export function detectCreativeAngles(texts: readonly (string | null | undefined)[]): CreativeAngle[] {
  const hay = foldVi(texts.filter((item): item is string => Boolean(item)).join(" "));
  if (!hay) {
    return [];
  }
  const hits: CreativeAngle[] = [];
  for (const rule of RULES) {
    if (rule.needles.some((needle) => hay.includes(needle))) {
      hits.push(rule.angle);
    }
  }
  return hits;
}

export function hookLine(texts: readonly (string | null | undefined)[]): string {
  for (const text of texts) {
    const trimmed = text?.trim() ?? "";
    if (trimmed.length >= 8) {
      return trimmed.length > 90 ? `${trimmed.slice(0, 87)}…` : trimmed;
    }
  }
  return "";
}

export function mediaType(imageUrl: string | null | undefined): "image" | "text" {
  return imageUrl && imageUrl.trim().length > 0 ? "image" : "text";
}
