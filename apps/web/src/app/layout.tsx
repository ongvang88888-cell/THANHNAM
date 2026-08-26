import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduCommerce — Khóa học và tài liệu",
  description: "Trường học trực tuyến: khóa video, tài liệu nghiên cứu, combo và studio giảng viên",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
