"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { apiGet } from "@/lib/api";

function PayInner() {
  const search = useSearchParams();
  const router = useRouter();
  const clientSecret = search.get("clientSecret") ?? "";
  const orderId = search.get("orderId") ?? "";
  const [msg, setMsg] = useState("Đang khởi tạo Stripe…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clientSecret) {
        setError("Thiếu clientSecret");
        return;
      }
      if (clientSecret.startsWith("test_secret_")) {
        setMsg("Stripe sandbox stub — quay lại trang đơn.");
        if (orderId) router.replace(`/checkout/return?orderId=${orderId}`);
        return;
      }
      try {
        const cfg = await apiGet<{ checkout: { stripePublishableKey: string | null } }>(
          "/remote-config",
        );
        const pk =
          cfg.checkout.stripePublishableKey ||
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
          "";
        if (!pk) {
          setError("Thiếu Stripe publishable key trên remote-config / env.");
          return;
        }
        const stripe = await loadStripe(pk);
        if (!stripe || cancelled) return;
        const result = await stripe.confirmPayment({
          clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/checkout/return?orderId=${orderId}`,
          },
        });
        if (result.error) setError(result.error.message ?? "Stripe confirm failed");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Stripe failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientSecret, orderId, router]);

  return (
    <section className="u-wrap panel">
      <h1>Thanh toán Stripe</h1>
      {error ? <p className="error">{error}</p> : <p className="muted">{msg}</p>}
      {orderId && <a href={`/checkout/return?orderId=${orderId}`}>Xem trạng thái đơn</a>}
    </section>
  );
}

export default function CheckoutPayPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <PayInner />
    </Suspense>
  );
}
