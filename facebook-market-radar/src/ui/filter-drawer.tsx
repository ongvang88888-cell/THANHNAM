"use client";

import { useState } from "react";
import { hasActiveResearchQuery, type ResearchQuery } from "./research-query";
import { ResearchFilters } from "./research-filters";

export function FilterDrawer({ action, query }: { action: string; query: ResearchQuery }) {
  const active = hasActiveResearchQuery(query);
  const [open, setOpen] = useState(active);
  return (
    <details
      className="filter-drawer"
      open={open}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary>{active ? "Bộ lọc (đang lọc)" : "Bộ lọc"}</summary>
      <ResearchFilters action={action} query={query} />
    </details>
  );
}
