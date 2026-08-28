import type { Metadata } from "next";
import { AppShell } from "@/ui/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar Ad Library — ads & sàn VN",
  description:
    "Thống kê ads Facebook đã lưu và chỉ số Shopee / Lazada / Google / YouTube bạn nhập. Không crawl đối thủ.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
