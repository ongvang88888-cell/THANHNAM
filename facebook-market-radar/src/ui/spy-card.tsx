import Link from "next/link";
import { CREATIVE_ANGLE_VI, isCreativeAngle } from "@/domain/creative-angles";
import type { LibraryAdCard } from "@/domain/ad-library-cards";
import { LANDING_KIND_VI } from "@/domain/landing";
import { AdActions } from "@/ui/ad-actions";

function day(ms: number): string {
  if (!ms) {
    return "—";
  }
  return new Date(ms).toISOString().slice(0, 10);
}

export function SpyCard({
  card,
  boards,
  tags,
}: {
  card: LibraryAdCard;
  boards: Array<{ slug: string; name: string }>;
  tags: string[];
}) {
  const angles = [...new Set([...card.angles, ...tags.filter(isCreativeAngle)])];
  return (
    <article className="spy-card">
      <Link href={`/san-pham/${card.clusterSlug}`} className="spy-cover">
        {card.imageUrl ? <img src={card.imageUrl} alt="" /> : <div className="spy-cover-empty">No creative</div>}
        <span className="spy-platform">Facebook</span>
        {card.isActive ? <span className="spy-live">In-play</span> : <span className="spy-live off">Off</span>}
      </Link>
      <div className="spy-card-body">
        <div className="spy-adv">
          <strong>{card.pageName}</strong>
          <span className="muted">ID {card.pageId}</span>
        </div>
        <Link href={`/san-pham/${card.clusterSlug}`} className="spy-title">
          {card.clusterTitle}
        </Link>
        <p className="spy-copy">{card.hook || card.copy || "Chưa có copy trên thẻ đã lưu."}</p>
        <p className="product-price">{card.priceLabel}</p>
        <div className="spy-stats" title="Ước lượng từ thẻ đã lưu — không phải like/share Facebook">
          <span>
            <b>{card.intensity}</b> Intensity
          </span>
          <span>
            <b>{card.longevity}</b> Longevity
          </span>
          <span>
            <b>{card.velocity}</b> Velocity
          </span>
          <span>
            <b>{card.heat}</b> Heat ước lượng
          </span>
        </div>
        <div className="spy-meta">
          <span>First seen {day(card.firstSeenMs)}</span>
          <span>Last seen {day(card.lastSeenMs)}</span>
          <span>{card.daysRunning} running days</span>
        </div>
        <div className="chip-row">
          <span className={`badge ${card.lane === "fresh" ? "warn" : ""}`}>
            {card.lane === "trending" ? "Trending" : card.lane === "fresh" ? "Fresh" : "Other"}
          </span>
          <span className="badge muted">{card.nicheName}</span>
          {card.landingKind !== "none" ? <span className="badge muted">{LANDING_KIND_VI[card.landingKind]}</span> : null}
          {angles.slice(0, 2).map((angle) => (
            <span className="badge muted" key={angle}>
              {CREATIVE_ANGLE_VI[angle]}
            </span>
          ))}
        </div>
        <div className="spy-actions">
          <Link className="btn" href={`/san-pham/${card.clusterSlug}`}>
            Details
          </Link>
          <a className="btn secondary" href={card.libraryAdUrl} target="_blank" rel="noreferrer">
            See Ad
          </a>
          <a className="btn secondary" href={card.libraryPageUrl} target="_blank" rel="noreferrer">
            Page
          </a>
          {card.landingUrl ? (
            <a className="btn secondary" href={card.landingUrl} target="_blank" rel="noreferrer">
              Landing
            </a>
          ) : null}
        </div>
        <AdActions libraryId={card.libraryId} boards={boards} initialTags={tags} />
      </div>
    </article>
  );
}
