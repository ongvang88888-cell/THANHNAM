import { isLockedNiche } from "./niches";
import type { CollectManualInput } from "./collect-input";

export type SheetParseResult = {
  rows: CollectManualInput[];
  skipped: number;
  errors: string[];
};

const TRUE_RE = /^(true|1|yes|có)$/i;

export function parseCsvTable(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i] ?? "";
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }
    field += ch;
  }
  row.push(field);
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row);
  }
  return rows;
}

export function parseAdLibrarySheet(csv: string): SheetParseResult {
  const table = parseCsvTable(csv);
  if (table.length < 2) {
    return { rows: [], skipped: 0, errors: ["Sheet trống — cần hàng tiêu đề và ít nhất một dòng"] };
  }
  const header = (table[0] ?? []).map((cell) => cell.trim());
  const index = (name: string): number => header.findIndex((cell) => cell.toLowerCase() === name.toLowerCase());
  const col = {
    libraryId: index("libraryId"),
    pageId: index("pageId"),
    pageName: index("pageName"),
    productTitle: index("productTitle"),
    startDate: index("startDate"),
    nicheSlug: index("nicheSlug"),
    isActive: index("isActive"),
    platforms: index("platforms"),
    landingUrl: index("landingUrl"),
    listingPriceVnd: index("listingPriceVnd"),
    shopeeSold: index("shopeeSold"),
    tiktokSold: index("tiktokSold"),
    lazadaSold: index("lazadaSold"),
    tikiSold: index("tikiSold"),
    sendoSold: index("sendoSold"),
    googleAdsSeen: index("googleAdsSeen"),
    youtubeAdsSeen: index("youtubeAdsSeen"),
    tiktokAdsSeen: index("tiktokAdsSeen"),
    youtubeViews: index("youtubeViews"),
    notes: index("notes"),
  };
  if (col.libraryId < 0 || col.pageId < 0 || col.pageName < 0 || col.productTitle < 0 || col.startDate < 0) {
    return {
      rows: [],
      skipped: 0,
      errors: ["Thiếu cột bắt buộc: libraryId, pageId, pageName, productTitle, startDate"],
    };
  }

  const rows: CollectManualInput[] = [];
  const errors: string[] = [];
  let skipped = 0;
  table.slice(1).forEach((line, offset) => {
    const lineNo = offset + 2;
    const cell = (i: number): string => (i < 0 ? "" : (line[i] ?? "").trim());
    const libraryId = cell(col.libraryId);
    if (!libraryId) {
      skipped += 1;
      return;
    }
    const nicheSlug = cell(col.nicheSlug);
    if (nicheSlug && !isLockedNiche(nicheSlug)) {
      errors.push(`Dòng ${lineNo}: nicheSlug không thuộc 26 ngành (${nicheSlug})`);
      skipped += 1;
      return;
    }
    const platformsRaw = cell(col.platforms);
    const sold = (raw: string): number | undefined => {
      if (!raw) {
        return undefined;
      }
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    };
    rows.push({
      libraryId,
      pageId: cell(col.pageId),
      pageName: cell(col.pageName),
      productTitle: cell(col.productTitle),
      startDate: cell(col.startDate),
      nicheSlug: nicheSlug || undefined,
      isActive: col.isActive < 0 || cell(col.isActive) === "" ? true : TRUE_RE.test(cell(col.isActive)),
      platforms: platformsRaw ? platformsRaw.split("|").map((p) => p.trim()).filter(Boolean) : undefined,
      landingUrl: cell(col.landingUrl) || undefined,
      listingPriceVnd: cell(col.listingPriceVnd) || undefined,
      shopeeSold: sold(cell(col.shopeeSold)),
      tiktokSold: sold(cell(col.tiktokSold)),
      lazadaSold: sold(cell(col.lazadaSold)),
      tikiSold: sold(cell(col.tikiSold)),
      sendoSold: sold(cell(col.sendoSold)),
      googleAdsSeen: sold(cell(col.googleAdsSeen)),
      youtubeAdsSeen: sold(cell(col.youtubeAdsSeen)),
      tiktokAdsSeen: sold(cell(col.tiktokAdsSeen)),
      youtubeViews: sold(cell(col.youtubeViews)),
      body: cell(col.notes) || undefined,
    });
  });
  return { rows, skipped, errors };
}
