"use client";

import { useState } from "react";
import { CREATIVE_ANGLE_VI, CREATIVE_ANGLES } from "@/domain/creative-angles";
import { collectJsonHeaders } from "@/ui/collect-headers";

export function AdActions({
  libraryId,
  boards,
  initialTags,
}: {
  libraryId: string;
  boards: Array<{ slug: string; name: string }>;
  initialTags: string[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function pin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/boards/items", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: JSON.stringify({
        boardSlug: String(form.get("boardSlug") ?? "").trim(),
        libraryId,
      }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "Không ghim được");
      return;
    }
    setOk("Đã ghim");
  }

  async function saveTags(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/tags", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: JSON.stringify({
        libraryId,
        tags: form.getAll("tags").map((item) => String(item)),
      }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "Không gắn nhãn");
      return;
    }
    setOk("Đã gắn góc");
  }

  return (
    <div className="ad-actions">
      {boards.length > 0 ? (
        <form onSubmit={(event) => void pin(event)}>
          <select name="boardSlug">
            {boards.map((board) => (
              <option key={board.slug} value={board.slug}>
                {board.name}
              </option>
            ))}
          </select>
          <button type="submit">Ghim</button>
        </form>
      ) : null}
      <form onSubmit={(event) => void saveTags(event)}>
        {CREATIVE_ANGLES.map((angle) => (
          <label key={angle}>
            <input type="checkbox" name="tags" value={angle} defaultChecked={initialTags.includes(angle)} />
            {CREATIVE_ANGLE_VI[angle]}
          </label>
        ))}
        <button type="submit">Lưu góc</button>
      </form>
      {error ? <p className="err">{error}</p> : null}
      {ok ? <p className="ok">{ok}</p> : null}
    </div>
  );
}
