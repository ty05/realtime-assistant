import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "リアルタイム顧客対応アシスタント",
  description: "AI-powered real-time assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}