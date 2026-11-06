"use client";
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

/** Registra o service worker (somente em produção). */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const CHAVE = "sm_instalar_dispensado";

/** Convite para instalar o app: botão nativo no Android/Chrome/Edge; instrução no iPhone (Safari). */
export function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [ios, setIos] = useState(false);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    let dispensado = false;
    try {
      dispensado = Number(localStorage.getItem(CHAVE) ?? 0) > Date.now();
    } catch {}
    if (instalado || dispensado) return;
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)) {
      setIos(true);
      setVisivel(true);
    }
    const aoOferecer = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
      setVisivel(true);
    };
    const aoInstalar = () => setVisivel(false);
    window.addEventListener("beforeinstallprompt", aoOferecer);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoOferecer);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  function dispensar() {
    setVisivel(false);
    try {
      localStorage.setItem(CHAVE, String(Date.now() + 14 * 864e5)); // volta a oferecer em 14 dias
    } catch {}
  }
  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    setEvento(null);
    if (outcome === "accepted") setVisivel(false);
    else dispensar();
  }

  if (!visivel || (!evento && !ios)) return null;
  return (
    <div className="panel mb-5 flex items-start gap-3 p-3.5 text-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="size-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-white">Instale o app Senhor Multas</div>
        {ios ? (
          <p className="mt-0.5 text-xs text-ink-300">
            Toque em <Share className="inline size-3.5 -translate-y-px" /> <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>. Fica mais rápido fotografar a notificação.
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-ink-300">Acesso direto pela tela inicial do celular, em tela cheia, para fotografar a notificação.</p>
        )}
        {evento && (
          <button onClick={instalar} className="btn btn-primary mt-2.5 !py-1.5 !text-xs">
            <Download className="size-3.5" /> Instalar
          </button>
        )}
      </div>
      <button onClick={dispensar} aria-label="Agora não" className="text-ink-400 hover:text-white">
        <X className="size-4" />
      </button>
    </div>
  );
}
