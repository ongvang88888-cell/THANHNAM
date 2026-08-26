"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PriceTag } from "@/components/PriceTag";
import { coverStyle } from "@/lib/catalog";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { formatVnd } from "@/lib/api";
import { followCheckout, startCheckout, type CheckoutProvider } from "@/lib/checkout";

export default function CartPage() {
  const { items, remove, clear, totalMinor } = useCart();
  const { token, ready } = useAuth();
  const router = useRouter();
  const [provider, setProvider] = useState<CheckoutProvider>("mock");
  const [couponCode, setCouponCode] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function pay(productId: string) {
    if (!ready) return;
    if (!token) {
      router.push(`/login?next=${encodeURIComponent("/cart")}`);
      return;
    }
    setBusyId(productId);
    setMsg(null);
    try {
      const outcome = await startCheckout({ productId, token, provider, couponCode });
      if (outcome.kind === "done") remove(productId);
      followCheckout(outcome, (href) => router.push(href));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Không thanh toán được");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="u-wrap">
      <div className="u-page-head">
        <h1>Giỏ hàng</h1>
        <p className="muted">{items.length} khóa học đang chờ thanh toán</p>
      </div>
      {items.length === 0 && (
        <div className="u-empty">
          <p>Giỏ hàng trống.</p>
          <a className="btn" href="/khoa-hoc">
            Tiếp tục xem khóa học
          </a>
        </div>
      )}
      <div className="u-cart-list">
        {items.map((row) => (
          <div className="u-cart-row" key={row.productId}>
            <div className="u-card-cover" style={coverStyle(row.slug)}>
              {row.name.slice(0, 1)}
            </div>
            <div>
              <h3>
                <a href={`/products/${row.slug}`}>{row.name}</a>
              </h3>
              <PriceTag amountMinor={row.amountMinor} compareAtMinor={row.compareAtMinor} />
            </div>
            <div className="studio-actions">
              <button type="button" disabled={busyId === row.productId} onClick={() => void pay(row.productId)}>
                {busyId === row.productId ? "…" : "Mua ngay"}
              </button>
              <button type="button" className="ghost" onClick={() => remove(row.productId)}>
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>
      {items.length > 0 && (
        <aside className="u-cart-sum">
          <p>
            Tạm tính: <strong>{formatVnd(totalMinor)}</strong>
          </p>
          <label>Cổng thanh toán</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value as CheckoutProvider)}>
            <option value="mock">Thử nghiệm</option>
            <option value="vnpay">VNPay</option>
            <option value="momo">MoMo</option>
            <option value="zalopay">ZaloPay</option>
            <option value="stripe">Stripe</option>
          </select>
          <label>Mã giảm giá</label>
          <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="WELCOME10" />
          <button
            type="button"
            disabled={!items[0] || Boolean(busyId)}
            onClick={() => items[0] && void pay(items[0].productId)}
          >
            Thanh toán khóa đầu tiên
          </button>
          <button type="button" className="ghost" onClick={clear}>
            Xóa giỏ hàng
          </button>
          {msg && <p className="error">{msg}</p>}
        </aside>
      )}
    </div>
  );
}
