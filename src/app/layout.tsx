import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "스마트팜 대시보드 | 0420project",
  description: "HiveMQ + Supabase 스마트팜 모니터링",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
