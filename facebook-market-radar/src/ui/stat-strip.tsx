import Link from "next/link";

export type StatStripItem = {
  value: string;
  label: string;
  href?: string;
};

export function StatStrip({ items }: { items: readonly StatStripItem[] }) {
  return (
    <div className="stat-strip" aria-label="Chỉ số kho">
      {items.map((item) => {
        const body = (
          <>
            <span className="stat-strip-n">{item.value}</span>
            <span className="stat-strip-l">{item.label}</span>
          </>
        );
        return item.href ? (
          <Link key={item.label} href={item.href} className="stat-strip-item">
            {body}
          </Link>
        ) : (
          <div key={item.label} className="stat-strip-item">
            {body}
          </div>
        );
      })}
    </div>
  );
}
