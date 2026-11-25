import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "BugTrace — система багрепортов",
  description: "Отправка багрепортов с AI-помощью: описание по скрину, теги, похожие баги",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AppHeader />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
