import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduCommerce Platform",
  description: "Video courses, documents, bundles, rewarded learning",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <div className="shell">
            <header className="top">
              <a className="brand" href="/">
                EduCommerce
              </a>
              <nav>
                <a href="/">Store</a>
                <a href="/library">My Library</a>
                <a href="/notifications">Alerts</a>
                <a href="/teacher">Teacher</a>
                <a href="/admin">Admin</a>
                <a href="/login">Login</a>
              </nav>
            </header>
            <main>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
