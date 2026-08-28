import { hasActiveResearchQuery, type ResearchQuery } from "./research-query";
import { ResearchFilters } from "./research-filters";

export function FilterDrawer({ action, query }: { action: string; query: ResearchQuery }) {
  const active = hasActiveResearchQuery(query);
  return (
    <details className="filter-drawer" defaultOpen={active}>
      <summary>{active ? "Bộ lọc (đang lọc)" : "Bộ lọc"}</summary>
      <ResearchFilters action={action} query={query} />
    </details>
  );
}
