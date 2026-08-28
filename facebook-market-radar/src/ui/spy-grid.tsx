import type { LibraryAdCard } from "@/domain/ad-library-cards";
import { SpyCard } from "./spy-card";

export function SpyGrid({
  cards,
  boards,
  tagsById,
}: {
  cards: LibraryAdCard[];
  boards: Array<{ slug: string; name: string }>;
  tagsById: Map<string, string[]>;
}) {
  return (
    <div className="spy-grid">
      {cards.map((card) => (
        <SpyCard key={card.libraryId} card={card} boards={boards} tags={tagsById.get(card.libraryId) ?? []} />
      ))}
    </div>
  );
}
