"use client";

import { chamarApi } from "@/lib/rede";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Download, FileSignature, History, Loader2, Printer, Send, ShieldCheck, Sparkles, Stamp, Wand2, XCircle } from "lucide-react";
import { Badge, Card, CardTitle, StatusBadge, dataBR, FASES } from "@/components/ui";
import { Peca } from "@/components/Peca";
import { Documentos } from "@/components/Documentos";
import { montarPeca } from "@/lib/peca-formato";
import { Resultado } from "./Resultado";
import type { Defesa, Multa } from "@/lib/types";

const DECL = [
  { k: "data_hora", t: "Data e hora da infração estão corretas" },
  { k: "local", t: "Local está correto" },
  { k: "condutor", t: "Eu era o condutor do veículo (ou sou o proprietário e responsável)" },
  { k: "documentos", t: "Os documentos enviados são verdadeiros" },
];

export function DefesaView({ defesa, multa, cliente }: { defesa: Defesa; multa: Multa; cliente: { nome: string; cpf_cnpj: string } }) {
  const router = useRouter();
  const v = defesa.versoes.at(-1)!;
  const [decl, setDecl] = useState<string[]>(defesa.validacao?.declaracoes ?? []);
  const [ajuste, setAjuste] = useState("");
  const [ajustando, setAjustando] = useState(false);
  const [assinando, setAssinando] = useState(false);
  const [nome, setNome] = useState("");
  const [modalAssinar, setModalAssinar] = useState(false);
  const [protocolo, setProtocolo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const assinada = !!defesa.assinada_em;
  const confirmadas = v.citacoes.filter((c) => c.status_trava === "confirmada");

  async function pedirAjuste() {
    if (!ajuste.trim()) return;
    setAjustando(true);
    const r = await chamarApi(`/api/defesas/${defesa.id}/gerar`, { method: "POST", body: JSON.stringify({ ajuste }) }, 170_000);
    setAjustando(false);
    if (r.erro) return setErro(r.erro);
    setAjuste("");
    setDecl([]);
    router.refresh();
  }
  async function assinar() {
    setErro(null);
    setAssinando(true);
    const r = await chamarApi(`/api/defesas/${defesa.id}/assinar`, { method: "POST", body: JSON.stringify({ declaracoes: decl, nome }) });
    setAssinando(false);
    if (r.erro) return setErro(r.erro);
    setModalAssinar(false);
    router.refresh();
  }
  async function protocolar() {
    const r = await chamarApi(`/api/defesas/${defesa.id}/protocolar`, { method: "POST", body: JSON.stringify({ protocolo }) });
    if (r.erro) return setErro(r.erro);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={defesa.status} />{defesa.protocolo_sm && <a href={`/verificar/${defesa.protocolo_sm}`} target="_blank"><Badge tone="ok">Protocolo {defesa.protocolo_sm}</Badge></a>}{defesa.modo === "conservador" && <Badge tone="info">Modo conservador</Badge>}</div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-[28px]">Sua Defesa Pronta · {multa.orgao} · <span className="font-mono">{multa.placa}</span></h1>
          <p className="mt-1 text-sm text-ink-400">
            {FASES[defesa.fase]} · gerada pela IA em {defesa.tempo_geracao_s ?? 1}s · versão {v.versao} · {assinada ? `assinada em ${dataBR(defesa.assinada_em)}` : "confira os fatos, confirme e assine"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/defesas/${defesa.id}/docx`} className="btn btn-ghost"><Download className="size-4" /> {assinada ? "DOCX (peça + protocolo)" : "DOCX"}</a>
          <a href={`/imprimir/${defesa.id}`} target="_blank" className="btn btn-ghost"><Printer className="size-4" /> {assinada ? "PDF (peça + protocolo)" : "Prévia em PDF"}</a>
          {!assinada && (
            <button onClick={() => setModalAssinar(true)} disabled={decl.length < DECL.length} className="btn btn-ok" title={decl.length < DECL.length ? "Confirme os fatos ao lado" : ""}>
              <FileSignature className="size-4" /> Confirmar e assinar
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <div className="rounded-2xl bg-white p-7 text-[#1b1b1b] shadow-2xl shadow-black/40 md:px-12 md:py-12 [&_.mk-fato]:!bg-amber-200/70 [&_.mk-fato]:!text-[#5a3d00] [&_.mk-fato]:!border-amber-500 [&_.mk-fonte]:!bg-emerald-100 [&_.mk-fonte]:!text-[#0b4f35] [&_.mk-fonte]:!border-emerald-500 [&_sup]:!text-emerald-700">
            <Peca b={montarPeca({ conteudo: v.conteudo, citacoes: v.citacoes, multa, defesa, versao: v, cliente: cliente })} citacoes={v.citacoes} />
          </div>
          <p className="flex flex-wrap gap-4 px-1 text-[11px] text-ink-400">
            <span><span className="mk-fato">Amarelo</span> = fato para você confirmar</span>
            <span><span className="mk-fonte">Verde</span> = fundamento com fonte oficial confirmada</span>
          </p>
        </div>

        <div className="space-y-5">
          {!assinada ? (
            <Card>
              <CardTitle>Confirme os fatos</CardTitle>
              <div className="space-y-2">
                {DECL.map((d) => (
                  <label key={d.k} className={clsx("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition", decl.includes(d.k) ? "border-ok/30 bg-ok/5 text-white" : "border-white/6 text-ink-300 hover:border-white/15")}>
                    <input type="checkbox" className="mt-0.5 size-4 accent-emerald-400" checked={decl.includes(d.k)} onChange={(e) => setDecl(e.target.checked ? [...decl, d.k] : decl.filter((x) => x !== d.k))} />
                    {d.t}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-ink-400">A peça sai em seu nome. Se algum fato estiver errado, peça um ajuste à IA abaixo antes de assinar.</p>
            </Card>
          ) : defesa.status === "pronta_para_protocolar" ? (
            <Card className="!border-brand/30">
              <CardTitle extra={<Stamp className="size-4 text-brand" />}>Protocolo no {multa.orgao}</CardTitle>
              <ol className="space-y-2 text-sm text-ink-300">
                <li>1. Baixe a peça em <b className="text-white">PDF</b> (botão acima).</li>
                <li>2. Acesse o canal de recursos do {multa.orgao} (online ou presencial).</li>
                <li>3. Anexe a peça (com o comprovante de protocolo) e os documentos abaixo.</li>
                <li>4. Informe abaixo o número do protocolo gerado.</li>
              </ol>
              <div className="mt-4"><Documentos defesaId={defesa.id} terceiro={multa.remetente?.situacao === "terceiro"} compacto /></div>
              <div className="mt-4 flex gap-2">
                <input className="input" placeholder="Nº do protocolo no órgão" value={protocolo} onChange={(e) => setProtocolo(e.target.value)} />
                <button onClick={protocolar} className="btn btn-primary">Registrar</button>
              </div>
            </Card>
          ) : (
            <Resultado defesa={defesa} />
          )}

          <Card>
            <CardTitle extra={<ShieldCheck className="size-4 text-ok" />}>Trava automática de citações</CardTitle>
            <div className="space-y-2">
              {v.citacoes.map((c) => {
                const n = confirmadas.findIndex((x) => x.fonte_id === c.fonte_id) + 1;
                return (
                  <div key={c.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/5 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="text-ink-200">{c.status_trava === "confirmada" ? `Fonte ${n} · ` : ""}{c.rotulo}</div>
                      {c.motivo && <div className="mt-0.5 text-xs text-ink-400">{c.motivo}</div>}
                    </div>
                    {c.status_trava === "confirmada" ? <Badge tone="ok">Confirmada</Badge> : <Badge tone="bad">Removido</Badge>}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-ink-400">Citação não confirmada na fonte oficial sai da peça antes de chegar a você.</p>
          </Card>

          {!assinada && (
            <Card>
              <CardTitle extra={<Wand2 className="size-4 text-ia" />}>Pedir ajuste à IA</CardTitle>
              <textarea className="input min-h-24 resize-y" placeholder="Ex.: o local correto é Av. Afonso Pena, 1550; eu não era o condutor…" value={ajuste} onChange={(e) => setAjuste(e.target.value)} />
              <button onClick={pedirAjuste} disabled={ajustando || !ajuste.trim()} className="btn btn-ghost mt-3 w-full">
                {ajustando ? <><Loader2 className="size-4 animate-spin" /> Reescrevendo e reverificando…</> : <><Send className="size-4" /> Enviar ajuste</>}
              </button>
              <p className="mt-2 text-[11px] text-ink-400">Toda nova versão passa de novo pela trava automática.</p>
            </Card>
          )}

          <Card>
            <CardTitle extra={<History className="size-4 text-ink-400" />}>Rastreabilidade</CardTitle>
            <div className="space-y-2 font-mono text-[11px] text-ink-400">
              {defesa.versoes.slice().reverse().map((x) => (
                <div key={x.id} className="rounded-lg border border-white/5 p-2.5">
                  <div className="flex justify-between text-ink-200"><span>v{x.versao}</span><span>{new Date(x.gerada_em).toLocaleString("pt-BR")}</span></div>
                  <div className="mt-1">modelo: {x.modelo_ia} · prompt: {x.versao_prompt}</div>
                  <div>regras: {x.versao_regras} · fontes: {x.citacoes.filter((c) => c.status_trava === "confirmada").map((c) => c.fonte_id).join(", ") || "—"}</div>
                  {x.motivo && <div className="mt-1 text-ia">{x.motivo}</div>}
                </div>
              ))}
            </div>
          </Card>
          {erro && <p className="rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-bad">{erro}</p>}
        </div>
      </div>

      {modalAssinar && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="panel w-full max-w-md bg-ink-900 p-7">
            <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-ok/10 ring-1 ring-ok/30"><FileSignature className="size-5 text-ok" /></div><div><h3 className="font-semibold text-white">Assinatura eletrônica</h3><p className="text-xs text-ink-400">Versão {v.versao} · {confirmadas.length} fonte(s) confirmada(s)</p></div></div>
            <p className="mt-5 text-sm text-ink-300">Declaro que conferi os fatos, que as informações são verdadeiras e que apresento esta peça em meu nome. Digite seu nome completo para assinar:</p>
            <input className="input mt-3" placeholder={cliente.nome} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
            {erro && <p className="mt-2 text-xs text-bad">{erro}</p>}
            <div className="mt-6 flex gap-2">
              <button onClick={() => { setModalAssinar(false); setErro(null); }} className="btn btn-ghost flex-1"><XCircle className="size-4" /> Cancelar</button>
              <button onClick={assinar} disabled={assinando} className="btn btn-ok flex-1">{assinando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Assinar</button>
            </div>
            <p className="mt-4 text-[10px] text-ink-400">Registramos data, hora, IP e a versão assinada. Em produção: provedor de assinatura eletrônica (ex.: DocuSeal).</p>
          </div>
        </div>
      )}
    </div>
  );
}
