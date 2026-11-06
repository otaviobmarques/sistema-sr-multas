"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Loader2, Paperclip, Send, UserRound, FileText } from "lucide-react";
import type { MensagemChat } from "@/lib/types";

function Md({ t }: { t: string }) {
  return (
    <>
      {t.split("\n").map((linha, i) => (
        <p key={i} className={linha ? "" : "h-2"}>
          {linha.split(/(\*\*[^*]+\*\*)/g).map((p, j) => (p.startsWith("**") ? <b key={j} className="text-white">{p.slice(2, -2)}</b> : p))}
        </p>
      ))}
    </>
  );
}

export default function Assistente() {
  const [msgs, setMsgs] = useState<MensagemChat[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/chat").then((r) => r.json()).then((r) => setMsgs(r.mensagens));
  }, []);
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, enviando]);

  async function enviar(file?: File) {
    if (!file && !texto.trim()) return;
    const fd = new FormData();
    fd.append("texto", texto);
    if (file) fd.append("arquivo", file);
    setMsgs((m) => [...m, { id: "tmp", usuario_id: "", papel: "user", texto: texto || "Enviei a notificação.", anexo: file?.name, data: "" }]);
    setTexto("");
    setEnviando(true);
    const r = await fetch("/api/chat", { method: "POST", body: fd }).then((r) => r.json());
    setEnviando(false);
    if (r.mensagens) setMsgs(r.mensagens);
  }

  const sugestoes = ["Quais são as fases do recurso?", "Quanto custa?", "Vale mais a pena pagar com desconto?", "Vocês garantem que eu ganho?"];

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-3xl flex-col">
      <div className="panel flex items-center gap-3 rounded-b-none !border-b-0 px-5 py-4">
        <div className="relative grid size-10 place-items-center rounded-full bg-gradient-to-br from-brand-soft to-brand text-sm font-extrabold text-[#1a1203]">
          SM
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-ink-900 bg-ok" />
        </div>
        <div>
          <div className="font-semibold text-white">Sr. Multas</div>
          <div className="text-xs text-ink-400">Assistente com IA · online · também no WhatsApp</div>
        </div>
      </div>

      <div className="panel flex-1 space-y-4 overflow-y-auto rounded-none px-5 py-6">
        <Bolha papel="assistant"><p>Olá! Sou o Sr. Multas. Me envie a <b className="text-white">foto ou o PDF da notificação</b> que eu analiso para você. 📎</p></Bolha>
        {msgs.map((m) => (
          <div key={m.id + m.data} className="rise">
            <Bolha papel={m.papel}>
              {m.anexo && <div className="mb-1 flex items-center gap-1.5 text-xs opacity-80"><FileText className="size-3.5" /> {m.anexo}</div>}
              <Md t={m.texto} />
            </Bolha>
            {m.acoes && (
              <div className="mt-2 flex flex-wrap gap-2 pl-11">
                {m.acoes.map((a, i) => (
                  <Link key={a.href} href={a.href} className={clsx("btn !px-3 !py-1.5 !text-xs", i === 0 ? "bg-ia/10 text-ia ring-1 ring-ia/30" : "btn-ghost")}>{a.rotulo}</Link>
                ))}
                {m.cartao && <a href="mailto:atendimento@senhormultas.com.br" className="btn btn-ghost !px-3 !py-1.5 !text-xs"><UserRound className="size-3.5" /> Falar com humano</a>}
              </div>
            )}
          </div>
        ))}
        {enviando && <Bolha papel="assistant"><span className="flex items-center gap-2 text-ink-400"><Loader2 className="size-4 animate-spin" /> analisando…</span></Bolha>}
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2 pl-11">
            {sugestoes.map((s) => <button key={s} onClick={() => setTexto(s)} className="btn btn-ghost !px-3 !py-1.5 !text-xs">{s}</button>)}
          </div>
        )}
        <div ref={fim} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="panel flex items-center gap-2 rounded-t-none p-3">
        <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); e.target.value = ""; }} />
        <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost !p-2.5" aria-label="Anexar notificação"><Paperclip className="size-4" /></button>
        <input className="input" placeholder="Digite sua dúvida…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button disabled={enviando} className="btn btn-primary"><Send className="size-4" /> Enviar</button>
      </form>
    </div>
  );
}

function Bolha({ papel, children }: { papel: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div className={clsx("flex gap-3", papel === "user" && "justify-end")}>
      {papel === "assistant" && <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-soft to-brand text-[10px] font-extrabold text-[#1a1203]">SM</div>}
      <div className={clsx("max-w-[80%] space-y-1 rounded-2xl px-4 py-3 text-sm leading-relaxed", papel === "user" ? "rounded-br-md bg-ia/12 text-ink-200 ring-1 ring-ia/25" : "rounded-bl-md bg-white/[.04] text-ink-300 ring-1 ring-white/8")}>
        {children}
      </div>
    </div>
  );
}
