"use client";

import { useState } from "react";
import type { NicheDef } from "@/domain/niches";

export function CollectForm({
  niches,
  defaultUrl,
}: {
  niches: NicheDef[];
  defaultUrl: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const snapshotRaw = String(form.get("snapshot") ?? "").trim();
    let snapshot: unknown;
    if (snapshotRaw) {
      try {
        snapshot = JSON.parse(snapshotRaw) as unknown;
      } catch {
        setError("Snapshot JSON không hợp lệ");
        setPending(false);
        return;
      }
    }
    const shopee = String(form.get("shopeeSold") ?? "").trim();
    const tiktok = String(form.get("tiktokSold") ?? "").trim();
    const body = {
      sourceUrl: String(form.get("sourceUrl") ?? "").trim() || undefined,
      snapshot,
      libraryId: String(form.get("libraryId") ?? "").trim() || undefined,
      pageId: String(form.get("pageId") ?? "").trim() || undefined,
      pageName: String(form.get("pageName") ?? "").trim() || undefined,
      productTitle: String(form.get("productTitle") ?? "").trim() || undefined,
      startDate: String(form.get("startDate") ?? "").trim() || undefined,
      nicheSlug: String(form.get("nicheSlug") ?? "").trim() || undefined,
      landingUrl: String(form.get("landingUrl") ?? "").trim() || undefined,
      body: String(form.get("body") ?? "").trim() || undefined,
      shopeeSold: shopee ? Number(shopee) : undefined,
      tiktokSold: tiktok ? Number(tiktok) : undefined,
      isActive: form.get("isActive") !== "false",
    };
    const response = await fetch("/api/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as { error?: string; clusterSlug?: string; libraryId?: string };
    setPending(false);
    if (!response.ok) {
      setError(json.error ?? "Không lưu được");
      return;
    }
    setMessage(`Đã lưu ${json.libraryId} → cụm ${json.clusterSlug}`);
  }

  return (
    <form className="stack" onSubmit={(e) => void onSubmit(e)}>
      <label>
        URL Ad Library
        <input name="sourceUrl" defaultValue={defaultUrl} placeholder="https://www.facebook.com/ads/library/?id=..." />
      </label>
      <label>
        libraryId
        <input name="libraryId" placeholder="Lấy từ ?id= nếu URL chưa có" />
      </label>
      <label>
        pageId
        <input name="pageId" required={false} />
      </label>
      <label>
        Tên page
        <input name="pageName" />
      </label>
      <label>
        Tên sản phẩm
        <input name="productTitle" />
      </label>
      <label>
        Ngày bắt đầu chạy (YYYY-MM-DD)
        <input name="startDate" placeholder="2026-08-01" />
      </label>
      <label>
        Ngách
        <select name="nicheSlug" defaultValue="gadget">
          {niches.map((n) => (
            <option key={n.slug} value={n.slug}>
              {n.nameVi}
            </option>
          ))}
        </select>
      </label>
      <label>
        Landing URL (không bắt buộc)
        <input name="landingUrl" />
      </label>
      <label>
        Copy ads (không bắt buộc)
        <textarea name="body" rows={3} />
      </label>
      <label>
        Shopee đã bán (proxy, tự nhập)
        <input name="shopeeSold" inputMode="numeric" />
      </label>
      <label>
        TikTok đã bán (proxy, tự nhập)
        <input name="tiktokSold" inputMode="numeric" />
      </label>
      <label>
        Snapshot JSON (copy tay)
        <textarea name="snapshot" rows={5} placeholder='{"libraryId":"...","pageId":"...","pageName":"...","startDate":"2026-08-01"}' />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Đang lưu…" : "Lưu ads"}
      </button>
      {error ? <p className="err">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
    </form>
  );
}
