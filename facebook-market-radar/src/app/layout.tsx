import type { Metadata } from "next";
import { AppShell } from "@/ui/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar Ad Library — Facebook Market Radar (VN)",
  description:
    "Ad Library cho thẻ Facebook đã lưu. Điểm nóng ước lượng — không phải like, share, impression hay doanh số đối thủ.",
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
