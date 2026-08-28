import { SCAN_BRANCHES } from "./scan-branches";
import { COMMERCE_MODS, megaLexFor } from "./mega-lexicon";
import { LOCKED_NICHES, nicheName } from "./niches";
import { normalizeTitle, slugifyTitle } from "./clustering";

/** Research targets per platform — not a live GMV dump. */
export const PLATFORM_BESTSELLER_TARGET = 999;

export type BestsellerCatalogItem = {
  id: string;
  title: string;
  nicheSlug: string;
  nicheName: string;
  depth: "hero" | "core" | "sku";
  nationalDump: false;
};

const HERO_SKUS: ReadonlyArray<{ title: string; nicheSlug: string }> = [
  { title: "serum niacinamide 10% 30ml", nicheSlug: "my-pham" },
  { title: "kem chống nắng SPF50 PA++++", nicheSlug: "my-pham" },
  { title: "retinol 0.3% night cream", nicheSlug: "my-pham" },
  { title: "serum vitamin c 20%", nicheSlug: "my-pham" },
  { title: "dầu gội phủ bạc thảo mộc", nicheSlug: "my-pham" },
  { title: "bỉm quần size M 76 miếng", nicheSlug: "me-be" },
  { title: "sữa công thức số 2 800g", nicheSlug: "me-be" },
  { title: "máy hút sữa không dây đôi", nicheSlug: "me-be" },
  { title: "bột ăn dặm rau củ 8 tháng", nicheSlug: "me-be" },
  { title: "nồi chiên không dầu 6L", nicheSlug: "nha-bep" },
  { title: "máy xay sinh tố công suất lớn", nicheSlug: "nha-bep" },
  { title: "đèn LED cảm ứng tủ bếp", nicheSlug: "gadget" },
  { title: "ổ cắm thông minh wifi", nicheSlug: "gadget" },
  { title: "camera wifi trong nhà 2K", nicheSlug: "gadget" },
  { title: "ốp lưng iPhone 16 Pro", nicheSlug: "dien-tu" },
  { title: "sạc dự phòng 20000mah sạc nhanh", nicheSlug: "dien-tu" },
  { title: "tai nghe chống ồn ANC", nicheSlug: "dien-tu" },
  { title: "collagen peptide 5000mg 30 gói", nicheSlug: "tpcn" },
  { title: "vitamin tổng hợp nữ 60 viên", nicheSlug: "tpcn" },
  { title: "máy đo huyết áp bắp tay", nicheSlug: "thiet-bi-y-te" },
  { title: "hạt điều rang muối 500g", nicheSlug: "thuc-pham" },
  { title: "cà phê rang xay Đắk Lắk 500g", nicheSlug: "do-uong" },
  { title: "đầm dự tiệc body", nicheSlug: "thoi-trang-nu" },
  { title: "áo polo nam cotton", nicheSlug: "thoi-trang-nam" },
  { title: "giày sneaker trắng unisex", nicheSlug: "giay-dep" },
  { title: "thức ăn hạt chó 2kg", nicheSlug: "thu-cung" },
  { title: "camera hành trình 4K", nicheSlug: "o-to-xe-may" },
  { title: "thảm yoga chống trượt", nicheSlug: "the-thao" },
  { title: "máy hút bụi cầm tay", nicheSlug: "dien-may" },
  { title: "phân bón hữu cơ 5kg", nicheSlug: "nong-san" },
  { title: "ôn thi THPT môn Toán 2026", nicheSlug: "khoa-hoc" },
  { title: "khóa Excel cho nhân sự 14 buổi", nicheSlug: "khoa-hoc" },
];

function isUsefulProductTitle(raw: string): boolean {
  const title = raw.trim().replace(/\s+/g, " ");
  if (title.length < 4 || title.length > 80) {
    return false;
  }
  return normalizeTitle(title).length >= 3;
}

function isDeepFlavor(flavor: string): boolean {
  const text = flavor.toLowerCase();
  if (/\d/.test(text)) {
    return true;
  }
  return /niacinamide|retinol|hyaluronic|centella|peptide|iphone|samsung|xiaomi|oppo|spf|organic|inverter|bluetooth|type c|ppsu|huggies|merries|bobby|aptamil|omron|philips|sunhouse|magsafe|anc|hepa/.test(
    text,
  );
}

function pushCandidate(
  buckets: Map<string, BestsellerCatalogItem[]>,
  seen: Set<string>,
  title: string,
  nicheSlug: string,
  depth: BestsellerCatalogItem["depth"],
): void {
  if (!isUsefulProductTitle(title)) {
    return;
  }
  const key = normalizeTitle(title);
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  const list = buckets.get(nicheSlug) ?? [];
  list.push({
    id: `${nicheSlug}-${slugifyTitle(title)}`,
    title: title.trim().replace(/\s+/g, " "),
    nicheSlug,
    nicheName: nicheName(nicheSlug),
    depth,
    nationalDump: false,
  });
  buckets.set(nicheSlug, list);
}

function collectBuckets(): Map<string, BestsellerCatalogItem[]> {
  const buckets = new Map<string, BestsellerCatalogItem[]>();
  const seen = new Set<string>();
  for (const hero of HERO_SKUS) {
    pushCandidate(buckets, seen, hero.title, hero.nicheSlug, "hero");
  }
  for (const niche of LOCKED_NICHES) {
    for (const title of [...niche.searchKeywords, ...(SCAN_BRANCHES[niche.slug] ?? [])]) {
      pushCandidate(buckets, seen, title, niche.slug, "core");
    }
    const lex = megaLexFor(niche.slug);
    for (const core of lex.cores) {
      pushCandidate(buckets, seen, core, niche.slug, "core");
    }
    const deepFlavors = lex.flavors.filter(isDeepFlavor).slice(0, 10);
    for (const core of lex.cores) {
      for (const flavor of deepFlavors) {
        pushCandidate(buckets, seen, `${core} ${flavor}`, niche.slug, "sku");
      }
    }
    const extraMods = COMMERCE_MODS.slice(0, 8);
    for (const core of lex.cores.slice(0, 24)) {
      for (const mod of extraMods) {
        pushCandidate(buckets, seen, `${core} ${mod}`, niche.slug, "sku");
      }
    }
  }
  return buckets;
}

function takeRoundRobin(buckets: Map<string, BestsellerCatalogItem[]>, limit: number): BestsellerCatalogItem[] {
  const order = LOCKED_NICHES.map((niche) => niche.slug).filter((slug) => (buckets.get(slug)?.length ?? 0) > 0);
  const cursors = new Map(order.map((slug) => [slug, 0]));
  const out: BestsellerCatalogItem[] = [];
  const used = new Set<string>();
  let progress = true;
  while (out.length < limit && progress) {
    progress = false;
    for (const slug of order) {
      if (out.length >= limit) {
        break;
      }
      const list = buckets.get(slug) ?? [];
      let index = cursors.get(slug) ?? 0;
      while (index < list.length) {
        const item = list[index];
        index += 1;
        cursors.set(slug, index);
        if (!item || used.has(item.id)) {
          continue;
        }
        used.add(item.id);
        out.push(item);
        progress = true;
        break;
      }
    }
  }
  return out;
}

let cached: readonly BestsellerCatalogItem[] | null = null;

export function resetBestsellerCatalogCache(): void {
  cached = null;
}

export function listBestsellerCatalog(): readonly BestsellerCatalogItem[] {
  if (cached) {
    return cached;
  }
  const rows = takeRoundRobin(collectBuckets(), PLATFORM_BESTSELLER_TARGET);
  cached = rows;
  return rows;
}

export function filterBestsellerCatalog(nicheSlug?: string, q?: string): BestsellerCatalogItem[] {
  const needle = q?.trim() ? normalizeTitle(q) : "";
  return listBestsellerCatalog().filter((row) => {
    if (nicheSlug && row.nicheSlug !== nicheSlug) {
      return false;
    }
    if (needle && !normalizeTitle(row.title).includes(needle)) {
      return false;
    }
    return true;
  });
}

export function catalogNicheCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of listBestsellerCatalog()) {
    counts[row.nicheSlug] = (counts[row.nicheSlug] ?? 0) + 1;
  }
  return counts;
}
