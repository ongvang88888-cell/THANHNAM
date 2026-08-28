import Link from "next/link";
import { PLATFORM_TABS, type PlatformTabId } from "@/domain/platform-dashboards";

export function PlatformWall({ active }: { active: PlatformTabId }) {
  return (
    <div className="cards platform-coverage platform-wall" aria-label="Mọi nền tảng">
      {PLATFORM_TABS.map((tab) => (
        <Link key={tab.id} href={`/top/${tab.id}`} className={tab.id === active ? "card on" : "card"}>
          <div className="n">999</div>
          <div className="muted">{tab.labelVi}</div>
          <div className="muted">tên nghiên cứu · {tab.valueLabelVi}</div>
        </Link>
      ))}
    </div>
  );
}
