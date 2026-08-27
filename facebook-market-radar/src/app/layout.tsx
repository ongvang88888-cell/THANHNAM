import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Facebook Market Radar (VN)",
  description: "Thống kê thị trường ads Facebook bằng tín hiệu gián tiếp — không phải doanh số đối thủ.",
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <header className="nav">
          <div className="inner">
            <strong>FMR VN</strong>
            <nav>
              <Link href="/">Xếp hạng</Link>
              <Link href="/collect">Lưu ads</Link>
              <Link href="/ads">Ads đã lưu</Link>
              <Link href="/alerts">Cảnh báo</Link>
              <Link href="/own-ads">Ads của tôi</Link>
              <Link href="/report">Báo cáo tuần</Link>
              <Link href="/niches">Vòng 0</Link>
            </nav>
          </div>
        </header>
        <div className="wrap">{props.children as never}</div>
      </body>
    </html>
  );
}
