"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { collectJsonHeaders } from "@/ui/collect-headers";
import { CollectKeyField } from "@/ui/collect-key-field";

type Caps = {
  youtube: boolean;
  googleCse: boolean;
  shopeeShop: boolean;
  lazadaShop: boolean;
  tiktokShop: boolean;
};

type Guide = {
  id: string;
  titleVi: string;
  href: string;
  keys: readonly string[];
  fills: string;
};

const EMPTY: Caps = {
  youtube: false,
  googleCse: false,
  shopeeShop: false,
  lazadaShop: false,
  tiktokShop: false,
};

function capOn(id: string, caps: Caps): boolean {
  if (id === "youtube") return caps.youtube;
  if (id === "cse") return caps.googleCse;
  if (id === "shopee") return caps.shopeeShop;
  if (id === "lazada") return caps.lazadaShop;
  if (id === "tiktok") return caps.tiktokShop;
  return false;
}

export function PlatformKeysForm({
  onSaved,
  boxed = true,
}: {
  onSaved?: (caps: Caps) => void;
  boxed?: boolean;
}) {
  const router = useRouter();
  const [caps, setCaps] = useState<Caps>(EMPTY);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/platform-keys")
      .then((res) => res.json())
      .then((json: { configured?: Caps; guides?: Guide[] }) => {
        if (json.configured) {
          setCaps(json.configured);
        }
        if (json.guides) {
          setGuides(json.guides);
        }
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const body: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string" && value.trim()) {
        body[key] = value.trim();
      }
    }
    const response = await fetch("/api/platform-keys", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as { error?: string; configured?: Caps };
    setPending(false);
    if (!response.ok) {
      setError(json.error ?? "Không lưu được khóa");
      return;
    }
    if (json.configured) {
      setCaps(json.configured);
      onSaved?.(json.configured);
    }
    event.currentTarget.reset();
    setMessage(
      "Đã lưu khóa trên máy chủ (không hiện lại). Radar gọi API chính thức nếu khóa đủ — không lấy session trình duyệt, không scrape HTML.",
    );
    router.refresh();
  }

  return (
    <form className={boxed ? "youtube-views-box" : "platform-keys-form"} onSubmit={(event) => void onSubmit(event)}>
      <CollectKeyField />
      <p className="muted">
        Đăng nhập Shopee / YouTube / Google trên điện thoại <strong>không phải</strong> khóa API. Dán
        khóa từ trang chính thức vào form này — khóa không đi qua chat, không hiện lại. Shop của bạn
        không thành cột đã bán đối thủ. Tiki / Sendo vẫn nhập tay.
      </p>
      {guides.map((guide) => (
        <details key={guide.id}>
          <summary>
            {guide.titleVi} — {capOn(guide.id, caps) ? "đã gắn" : "chưa gắn"}
          </summary>
          <p className="muted">{guide.fills}</p>
          <p>
            <a href={guide.href} target="_blank" rel="noreferrer">
              Mở trang cấp khóa chính thức
            </a>
          </p>
          {guide.keys.map((key) => (
            <label key={key}>
              {key}
              {capOn(guide.id, caps) ? " (đã có — để trống nếu giữ)" : ""}
              <input type="password" name={key} autoComplete="off" placeholder={key} />
            </label>
          ))}
        </details>
      ))}
      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Đang lưu…" : "Lưu khóa và lấy thống kê"}
      </button>
      {error ? <p className="err">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
    </form>
  );
}
