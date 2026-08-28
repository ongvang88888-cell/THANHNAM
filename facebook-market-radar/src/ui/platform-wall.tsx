import Link from "next/link";
import { PLATFORM_MENU_ORDER } from "@/domain/app-nav";
import { platformTab, type PlatformTabId } from "@/domain/platform-dashboards";

export function PlatformWall({ active }: { active: PlatformTabId }) {
  return (
    <div className="cards platform-coverage platform-wall" aria-label="Mọi nền tảng">
      {PLATFORM_MENU_ORDER.map((id) => {
        const tab = platformTab(id);
        return (
          <Link key={tab.id} href={`/top/${tab.id}`} className={tab.id === active ? "card on" : "card"}>
            <div className="n">999</div>
            <div className="muted">{tab.labelVi}</div>
            <div className="muted">tên nghiên cứu · {tab.valueLabelVi}</div>
          </Link>
        );
      })}
    </div>
  );
}
