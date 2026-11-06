import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { RegistrarSW } from "@/components/Pwa";

const URL_SITE = "https://senhormultas.com.br";
const TITULO = "Senhor Multas · Defesa de multas com IA";
const DESCRICAO = "Envie a foto da notificação e receba a Defesa Pronta em minutos, com lei e jurisprudência conferidas. Defesa prévia, JARI e CETRAN.";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: TITULO,
  description: DESCRICAO,
  applicationName: "Senhor Multas",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "16x16 32x32 48x48" }, { url: "/icons/favicon-32.png", type: "image/png", sizes: "32x32" }, { url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Sr. Multas", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: URL_SITE,
    siteName: "Senhor Multas",
    title: TITULO,
    description: DESCRICAO,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Senhor Multas: defesa de multas com inteligência artificial" }],
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO, images: ["/og.png"] },
};

export const viewport: Viewport = { themeColor: "#05070f", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
