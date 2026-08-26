"use client";

import { useState } from "react";
import { UnicaLogo } from "@/components/UnicaLogo";

export default function ActivatePage() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="u-auth">
      <UnicaLogo />
      <h1>Kích hoạt khóa học</h1>
      <p className="muted">
        Nhập mã kích hoạt bạn nhận được sau khi mua combo, voucher doanh nghiệp hoặc thẻ quà tặng Unica.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!code.trim()) {
            setMsg("Vui lòng nhập mã kích hoạt");
            return;
          }
          setMsg(
            "Mã đã được ghi nhận. Nếu mã hợp lệ, khóa học sẽ xuất hiện trong “Khóa học của tôi”. Bạn cũng có thể dán mã giảm giá khi thanh toán.",
          );
        }}
      >
        <label>Mã kích hoạt</label>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="UNICA-XXXX-XXXX" />
        <button type="submit">Kích hoạt</button>
      </form>
      {msg && <p className="ok">{msg}</p>}
      <p className="muted">
        Đã có tài khoản? Dùng mã như coupon tại trang <a href="/cart">giỏ hàng</a> hoặc{" "}
        <a href="/khoa-hoc">mua khóa học</a>.
      </p>
    </section>
  );
}
