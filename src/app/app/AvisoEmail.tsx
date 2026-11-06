"use client";
import { useState } from "react";
import { Loader2, MailWarning } from "lucide-react";
export function AvisoEmail({ email }: { email: string }) {
  const [estado, setEstado] = useState<{ c?: boolean; msg?: string; erro?: string }>({});
  async function reenviar() {
    setEstado({ c: true });
    const r = await fetch("/api/conta/reenviar-confirmacao", { method: "POST" }).then((r) => r.json()).catch(() => ({ erro: "Falha de conexão" }));
    setEstado(r.erro ? { erro: r.erro } : { msg: r.mensagem });
  }
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm">
      <MailWarning className="size-5 shrink-0 text-warn" />
      <div className="min-w-0 flex-1 text-warn">
        <b>Confirme seu e-mail</b> para comprar créditos e gerar defesas. Enviamos um link para <b>{email}</b>.
        {estado.msg && <span className="block text-ok">{estado.msg}</span>}
        {estado.erro && <span className="block text-bad">{estado.erro}</span>}
      </div>
      <button onClick={reenviar} disabled={estado.c && !estado.msg && !estado.erro} className="btn btn-ghost !py-1.5 !text-xs">{estado.c && !estado.msg && !estado.erro && <Loader2 className="size-3 animate-spin" />} Reenviar e-mail</button>
    </div>
  );
}
