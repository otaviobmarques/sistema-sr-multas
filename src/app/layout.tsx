import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Senhor Multas · Defesa de multas com IA",
  description: "Envie a notificação, receba a Defesa Pronta em minutos — com fontes verificadas, validada e assinada por você.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#05070f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
