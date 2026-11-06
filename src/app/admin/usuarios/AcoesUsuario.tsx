"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, KeyRound, RefreshCw, X } from "lucide-react";
import { Copiar, gerarSenha } from "./NovoUsuario";

export function AcoesUsuario({ id, nome, saldo, interna, emailAtivo }: { id: string; nome: string; saldo: number; interna: boolean; emailAtivo: boolean }) {
  const router = useRouter();
  const [modal, setModal] = useState<"creditos" | "acesso" | null>(null);
  const [qtd, setQtd] = useState(3);
  const [motivo, setMotivo] = useState("teste");
  const [senha, setSenha] = useState(gerarSenha());
  const [msg, setMsg] = useState<{ ok: boolean; texto: string; senha?: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function chamar(corpo: object) {
    setEnviando(true);
    setMsg(null);
    const r = await fetch(`/api/admin/usuarios/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const j = await r.json();
    setEnviando(false);
    if (!r.ok) return setMsg({ ok: false, texto: j.erro ?? "Falhou" });
    router.refresh();
    return j;
  }
  const fechar = () => { setModal(null); setMsg(null); setSenha(gerarSenha()); };

  return (
    <div className="flex justify-end gap-1.5">
      <button className="btn btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => setModal("creditos")}><Coins className="size-3.5" /> Créditos</button>
      {!interna && <button className="btn btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => setModal("acesso")}><KeyRound className="size-3.5" /> Acesso</button>}
      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 text-left" onClick={fechar}>
          <div className="panel w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{modal === "creditos" ? "Créditos" : "Acesso"}</h2>
              <button onClick={fechar} aria-label="Fechar" className="text-ink-400 hover:text-white"><X className="size-5" /></button>
            </div>
            <p className="mb-4 text-sm text-ink-400">{nome}{modal === "creditos" && ` · saldo atual: ${saldo}`}</p>

            {modal === "creditos" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <input type="number" min={-100} max={100} value={qtd} onChange={(e) => setQtd(Number(e.target.value))} className="input" aria-label="Quantidade" />
                  <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className="input" placeholder="Motivo (ex.: teste, cortesia)" />
                </div>
                <p className="text-[11px] text-ink-400">Use número negativo para retirar créditos ainda não usados. Créditos de cortesia valem 12 meses e não entram na receita.</p>
                <button disabled={enviando || !qtd} className="btn btn-primary w-full" onClick={async () => { const j = await chamar({ acao: "creditos", quantidade: qtd, motivo }); if (j) setMsg({ ok: true, texto: `Pronto. Novo saldo: ${j.saldo} crédito(s).` }); }}>
                  {qtd < 0 ? `Retirar ${-qtd} crédito(s)` : `Adicionar ${qtd} crédito(s)`}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="label block">Nova senha</label>
                <div className="flex gap-2">
                  <input value={senha} onChange={(e) => setSenha(e.target.value)} className="input font-mono" aria-label="Nova senha" />
                  <button type="button" className="btn btn-ghost !px-3" title="Gerar outra" onClick={() => setSenha(gerarSenha())}><RefreshCw className="size-4" /></button>
                </div>
                <button disabled={enviando} className="btn btn-primary w-full" onClick={async () => { const j = await chamar({ acao: "acesso", modo: "senha", senha }); if (j) setMsg({ ok: true, texto: "Senha alterada. As sessões abertas foram encerradas.", senha: j.senha }); }}>Definir esta senha</button>
                {emailAtivo && (
                  <button disabled={enviando} className="btn btn-ghost w-full" onClick={async () => { const j = await chamar({ acao: "acesso", modo: "convite" }); if (j) setMsg({ ok: true, texto: `Convite enviado para ${j.convite} (link válido por 7 dias).` }); }}>Enviar link por e-mail para a pessoa criar a senha</button>
                )}
              </div>
            )}
            {msg && (
              <div className={`mt-4 rounded-lg p-3 text-sm ${msg.ok ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad"}`}>
                {msg.texto}
                {msg.senha && <div className="mt-2 flex items-center justify-between gap-2 font-mono text-white">{msg.senha} <Copiar texto={msg.senha} /></div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
