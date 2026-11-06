import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Senhor Multas · Defesa de multas com IA",
    short_name: "Sr. Multas",
    description: "Envie a foto da notificação e receba a Defesa Pronta em minutos, com lei e jurisprudência conferidas.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/app?origem=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#05070f",
    theme_color: "#05070f",
    categories: ["productivity", "utilities", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nova defesa", short_name: "Nova defesa", description: "Enviar a foto de uma notificação", url: "/app/nova", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Minhas defesas", short_name: "Defesas", url: "/app/defesas", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
