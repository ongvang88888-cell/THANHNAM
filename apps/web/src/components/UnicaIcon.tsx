import type { QuickLink } from "@/lib/unica-data";

const PATHS: Record<QuickLink["icon"], string> = {
  share:
    "M12 5v8M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5",
  bag: "M6 8h12l-1 12H7L6 8zm3 0V6a3 3 0 0 1 6 0v2",
  store: "M4 9l1.5-5h13L20 9M5 9v10h14V9M9 19v-6h6v6",
  cap: "M3 10l9-5 9 5-9 5-9-5zm4 3v4c2 1.2 4 1.8 5 1.8S16 18.2 18 17v-4",
  video: "M4 7h11v10H4zM15 10l5-2v8l-5-2z",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM4 19a5 5 0 0 1 10 0M15 19a4 4 0 0 1 6 0",
  game: "M6 10h12a3 3 0 0 1 0 6H6a3 3 0 0 1 0-6zm2 3h2m6.5-.5h.01M16 14.5h.01",
  book: "M5 5h9a3 3 0 0 1 3 3v11H8a3 3 0 0 0-3 3V5zm9 0v14",
  chart: "M5 19h14M7 16v-5m5 5V8m5 8v-3",
};

export function UnicaIcon({ name }: { name: QuickLink["icon"] }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
