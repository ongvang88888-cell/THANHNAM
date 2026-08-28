import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar thị trường Facebook (VN)",
  description:
    "Thống kê ngành hàng và sản phẩm đang chạy quảng cáo Facebook bằng tín hiệu gián tiếp — không phải doanh số đối thủ.",
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <header className="nav">
          <div className="inner">
            <strong>Radar FB Việt Nam</strong>
            <nav>
              <Link href="/">Xếp hạng sản phẩm</Link>
              <Link href="/xu-huong">Xu hướng</Link>
              <Link href="/nganh">Ngành chạy mạnh</Link>
              <Link href="/theo-doi">Theo dõi</Link>
              <Link href="/bo-suu-tap">Bộ sưu tập</Link>
              <Link href="/quet">Quét cành</Link>
              <Link href="/nguon">Nguồn dữ liệu</Link>
              <Link href="/collect">Lưu quảng cáo</Link>
              <Link href="/ads">Quảng cáo đã lưu</Link>
              <Link href="/alerts">Cảnh báo</Link>
              <Link href="/own-ads">Tài khoản của tôi</Link>
              <Link href="/report">Báo cáo tuần</Link>
              <Link href="/niches">Danh mục ngành</Link>
            </nav>
          </div>
        </header>
        <div className="wrap">{props.children as never}</div>
      </body>
    </html>
  );
}
