import Link from "next/link";
import { PLATFORM_TABS, type PlatformTabId, platformHref } from "@/domain/platform-dashboards";

export function PlatformChips({
  active,
  base = "kenh",
  niche,
  extra,
}: {
  active: PlatformTabId;
  base?: "home" | "kenh" | "top" | "trend";
  niche?: string;
  extra?: Record<string, string | undefined>;
}) {
  return (
    <div className="platform-chips" role="tablist" aria-label="Nền tảng và sàn">
      {PLATFORM_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={platformHref(tab.id, { base, niche, extra })}
          className={tab.id === active ? "on" : ""}
          role="tab"
          aria-selected={tab.id === active}
        >
          {tab.labelVi}
        </Link>
      ))}
    </div>
  );
}
