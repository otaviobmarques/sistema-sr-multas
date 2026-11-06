"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, Camera, CheckCircle2, FileUp, Loader2, Scale, ScanText, Search, ShieldCheck, Sparkles, PenLine, Info, UserCheck, UserX, RotateCcw } from "lucide-react";
import { prepararArquivo } from "@/lib/foto";
import { chamarApi } from "@/lib/rede";
import { SenhorCoruja, SenhorPlaca } from "@/components/Marca";
import { Documentos } from "@/components/Documentos";
import { Badge, Bar, Card, CardTitle, RESULTADO, StatusBadge, brl } from "@/components/ui";
import type { Defesa, Multa } from "@/lib/types";

type G = { nivel: string; valor: number; pontos: number } | null;

const CAMPOS: { k: keyof Multa; rotulo: string; tipo?: "text" | "date" | "datetime-local" | "number" | "select"; opcoes?: [string, string][]; full?: boolean }[] = [
  { k: "proprietario_nome", rotulo: "Proprietário (na notificação)", full: true },
  { k: "placa", rotulo: "Placa" },
  { k: "numero_auto", rotulo: "Nº do auto" },
  { k: "orgao", rotulo: "Órgão autuador" },
  { k: "esfera", rotulo: "Esfera", tipo: "select", opcoes: [["municipal", "Municipal"], ["estadual", "Estadual"], ["federal", "Federal"]] },
  { k: "tipo", rotulo: "Tipo", tipo: "select", opcoes: [["velocidade", "Velocidade"], ["estacionamento", "Estacionamento"], ["avanco_sinal", "Avanço de sinal"], ["celular", "Celular"], ["cinto", "Cinto"], ["ultrapassagem", "Ultrapassagem"], ["suspensao", "Suspensão da CNH"], ["cassacao", "Cassação da CNH"], ["outra", "Outra"]] },
  { k: "fase", rotulo: "Fase", tipo: "select", opcoes: [["defesa_previa", "Defesa Prévia"], ["jari", "JARI"], ["cetran", "CETRAN"]] },
  { k: "enquadramento", rotulo: "Enquadramento", full: true },
  { k: "local", rotulo: "Local", full: true },
  { k: "data_infracao", rotulo: "Data da infração", tipo: "datetime-local" },
  { k: "data_expedicao", rotulo: "Expedição da notificação", tipo: "date" },
  { k: "prazo", rotulo: "Prazo da fase", tipo: "date" },
  { k: "agente_ou_equipamento", rotulo: "Agente / equipamento" },
  { k: "marca_especie", rotulo: "Marca / espécie" },
  { k: "equipamento_afericao", rotulo: "Última aferição do equipamento", tipo: "date" },
  { k: "imagem_placa", rotulo: "Notificação traz foto com a placa?", tipo: "select", opcoes: [["", "Não informado"], ["true", "Sim"], ["false", "Não"]] },
  { k: "velocidade_medida", rotulo: "Velocidade considerada (km/h)", tipo: "number" },
  { k: "velocidade_limite", rotulo: "Velocidade máxima (km/h)", tipo: "number" },
];

function paraInput(v: unknown, tipo?: string) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (tipo === "date") return s.slice(0, 10);
  if (tipo === "datetime-local") return s.slice(0, 16);
  return s;
}

const ETAPAS_GERACAO = [
  { i: Search, t: "Agente pesquisador", d: "buscando fundamentos na base de leis" },
  { i: PenLine, t: "Agente redator", d: "montando a peça pelo modelo da fase e do órgão" },
  { i: ShieldCheck, t: "Trava automática", d: "conferindo cada citação na fonte oficial" },
];

/** Barra de progresso estimada + contador; avisa quando passa do tempo normal. */
function Progresso({ segundos, estimativa, texto }: { segundos: number; estimativa: number; texto: string }) {
  const pct = Math.min(95, Math.round(100 * (1 - Math.exp(-segundos / (estimativa * 0.75)))));
  const demorando = segundos > estimativa * 2.5;
  return (
    <div className="mx-auto mt-5 w-full max-w-xs text-left">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-ia to-brand transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-400"><span>{demorando ? "Está demorando mais que o normal, aguarde mais um pouco…" : texto}</span><span className="ml-2 font-mono">{segundos}s</span></div>
    </div>
  );
}

export function NovaDefesa({ defesa, multa, saldo, gravidade }: { defesa: Defesa | null; multa: Multa | null; saldo: number; gravidade: G }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(CAMPOS.map((c) => [c.k, paraInput(multa?.[c.k], c.tipo)])));
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [semCredito, setSemCredito] = useState(false);
  const [faltamDocs, setFaltamDocs] = useState<string[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [refazer, setRefazer] = useState<{ problema: string; orientacao: string } | null>(null);
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    if (!enviando && !gerando) return setSegundos(0);
    setSegundos(0);
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [enviando, gerando]);

  useEffect(() => {
    if (!gerando) return;
    const t = setInterval(() => setEtapa((e) => Math.min(e + 1, ETAPAS_GERACAO.length - 1)), 1100);
    return () => clearInterval(t);
  }, [gerando]);

  async function enviar(original: File) {
    setErro(null);
    setRefazer(null);
    setEnviando(true);
    const file = await prepararArquivo(original);
    if (file.size > 4_200_000) {
      setErro(file.type === "application/pdf" ? "Este PDF passa de 4 MB. Tire uma foto da notificação (o app reduz o tamanho automaticamente) ou envie um PDF menor." : "Arquivo grande demais. Tire a foto novamente pelo botão Tirar foto.");
      setEnviando(false);
      return;
    }
    const fd = new FormData();
    fd.append("arquivo", file);
    const r = await chamarApi<{ defesa_id?: string; orientacao?: string; problema?: string }>("/api/multas", { method: "POST", body: fd }, 75_000);
    if (r.orientacao) {
      setRefazer({ problema: r.problema ?? "", orientacao: r.orientacao });
      setEnviando(false);
      return;
    }
    if (r.erro) {
      setErro(r.erro);
      setEnviando(false);
      return;
    }
    router.replace(`/app/nova?defesa=${r.defesa_id}`);
    router.refresh();
  }

  async function salvar() {
    if (!defesa) return;
    setSalvando(true);
    const body: Record<string, unknown> = {};
    for (const c of CAMPOS) {
      const v = form[c.k];
      body[c.k] = c.tipo === "number" ? (v ? Number(v) : null) : c.tipo === "datetime-local" && v ? new Date(v).toISOString() : v;
    }
    await fetch(`/api/defesas/${defesa.id}/multa`, { method: "PATCH", body: JSON.stringify(body) });
    setSujo(false);
    setSalvando(false);
    router.refresh();
  }

  async function gerar() {
    if (!defesa) return;
    if (sujo) await salvar();
    setGerando(true);
    setEtapa(0);
    const r = await chamarApi<{ precisaDocumentos?: boolean; faltam?: string[]; precisaPagar?: boolean }>(`/api/defesas/${defesa.id}/gerar`, { method: "POST", body: "{}" }, 170_000);
    if (r.precisaDocumentos) {
      setGerando(false);
      setFaltamDocs(r.faltam ?? []);
      setErro("Envie os documentos obrigatórios antes de gerar a defesa.");
      return;
    }
    if (r.precisaPagar) {
      setGerando(false);
      setSemCredito(true);
      return;
    }
    if (r.erro) {
      setGerando(false);
      setErro(r.erro);
      return;
    }
    router.push(`/app/defesas/${defesa.id}`);
    router.refresh();
  }

  // ---------------------------------------------------------------- Upload
  if (!defesa || !multa) {
    return (
      <div className="mx-auto max-w-3xl">
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) enviar(f); }}
          className={clsx("panel relative flex cursor-pointer flex-col items-center justify-center overflow-hidden border-dashed px-6 py-20 text-center transition", drag ? "!border-brand bg-brand/5" : "hover:!border-white/20")}
        >
          <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} disabled={enviando} />
          {enviando && <div className="scan-line" />}
          <div className={clsx("grid size-36 place-items-center rounded-full bg-[#f5f3ef] ring-4 transition", enviando ? "ring-ia/40" : "ring-brand/25")}>
            <SenhorPlaca className={clsx("h-32 translate-y-2", enviando && "animate-pulse")} />
          </div>
          <h2 className="mt-6 text-lg font-semibold text-white">{enviando ? "Lendo sua notificação…" : "Arraste a notificação aqui"}</h2>
          <p className="mt-2 max-w-sm text-sm text-ink-400">
            {enviando ? "Extraindo placa, auto, órgão, enquadramento, fase e prazo e rodando a auditoria." : "Tire uma foto da notificação com o celular ou envie o PDF. A IA reconhece a foto, confere a qualidade e identifica o titular. A análise é gratuita."}
          </p>
          {enviando && <Progresso segundos={segundos} estimativa={15} texto="Leva em média 10 a 20 segundos." />}
          {!enviando && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={(e) => { e.preventDefault(); cameraRef.current?.click(); }} className="btn btn-primary"><Camera className="size-4" /> Tirar foto</button>
              <span className="btn btn-ghost"><FileUp className="size-4" /> Selecionar arquivo</span>
            </div>
          )}
        </label>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); e.target.value = ""; }} />
        {refazer && (
          <div className="rise mt-4 flex gap-3 rounded-xl border border-warn/30 bg-warn/5 p-4">
            <Camera className="size-5 shrink-0 text-warn" />
            <div className="flex-1">
              <div className="font-semibold text-white">Vamos tirar outra foto?</div>
              <p className="mt-1 text-sm text-ink-300">{refazer.orientacao}</p>
              <p className="mt-1 text-xs text-ink-400">Dica: notificação inteira no quadro, em superfície plana, com boa luz e sem flash. Nada foi cobrado.</p>
            </div>
            <button onClick={() => cameraRef.current?.click()} className="btn btn-ghost self-start"><RotateCcw className="size-4" /> Refazer</button>
          </div>
        )}
        {erro && <p className="mt-4 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-bad">{erro}</p>}
        <div className="mt-6 grid gap-3 text-xs text-ink-400 sm:grid-cols-3">
          {[["Dados tratados como dados", "Instruções escondidas no documento são ignoradas e registradas."], ["Criptografado", "Arquivo em armazenamento privado e criptografado."], ["Sem treino", "Contrato com o fornecedor de IA sem uso de dados para treinamento."]].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-white/6 p-3"><div className="font-medium text-ink-200">{t}</div><div className="mt-1">{d}</div></div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- Análise
  const pontos = defesa.checklist.filter((c) => c.resultado === "possivel_nulidade" || c.resultado === "nao_informado").length;
  const est = defesa.estimativa;
  const fora = defesa.status === "fora_do_escopo";
  const jaGerada = defesa.versoes.length > 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
      <Card>
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-dashed border-white/10 bg-ink-950/40 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-ink-300"><ScanText className="size-4 text-ia" /> {multa.arquivo_nome ?? "notificação"} · enviado</span>
          <StatusBadge status={defesa.status} />
        </div>
        {multa.remetente && (
          <div className={clsx("mb-5 flex gap-3 rounded-xl border p-3.5 text-sm", multa.remetente.situacao === "titular" ? "border-ok/25 bg-ok/5" : multa.remetente.situacao === "terceiro" ? "border-warn/30 bg-warn/5" : "border-white/8 bg-white/[.02]")}>
            {multa.remetente.situacao === "titular" ? <UserCheck className="size-5 shrink-0 text-ok" /> : <UserX className={clsx("size-5 shrink-0", multa.remetente.situacao === "terceiro" ? "text-warn" : "text-ink-400")} />}
            <div>
              <div className="font-medium text-white">{multa.remetente.situacao === "titular" ? "Você é o titular desta notificação" : multa.remetente.situacao === "terceiro" ? "Notificação em nome de outra pessoa" : "Titular não identificado"}</div>
              <div className="mt-0.5 text-xs text-ink-400">{multa.remetente.detalhe}</div>
            </div>
          </div>
        )}
        <CardTitle extra={<span className="text-[11px] text-ink-400">campos em <span className="text-warn">amarelo</span>: confiança baixa — confira</span>}>Dados extraídos (confira)</CardTitle>
        <div className="grid gap-3.5 sm:grid-cols-2">
          {CAMPOS.filter((c) => !(multa.tipo !== "velocidade" && ["velocidade_medida", "velocidade_limite", "equipamento_afericao", "imagem_placa"].includes(c.k))).map((c) => {
            const conf = multa.confianca[c.k];
            const baixa = conf !== undefined && conf < 0.85;
            return (
              <div key={c.k} className={c.full ? "sm:col-span-2" : ""}>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="label">{c.rotulo}</label>
                  {conf !== undefined && <span className={clsx("font-mono text-[10px]", baixa ? "text-warn" : "text-ink-400")}>{conf >= 1 ? "confirmado" : `${Math.round(conf * 100)}%`}</span>}
                </div>
                {c.tipo === "select" ? (
                  <select className={clsx("input", baixa && "!border-warn/50")} value={form[c.k]} onChange={(e) => { setForm({ ...form, [c.k]: e.target.value }); setSujo(true); }}>
                    {c.opcoes!.map(([v, l]) => <option key={v} value={v} className="bg-ink-900">{l}</option>)}
                  </select>
                ) : (
                  <input type={c.tipo ?? "text"} className={clsx("input", baixa && "!border-warn/50")} value={form[c.k]} onChange={(e) => { setForm({ ...form, [c.k]: e.target.value }); setSujo(true); }} />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-400">Ao confirmar, a auditoria roda novamente com os dados corrigidos.</p>
          <button onClick={salvar} disabled={!sujo || salvando} className="btn btn-ghost">
            {salvando ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Confirmar dados
          </button>
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardTitle extra={<Badge tone="neutral">motor de regras · determinístico</Badge>}>Auditoria automática</CardTitle>
          <div className="divide-y divide-white/5">
            {defesa.checklist.map((c) => (
              <div key={c.regra} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <div className="text-sm text-white">{c.titulo}</div>
                  <div className="mt-0.5 text-xs text-ink-400">{c.detalhe}</div>
                </div>
                <Badge tone={RESULTADO[c.resultado].tone}>{RESULTADO[c.resultado].rotulo}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/6 bg-ink-950/40 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="label">Estimativa de êxito</span>
              <span className="text-ink-400">{est.base}</span>
            </div>
            {est.faixa === "indisponivel" ? (
              <p className="mt-2 text-sm text-ink-300">Sem amostra mínima de casos semelhantes — a estimativa não é exibida.</p>
            ) : (
              <>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={clsx("text-2xl font-semibold capitalize", est.faixa === "alta" ? "text-ok" : est.faixa === "moderada" ? "text-warn" : "text-bad")}>{est.faixa}</span>
                  <span className="text-xs text-ink-400">histórico do órgão para os argumentos encontrados</span>
                </div>
                <div className="mt-2"><Bar value={est.percentual ?? 0} tone={est.faixa === "alta" ? "ok" : "brand"} /></div>
              </>
            )}
            <p className="mt-3 flex gap-1.5 text-[11px] text-ink-400"><Info className="mt-px size-3.5 shrink-0" /> Estimativa por faixa, não é promessa de resultado. Quem decide é o órgão julgador.</p>
          </div>
        </Card>

        {gravidade && !fora && (
          <Card>
            <div id="comparar" />
            <CardTitle extra={<Scale className="size-4 text-ink-400" />}>Recorrer x pagar com desconto</CardTitle>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/6 p-4">
                <div className="label">Pagar com desconto</div>
                <div className="mt-2 text-xl font-semibold text-white">{brl(gravidade.valor * 0.6)} <span className="text-xs font-normal text-ink-400">a {brl(gravidade.valor * 0.8)}</span></div>
                <div className="mt-1 text-xs text-ink-400">Encerra o caso · mantém <b className="text-ink-200">{gravidade.pontos} pontos</b> na CNH</div>
              </div>
              <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
                <div className="label text-brand">Recorrer</div>
                <div className="mt-2 text-xl font-semibold text-white">1 crédito</div>
                <div className="mt-1 text-xs text-ink-400">Se deferida: cancela {brl(gravidade.valor)} e os {gravidade.pontos} pontos · todas as fases inclusas</div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-ink-400">Infração {gravidade.nivel.replace("gravissima", "gravíssima").replace("media", "média")}. Desconto de 20% (ou 40% via SNE, quando o órgão aderir) — confira na sua notificação.</p>
          </Card>
        )}

        {fora ? (
          <Card className="!border-info/30">
            <div className="flex gap-3">
              <AlertTriangle className="size-5 shrink-0 text-info" />
              <div>
                <div className="font-semibold text-white">Caso fora do escopo automatizado</div>
                <p className="mt-1 text-sm text-ink-400">Processos de suspensão/cassação da CNH ou documentos ilegíveis ficam sinalizados para análise especial. Nenhum crédito é consumido. Se algum campo foi lido errado, corrija ao lado e confirme.</p>
              </div>
            </div>
          </Card>
        ) : jaGerada ? (
          <Link href={`/app/defesas/${defesa.id}`} className="btn btn-primary w-full !py-3.5">Abrir Defesa Pronta</Link>
        ) : (
          <div className="space-y-6">
          <Card>
            <CardTitle extra={faltamDocs && faltamDocs.length === 0 ? <Badge tone="ok">completos</Badge> : <Badge tone="warn">obrigatórios</Badge>}>Documentos</CardTitle>
            <Documentos defesaId={defesa.id} terceiro={multa.remetente?.situacao === "terceiro"} onMudar={(f) => setFaltamDocs(f)} />
          </Card>
          <div className="panel p-5">
            {gerando ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-[#f5f3ef] p-2 pr-4">
                  <SenhorCoruja className="h-14 shrink-0 animate-pulse" />
                  <span className="text-sm font-semibold text-[#13294b]">O Senhor Coruja está preparando e conferindo a sua defesa…</span>
                </div>
                <Progresso segundos={segundos} estimativa={30} texto="Leva em média 20 a 40 segundos. Não feche esta tela." />
                {ETAPAS_GERACAO.map(({ i: I, t, d }, n) => (
                  <div key={t} className={clsx("flex items-center gap-3 rounded-xl border p-3 transition", n <= etapa ? "border-ia/30 bg-ia/5" : "border-white/5 opacity-40")}>
                    {n < etapa ? <CheckCircle2 className="size-5 text-ok" /> : n === etapa ? <Loader2 className="size-5 animate-spin text-ia" /> : <I className="size-5 text-ink-400" />}
                    <div><div className="text-sm font-medium text-white">{t}</div><div className="text-xs text-ink-400">{d}</div></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between text-sm">
                  <span className="text-ink-300"><Sparkles className="mr-1.5 inline size-4 text-brand" />{pontos} ponto(s) de atenção encontrados</span>
                  <span className="text-xs text-ink-400">saldo: {saldo} crédito(s)</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button onClick={gerar} disabled={!!faltamDocs?.length} title={faltamDocs?.length ? "Envie os documentos obrigatórios" : ""} className="btn btn-primary flex-1 !py-3">Gerar Defesa (1 crédito)</button>
                  <a href="#comparar" className="btn btn-ghost !py-3">Comparar com pagar com desconto</a>
                </div>
                <p className="mt-3 text-[11px] text-ink-400">{faltamDocs?.length ? "Envie os documentos obrigatórios acima para liberar a geração. " : ""}O crédito só é consumido agora, ao confirmar a geração. Cobre todas as fases desta multa.</p>
              </>
            )}
            {erro && <p className="mt-3 text-sm text-bad">{erro}</p>}
          </div>
          </div>
        )}
      </div>

      {semCredito && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="panel w-full max-w-md bg-ink-900 p-7 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand/10 ring-1 ring-brand/30"><Sparkles className="size-6 text-brand" /></div>
            <h3 className="mt-4 text-lg font-semibold text-white">Você está sem créditos</h3>
            <p className="mt-2 text-sm text-ink-400">Sua análise fica salva. Escolha um plano e, assim que o pagamento for confirmado, a defesa é gerada.</p>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setSemCredito(false)} className="btn btn-ghost flex-1">Depois</button>
              <Link href={`/app/planos?defesa=${defesa.id}`} className="btn btn-primary flex-1">Ver planos</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
