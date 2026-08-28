"use client";

import { useMemo, useState } from "react";
import { CREATIVE_ANGLE_VI, CREATIVE_ANGLES } from "@/domain/creative-angles";
import { classifyLanding, LANDING_KIND_VI } from "@/domain/landing";
import { NICHE_GROUPS, type NicheDef } from "@/domain/niches";
import { collectJsonHeaders } from "@/ui/collect-headers";
import { CollectKeyField } from "@/ui/collect-key-field";

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
  const [landingUrl, setLandingUrl] = useState("");
  const landingKind = useMemo(() => classifyLanding(landingUrl), [landingUrl]);

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
        setError("JSON snapshot không hợp lệ");
        setPending(false);
        return;
      }
    }
    const shopee = String(form.get("shopeeSold") ?? "").trim();
    const tiktok = String(form.get("tiktokSold") ?? "").trim();
    const listingPrice = String(form.get("listingPriceVnd") ?? "").trim();
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
      imageUrl: String(form.get("imageUrl") ?? "").trim() || undefined,
      body: String(form.get("body") ?? "").trim() || undefined,
      listingPriceVnd: listingPrice || undefined,
      shopeeSold: shopee ? Number(shopee) : undefined,
      tiktokSold: tiktok ? Number(tiktok) : undefined,
      isActive: form.get("isActive") !== "false",
      watchPage: form.get("watchPage") === "on",
      tags: form.getAll("tags").map((item) => String(item)),
    };
    const response = await fetch("/api/collect", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as { error?: string; clusterSlug?: string; libraryId?: string };
    setPending(false);
    if (!response.ok) {
      setError(json.error ?? "Không lưu được");
      return;
    }
    setMessage(`Đã lưu ${json.libraryId} → sản phẩm ${json.clusterSlug}`);
  }

  return (
    <form className="stack" onSubmit={(e) => void onSubmit(e)}>
      <CollectKeyField />
      <label>
        Đường dẫn Thư viện quảng cáo
        <input name="sourceUrl" defaultValue={defaultUrl} placeholder="https://www.facebook.com/ads/library/?id=..." />
      </label>
      <label>
        Mã thư viện
        <input name="libraryId" placeholder="Lấy từ ?id= nếu đường dẫn chưa có" />
      </label>
      <label>
        Mã trang
        <input name="pageId" />
      </label>
      <label>
        Tên trang
        <input name="pageName" />
      </label>
      <label>
        Tên sản phẩm
        <input name="productTitle" />
      </label>
      <label>
        Ảnh sản phẩm (http/https hoặc để trống để tự tạo)
        <input name="imageUrl" placeholder="https://… hoặc để trống" />
      </label>
      <label>
        Ngày bắt đầu chạy (YYYY-MM-DD)
        <input name="startDate" placeholder="2026-08-01" />
      </label>
      <label>
        Ngành hàng
        <select name="nicheSlug" defaultValue="">
          <option value="">Tự nhận diện từ tên sản phẩm</option>
          {NICHE_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {niches
                .filter((n) => n.group === group)
                .map((n) => (
                  <option key={n.slug} value={n.slug}>
                    {n.nameVi}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label>
        Đường dẫn đích (không bắt buộc)
        <input
          name="landingUrl"
          value={landingUrl}
          onChange={(event) => setLandingUrl(event.target.value)}
          placeholder="https://shopee.vn/… hoặc landing"
        />
      </label>
      <p className="muted">Radar nhận loại đích: {LANDING_KIND_VI[landingKind]} — không mở URL đó.</p>
      <label className="scan-check">
        <input type="checkbox" name="watchPage" />
        Theo dõi trang này (cảnh báo khi bạn lưu thẻ mới — không crawl 24/7)
      </label>
      <fieldset className="angle-set">
        <legend>Góc creative (tùy chọn)</legend>
        {CREATIVE_ANGLES.map((angle) => (
          <label className="scan-check" key={angle}>
            <input type="checkbox" name="tags" value={angle} />
            {CREATIVE_ANGLE_VI[angle]}
          </label>
        ))}
      </fieldset>
      <label>
        Nội dung quảng cáo (không bắt buộc — nếu có giá kiểu 189.000đ / 189k sẽ được đọc)
        <textarea name="body" rows={3} />
      </label>
      <label>
        Giá bán (Shopee / TikTok / landing, VND — ước lượng)
        <input name="listingPriceVnd" placeholder="189000 hoặc 189.000đ / 189k" />
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
        <textarea
          name="snapshot"
          rows={5}
          placeholder='{"libraryId":"...","pageId":"...","pageName":"...","startDate":"2026-08-01"}'
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Đang lưu…" : "Lưu quảng cáo"}
      </button>
      {error ? <p className="err">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
    </form>
  );
}
