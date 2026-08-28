"use client";

import { useState } from "react";
import { collectJsonHeaders } from "@/ui/collect-headers";
import { CollectKeyField } from "@/ui/collect-key-field";

type Board = { slug: string; name: string; note: string | null };
type Item = { boardSlug: string; libraryId: string; clusterSlug: string };

export function BoardsPanel({
  initialBoards,
  initialItems,
}: {
  initialBoards: Board[];
  initialItems: Item[];
}) {
  const [boards, setBoards] = useState(initialBoards);
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createBoard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const response = await fetch("/api/boards", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: JSON.stringify({
        name: String(form.get("name") ?? "").trim(),
        note: String(form.get("note") ?? "").trim() || null,
      }),
    });
    const json = (await response.json()) as { error?: string; board?: Board };
    if (!response.ok || !json.board) {
      setError(json.error ?? "Không tạo được");
      return;
    }
    setBoards((prev) => [json.board!, ...prev.filter((row) => row.slug !== json.board!.slug)]);
    setMessage(`Đã lưu bộ sưu tập ${json.board.name}`);
    formEl.reset();
  }

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const response = await fetch("/api/boards/items", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: JSON.stringify({
        boardSlug: String(form.get("boardSlug") ?? "").trim(),
        libraryId: String(form.get("libraryId") ?? "").trim(),
      }),
    });
    const json = (await response.json()) as { error?: string; item?: Item };
    if (!response.ok || !json.item) {
      setError(json.error ?? "Không ghim được");
      return;
    }
    setItems((prev) => [json.item!, ...prev.filter((row) => !(row.boardSlug === json.item!.boardSlug && row.libraryId === json.item!.libraryId))]);
    setMessage(`Đã ghim ${json.item.libraryId}`);
    formEl.reset();
  }

  async function removeItem(boardSlug: string, libraryId: string) {
    setError(null);
    const response = await fetch("/api/boards/items", {
      method: "DELETE",
      headers: collectJsonHeaders(),
      body: JSON.stringify({ boardSlug, libraryId }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "Không gỡ được");
      return;
    }
    setItems((prev) => prev.filter((row) => !(row.boardSlug === boardSlug && row.libraryId === libraryId)));
  }

  return (
    <div className="stack">
      <CollectKeyField />
      <form className="stack" onSubmit={(event) => void createBoard(event)}>
        <label>
          Tên bộ sưu tập (góc / swipe file)
          <input name="name" placeholder="Hook giá — skincare" required />
        </label>
        <label>
          Ghi chú
          <input name="note" />
        </label>
        <button type="submit">Tạo / cập nhật</button>
      </form>
      <form className="stack" onSubmit={(event) => void addItem(event)}>
        <label>
          Bộ sưu tập
          <select name="boardSlug" required>
            {boards.map((board) => (
              <option key={board.slug} value={board.slug}>
                {board.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mã thư viện đã lưu
          <input name="libraryId" placeholder="111000021" required />
        </label>
        <button type="submit">Ghim thẻ</button>
      </form>
      {error ? <p className="err">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
      {boards.length === 0 ? <p className="muted">Chưa có bộ sưu tập.</p> : null}
      {boards.map((board) => {
        const pinned = items.filter((item) => item.boardSlug === board.slug);
        return (
          <article className="card" key={board.slug}>
            <h2>{board.name}</h2>
            {board.note ? <p className="muted">{board.note}</p> : null}
            <ul>
              {pinned.map((item) => (
                <li key={item.libraryId}>
                  {item.libraryId} → {item.clusterSlug}{" "}
                  <button type="button" className="secondary" onClick={() => void removeItem(board.slug, item.libraryId)}>
                    Gỡ
                  </button>
                </li>
              ))}
            </ul>
            {pinned.length === 0 ? <p className="muted">Chưa ghim thẻ.</p> : null}
          </article>
        );
      })}
    </div>
  );
}
