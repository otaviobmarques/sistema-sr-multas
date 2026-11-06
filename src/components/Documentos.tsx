"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Camera, CheckCircle2, Circle, Eye, FileUp, Loader2, Trash2 } from "lucide-react";
import { prepararArquivo } from "@/lib/foto";

type Tipo = "cnh" | "crlv" | "procuracao" | "prova";
type Arq = { id: string; tipo: Tipo; nome: string; mime: string; tamanho: number; criado_em: string };
const ROT: Record<Tipo, { r: string; a: string }> = {
  cnh: { r: "CNH do condutor", a: "Frente e verso, ou o PDF da CNH Digital" },
  crlv: { r: "CRLV do veículo", a: "O CRLV-e em PDF serve" },
  procuracao: { r: "Procuração do proprietário", a: "A notificação está em nome de outra pessoa" },
  prova: { r: "Outras provas (opcional)", a: "Fotos do local, sinalização, boletim de ocorrência" },
};

export function Documentos({ defesaId, terceiro, onMudar, compacto }: { defesaId: string; terceiro: boolean; onMudar?: (faltam: Tipo[]) => void; compacto?: boolean }) {
  const [arqs, setArqs] = useState<Arq[]>([]);
  const [faltam, setFaltam] = useState<Tipo[]>([]);
  const [enviando, setEnviando] = useState<Tipo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const alvo = useRef<Tipo>("cnh");
  const camRef = useRef<HTMLInputElement>(null);
  const arqRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    const r = await fetch(`/api/defesas/${defesaId}/documentos`).then((r) => r.json()).catch(() => null);
    if (!r?.arquivos) return;
    setArqs(r.arquivos);
    setFaltam(r.faltam);
    onMudar?.(r.faltam);
  }, [defesaId, onMudar]);
  useEffect(() => {
    carregar();
  }, [carregar]);

  async function enviar(f: File) {
    setErro(null);
    setEnviando(alvo.current);
    const fd = new FormData();
    fd.append("tipo", alvo.current);
    fd.append("arquivo", await prepararArquivo(f));
    const r = await fetch(`/api/defesas/${defesaId}/documentos`, { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({ erro: "Falha de conexão" }));
    setEnviando(null);
    if (r.erro) return setErro(r.erro);
    carregar();
  }
  async function excluir(id: string) {
    if (!confirm("Excluir este documento?")) return;
    await fetch(`/api/documentos/${id}`, { method: "DELETE" });
    carregar();
  }
  const tipos: Tipo[] = ["cnh", "crlv", ...(terceiro ? (["procuracao"] as Tipo[]) : []), "prova"];

  return (
    <div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); e.target.value = ""; }} />
      <input ref={arqRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); e.target.value = ""; }} />
      <div className="space-y-2">
        {tipos.map((t) => {
          const meus = arqs.filter((a) => a.tipo === t);
          const ok = meus.length > 0;
          const obrigatorio = t !== "prova";
          return (
            <div key={t} className={clsx("rounded-xl border p-3", ok ? "border-ok/25 bg-ok/5" : obrigatorio ? "border-warn/30" : "border-white/8")}>
              <div className="flex flex-wrap items-center gap-3">
                {ok ? <CheckCircle2 className="size-5 shrink-0 text-ok" /> : <Circle className={clsx("size-5 shrink-0", obrigatorio ? "text-warn" : "text-ink-400")} />}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white">{ROT[t].r}</div>
                  {!compacto && <div className="text-xs text-ink-400">{ROT[t].a}</div>}
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => { alvo.current = t; camRef.current?.click(); }} disabled={!!enviando} className="btn btn-ghost !p-2" title="Tirar foto"><Camera className="size-4" /></button>
                  <button type="button" onClick={() => { alvo.current = t; arqRef.current?.click(); }} disabled={!!enviando} className="btn btn-ghost !px-2.5 !py-2 !text-xs">{enviando === t ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} {ok ? "Adicionar" : "Enviar"}</button>
                </div>
              </div>
              {meus.length > 0 && (
                <div className="mt-2 space-y-1 pl-8">
                  {meus.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-ink-300">{a.nome} · {(a.tamanho / 1024).toFixed(0)} KB</span>
                      <span className="flex shrink-0 gap-1">
                        <a href={`/api/documentos/${a.id}`} target="_blank" className="btn btn-ghost !p-1.5" title="Ver"><Eye className="size-3.5" /></a>
                        <button type="button" onClick={() => excluir(a.id)} className="btn btn-ghost !p-1.5" title="Excluir"><Trash2 className="size-3.5" /></button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {erro && <p className="mt-2 text-sm text-bad">{erro}</p>}
      <p className="mt-2 text-[11px] text-ink-400">{faltam.length ? `Faltam ${faltam.length} documento(s) obrigatório(s).` : "Documentos obrigatórios completos."} Arquivos guardados criptografados; valem para todas as fases desta multa.</p>
    </div>
  );
}
