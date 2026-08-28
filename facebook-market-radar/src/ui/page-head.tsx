import Link from "next/link";

export function PageHead({
  eyebrow,
  title,
  lede,
  actions = [],
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  actions?: readonly { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <div className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {actions.length > 0 ? (
        <div className="actions">
          {actions.map((item) => (
            <Link key={`${item.href}-${item.label}`} className={item.primary ? "btn" : "btn secondary"} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
