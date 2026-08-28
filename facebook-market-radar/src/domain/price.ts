import { normalizeTitle } from "./clustering";

export const PRICE_SOURCES = ["user", "copy", "catalog"] as const;
export type PriceSource = (typeof PRICE_SOURCES)[number];

export type PriceEstimate = {
  lowVnd: number;
  highVnd: number;
  midVnd: number;
  confidence: "cao" | "vua" | "thap";
  sources: PriceSource[];
  label: string;
  note: string;
};

const MIN_VND = 5_000;
const MAX_VND = 50_000_000;

const NICHE_BANDS: Record<string, readonly [number, number]> = {
  "my-pham": [120_000, 380_000],
  "cham-soc-ca-nhan": [80_000, 450_000],
  tpcn: [180_000, 650_000],
  "thiet-bi-y-te": [250_000, 1_200_000],
  "me-be": [160_000, 550_000],
  "thu-cung": [90_000, 380_000],
  "nha-cua": [120_000, 1_500_000],
  "nha-bep": [150_000, 1_800_000],
  "noi-that": [350_000, 4_500_000],
  gadget: [80_000, 450_000],
  "dien-tu": [50_000, 650_000],
  "dien-may": [400_000, 4_000_000],
  "thoi-trang-nu": [150_000, 650_000],
  "thoi-trang-nam": [150_000, 550_000],
  "giay-dep": [180_000, 750_000],
  "tui-vi": [180_000, 850_000],
  "trang-suc": [120_000, 680_000],
  "thuc-pham": [80_000, 450_000],
  "do-uong": [60_000, 280_000],
  "o-to-xe-may": [250_000, 2_200_000],
  "the-thao": [90_000, 550_000],
  "khoa-hoc": [299_000, 2_500_000],
  "sach-vpp": [40_000, 220_000],
  "do-choi": [80_000, 650_000],
  "nong-san": [50_000, 280_000],
  khac: [50_000, 400_000],
};

const KEYWORD_BANDS: ReadonlyArray<{ keywords: readonly string[]; low: number; high: number }> = [
  { keywords: ["serum", "niacinamide"], low: 150_000, high: 350_000 },
  { keywords: ["kem chống nắng", "spf"], low: 120_000, high: 380_000 },
  { keywords: ["retinol"], low: 180_000, high: 520_000 },
  { keywords: ["dầu gội"], low: 80_000, high: 250_000 },
  { keywords: ["nước hoa"], low: 180_000, high: 650_000 },
  { keywords: ["collagen"], low: 250_000, high: 690_000 },
  { keywords: ["glutathione"], low: 220_000, high: 580_000 },
  { keywords: ["vitamin"], low: 120_000, high: 320_000 },
  { keywords: ["huyết áp"], low: 350_000, high: 890_000 },
  { keywords: ["bỉm"], low: 180_000, high: 420_000 },
  { keywords: ["hút sữa"], low: 450_000, high: 1_400_000 },
  { keywords: ["sữa công thức"], low: 280_000, high: 620_000 },
  { keywords: ["ăn dặm"], low: 70_000, high: 180_000 },
  { keywords: ["đèn led", "đèn"], low: 60_000, high: 220_000 },
  { keywords: ["ổ cắm"], low: 80_000, high: 220_000 },
  { keywords: ["tai nghe"], low: 180_000, high: 650_000 },
  { keywords: ["nồi chiên"], low: 690_000, high: 1_690_000 },
  { keywords: ["ốp lưng"], low: 45_000, high: 180_000 },
  { keywords: ["đầm", "váy"], low: 180_000, high: 550_000 },
  { keywords: ["hạt điều"], low: 90_000, high: 280_000 },
  { keywords: ["camera hành trình"], low: 450_000, high: 1_590_000 },
  { keywords: ["thảm yoga"], low: 90_000, high: 280_000 },
  { keywords: ["khóa excel", "khóa figma", "khóa"], low: 399_000, high: 1_990_000 },
  { keywords: ["tiếng anh"], low: 499_000, high: 2_490_000 },
];

export function priceConfidenceLabel(confidence: PriceEstimate["confidence"]): string {
  if (confidence === "cao") {
    return "bạn nhập";
  }
  if (confidence === "vua") {
    return "từ nội dung";
  }
  return "khoảng ngành";
}

export function formatVnd(amount: number): string {
  const rounded = Math.round(amount);
  const digits = String(Math.abs(rounded));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${rounded < 0 ? "-" : ""}${grouped}đ`;
}

export function isReasonableVnd(amount: number): boolean {
  return Number.isInteger(amount) && amount >= MIN_VND && amount <= MAX_VND;
}

export function parseOptionalPriceVnd(value: number | string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    if (!isReasonableVnd(value)) {
      throw new Error("Giá bán phải là số nguyên VND từ 5.000 đến 50.000.000");
    }
    return value;
  }
  const digits = value.trim().replace(/[.,\s]/g, "");
  if (/^\d{4,8}$/.test(digits)) {
    const asInt = Number(digits);
    if (isReasonableVnd(asInt)) {
      return asInt;
    }
  }
  const parsed = parseVndAmounts(value);
  if (parsed.length === 0) {
    throw new Error("Không đọc được giá bán — dùng số VND hoặc dạng 189.000đ / 189k");
  }
  return parsed[0] ?? null;
}

export function parseVndAmounts(text: string): number[] {
  const amounts: number[] = [];
  const dotted = /(\d{1,3}(?:[.\s]\d{3})+)(?:[.,]\d+)?\s*(?:vnđ|vnd|đồng|đ)?/gi;
  const marked = /(\d{4,8}|\d{1,3}(?:[.,]\d{3})+)(?:[.,]\d+)?\s*(?:vnđ|vnd|đồng|đ)/gi;
  const trieu = /(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)\b/gi;
  const kSuffix = /(?<![A-Za-z0-9])(\d{2,4})(?:[.,](\d))?\s*k\b/gi;

  collect(text, dotted, (match) => fromGrouped(match[1] ?? ""));
  collect(text, marked, (match) => fromGrouped((match[1] ?? "").replace(/\s/g, "")));
  collect(text, trieu, (match) => Math.round(toDecimal(match[1] ?? "0") * 1_000_000));
  collect(text, kSuffix, (match) => {
    const whole = Number(match[1] ?? "0");
    const frac = match[2] ? Number(match[2]) / 10 : 0;
    return Math.round((whole + frac) * 1_000);
  });

  return [...new Set(amounts.filter(isReasonableVnd))].sort((a, b) => a - b);

  function collect(source: string, pattern: RegExp, read: (match: RegExpExecArray) => number): void {
    pattern.lastIndex = 0;
    let match = pattern.exec(source);
    while (match) {
      const value = read(match);
      if (Number.isFinite(value)) {
        amounts.push(value);
      }
      match = pattern.exec(source);
    }
  }
}

function fromGrouped(raw: string): number {
  return Number(raw.replace(/[.\s]/g, ""));
}

function toDecimal(raw: string): number {
  return Number(raw.replace(",", "."));
}

export function catalogPriceBand(title: string, nicheSlug: string): { lowVnd: number; highVnd: number; midVnd: number } {
  const hay = normalizeTitle(title);
  let best: { low: number; high: number } | null = null;
  let bestHits = 0;
  for (const band of KEYWORD_BANDS) {
    const hits = band.keywords.filter((kw) => hay.includes(kw)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = { low: band.low, high: band.high };
    }
  }
  const fallback = NICHE_BANDS[nicheSlug] ?? NICHE_BANDS.khac ?? [50_000, 400_000];
  const low = best?.low ?? fallback[0];
  const high = best?.high ?? fallback[1];
  return { lowVnd: low, highVnd: high, midVnd: Math.round((low + high) / 2) };
}

export function estimateProductPrice(input: {
  title: string;
  nicheSlug: string;
  listingPricesVnd?: Array<number | null | undefined>;
  copyTexts?: Array<string | null | undefined>;
}): PriceEstimate {
  const userPrices = (input.listingPricesVnd ?? []).filter((value): value is number => value != null && isReasonableVnd(value));
  const copyPrices = (input.copyTexts ?? []).flatMap((text) => (text ? parseVndAmounts(text) : []));
  const catalog = catalogPriceBand(input.title, input.nicheSlug);
  const sources: PriceSource[] = [];
  if (userPrices.length > 0) sources.push("user");
  if (copyPrices.length > 0) sources.push("copy");
  sources.push("catalog");

  if (userPrices.length > 0) {
    const mid = median(userPrices);
    const observed = [...userPrices, ...copyPrices];
    const agree = copyPrices.length === 0 || copyPrices.every((price) => withinPercent(price, mid, 20));
    return finish({
      lowVnd: agree ? mid : Math.min(...observed),
      highVnd: agree ? mid : Math.max(...observed),
      midVnd: mid,
      confidence: agree ? "cao" : "vua",
      sources,
      note: agree
        ? "Giá bạn nhập (đối chiếu nội dung nếu có)."
        : "Giá bạn nhập và giá đọc từ nội dung lệch nhau — lấy khoảng.",
    });
  }

  if (copyPrices.length > 0) {
    const mid = median(copyPrices);
    return finish({
      lowVnd: Math.min(...copyPrices, catalog.lowVnd),
      highVnd: Math.max(...copyPrices, catalog.highVnd),
      midVnd: mid,
      confidence: "vua",
      sources,
      note: "Đọc từ nội dung quảng cáo, neo thêm giá phổ biến cùng ngành.",
    });
  }

  return finish({
    lowVnd: catalog.lowVnd,
    highVnd: catalog.highVnd,
    midVnd: catalog.midVnd,
    confidence: "thap",
    sources,
    note: "Chưa có giá nhập — khoảng phổ biến cùng loại sản phẩm trên sàn VN.",
  });
}

function finish(partial: Omit<PriceEstimate, "label">): PriceEstimate {
  const low = Math.min(partial.lowVnd, partial.midVnd, partial.highVnd);
  const high = Math.max(partial.lowVnd, partial.midVnd, partial.highVnd);
  const tight = high / Math.max(low, 1) <= 1.18;
  return {
    ...partial,
    lowVnd: low,
    highVnd: high,
    label: tight ? `≈ ${formatVnd(partial.midVnd)}` : `≈ ${formatVnd(low)}–${formatVnd(high)}`,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length === 0) {
    return 0;
  }
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
  }
  return sorted[mid] ?? 0;
}

function withinPercent(value: number, center: number, percent: number): boolean {
  const delta = (center * percent) / 100;
  return value >= center - delta && value <= center + delta;
}
