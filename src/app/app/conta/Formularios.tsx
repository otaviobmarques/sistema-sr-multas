"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2, Send } from "lucide-react";

async function post(url: string, body: unknown) {
  return fetch(url, { method: "POST", body: JSON.stringify(body) }).then((r) => r.json()).catch(() => ({ erro: "Falha de conexão" }));
}

export function TrocarSenha() {
  const [f, setF] = useState({ atual: "", nova: "", confirmacao: "" });
  const [estado, setEstado] = useState<{ carregando?: boolean; erro?: string; ok?: boolean }>({});
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado({ carregando: true });
    const r = await post("/api/conta/senha", f);
    if (r.erro) return setEstado({ erro: r.erro });
    setF({ atual: "", nova: "", confirmacao: "" });
    setEstado({ ok: true });
  }
  return (
    <form onSubmit={enviar} className="space-y-3">
      <input className="input" type="password" placeholder="Senha atual" autoComplete="current-password" value={f.atual} onChange={(e) => setF({ ...f, atual: e.target.value })} required />
      <input className="input" type="password" placeholder="Nova senha (10+ caracteres, letras e números)" autoComplete="new-password" value={f.nova} onChange={(e) => setF({ ...f, nova: e.target.value })} required />
      <input className="input" type="password" placeholder="Confirme a nova senha" autoComplete="new-password" value={f.confirmacao} onChange={(e) => setF({ ...f, confirmacao: e.target.value })} required />
      {estado.erro && <p className="text-sm text-bad">{estado.erro}</p>}
      {estado.ok && <p className="flex items-center gap-2 text-sm text-ok"><CheckCircle2 className="size-4" /> Senha alterada com sucesso.</p>}
      <button disabled={estado.carregando} className="btn btn-primary">{estado.carregando ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Alterar senha</button>
    </form>
  );
}

export function PedidoLGPD() {
  const router = useRouter();
  const [tipo, setTipo] = useState<"exclusao" | "correcao">("correcao");
  const [detalhe, setDetalhe] = useState("");
  const [confirma, setConfirma] = useState(false);
  const [estado, setEstado] = useState<{ carregando?: boolean; erro?: string; ok?: boolean }>({});
  async function enviar() {
    if (tipo === "exclusao" && !confirma) return setEstado({ erro: "Confirme que entende as consequências da exclusão" });
    setEstado({ carregando: true });
    const r = await post("/api/conta/lgpd", { tipo, detalhe });
    if (r.erro) return setEstado({ erro: r.erro });
    setEstado({ ok: true });
    setDetalhe("");
    router.refresh();
  }
  return (
    <div>
      <div className="font-medium text-white">Corrigir ou excluir meus dados</div>
      <div className="mt-3 flex gap-2">
        {(["correcao", "exclusao"] as const).map((t) => (
          <button key={t} type="button" onClick={() => { setTipo(t); setEstado({}); }} className={`btn !py-1.5 !text-xs ${tipo === t ? "bg-white/10 text-white ring-1 ring-white/20" : "btn-ghost"}`}>{t === "correcao" ? "Correção" : "Exclusão da conta"}</button>
        ))}
      </div>
      <textarea className="input mt-3 min-h-20" placeholder={tipo === "correcao" ? "Qual dado está errado e qual o correto?" : "Motivo (opcional)"} value={detalhe} onChange={(e) => setDetalhe(e.target.value)} />
      {tipo === "exclusao" && (
        <label className="mt-2 flex items-start gap-2 text-xs text-ink-400">
          <input type="checkbox" className="mt-0.5 size-4 accent-amber-400" checked={confirma} onChange={(e) => setConfirma(e.target.checked)} />
          Entendo que créditos não usados e o acompanhamento das defesas serão perdidos. Registros exigidos por lei (como pagamentos e notas fiscais) são mantidos pelo prazo legal.
        </label>
      )}
      {estado.erro && <p className="mt-2 text-sm text-bad">{estado.erro}</p>}
      {estado.ok && <p className="mt-2 text-sm text-ok">Pedido registrado. Respondemos em até 15 dias.</p>}
      <button onClick={enviar} disabled={estado.carregando} className="btn btn-ghost mt-3">{estado.carregando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Enviar pedido</button>
    </div>
  );
}
