import { buildAdLibrarySearchUrl } from "@/domain/ad-library-url";

export function LibrarySearchLinks({
  query,
  variants = [],
}: {
  query: string;
  variants?: Array<{ query: string; libraryUrl: string }>;
}) {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return null;
  }
  const extra = variants.filter((row) => row.query.trim().toLowerCase() !== trimmed.toLowerCase()).slice(0, 6);
  return (
    <div className="watch-actions">
      <a className="btn" href={buildAdLibrarySearchUrl(trimmed)} target="_blank" rel="noreferrer">
        Tìm trên Thư viện
      </a>
      {extra.map((row) => (
        <a key={row.query} className="btn secondary" href={row.libraryUrl} target="_blank" rel="noreferrer">
          {row.query}
        </a>
      ))}
    </div>
  );
}
