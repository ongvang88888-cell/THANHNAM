import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

/** Self-hosted Vietnamese-capable UI font (avoids CDN @import / broken diacritics). */
const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Đậu GPLX · EduCommerce",
  description: "Ôn lý thuyết GPLX sống động — thi thử, flashcard, điểm liệt, lộ trình đậu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
