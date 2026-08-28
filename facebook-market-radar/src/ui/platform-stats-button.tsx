"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collectJsonHeaders } from "@/ui/collect-headers";
import { PlatformKeysForm } from "@/ui/platform-keys-form";

type Caps = {
  youtube: boolean;
  googleCse: boolean;
  shopeeShop: boolean;
  lazadaShop: boolean;
  tiktokShop: boolean;
};

const EMPTY: Caps = {
  youtube: false,
  googleCse: false,
  shopeeShop: false,
  lazadaShop: false,
  tiktokShop: false,
};

function capLabel(id: keyof Caps): string {
  if (id === "youtube") return "YouTube Data API";
  if (id === "googleCse") return "Google CSE (đích sàn)";
  if (id === "shopeeShop") return "Shopee shop tôi";
  if (id === "lazadaShop") return "Lazada shop tôi";
  return "TikTok Shop tôi";
}

export function PlatformStatsButton() {
  const router = useRouter();
  const [caps, setCaps] = useState<Caps>(EMPTY);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void fetch("/api/platform-stats")
      .then((res) => res.json())
      .then((json: { enabled?: Caps }) => {
        if (json.enabled) {
          setCaps(json.enabled);
        }
      })
      .catch(() => undefined);
  }, []);

  async function onClick() {
    setPending(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/platform-stats", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: JSON.stringify({ action: "all" }),
    });
    const json = (await response.json()) as {
      error?: string;
      youtubeIds?: { updated?: number; videoCount?: number } | null;
      youtubeSearch?: { queried?: number; viewsUpdated?: number; linksSaved?: number } | null;
      listingSearch?: { queried?: number; linksSaved?: number } | null;
      ownShop?: Array<{ platform: string; items: number }>;
    };
    setPending(false);
    if (!response.ok) {
      setError(json.error ?? "Không lấy được thống kê API");
      return;
    }
    const own = (json.ownShop ?? []).reduce((sum, row) => sum + row.items, 0);
    setMessage(
      `YouTube ID: ${json.youtubeIds?.updated ?? 0} cụm / ${json.youtubeIds?.videoCount ?? 0} video. ` +
        `YouTube tìm: ${json.youtubeSearch?.viewsUpdated ?? 0} view / ${json.youtubeSearch?.linksSaved ?? 0} link. ` +
        `CSE đích: ${json.listingSearch?.linksSaved ?? 0} URL / ${json.listingSearch?.queried ?? 0} lần. ` +
        `Shop của tôi: ${own} SKU. Không bịa đã bán đối thủ, views không vào điểm nóng.`,
    );
    router.refresh();
  }

  const any = Object.values(caps).some(Boolean);

  return (
    <div className="youtube-views-box">
      <p className="muted">
        Gọi API chính thức: googleapis (YouTube + Custom Search) và Open Platform shop của bạn. Không mở
        shopee.vn / tiki.vn / youtube.com HTML. Không có API “đã bán đối thủ”.
      </p>
      <p className="muted">
        {(["youtube", "googleCse", "shopeeShop", "lazadaShop", "tiktokShop"] as const).map((id) => (
          <span key={id} className={caps[id] ? "badge" : "badge warn"} style={{ marginRight: 6 }}>
            {capLabel(id)}: {caps[id] ? "đã khóa" : "chưa khóa"}
          </span>
        ))}
      </p>
      <button type="button" className="btn" disabled={pending} onClick={() => void onClick()}>
        {pending ? "Đang gọi API…" : "Lấy thống kê API (mọi cổng đã khóa)"}
      </button>
      {!any ? (
        <p className="muted">
          Chưa có khóa trên máy chủ. Dán khóa API chính thức ở form dưới — không dùng session đăng nhập
          app, không sửa <code>.env</code> rồi restart nếu bạn gắn tại đây.
        </p>
      ) : null}
      {error ? <p className="err">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
      <PlatformKeysForm boxed={false} onSaved={setCaps} />
    </div>
  );
}
