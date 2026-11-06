import clsx from "clsx";
import type { ResultadoRegra, StatusDefesa } from "@/lib/types";

export { Logo } from "./Marca";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("panel p-5", className)}>{children}</div>;
}

export function CardTitle({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="label">{children}</h3>
      {extra}
    </div>
  );
}

type Tone = "ok" | "warn" | "bad" | "info" | "ia" | "neutral" | "brand";
const tones: Record<Tone, string> = {
  ok: "bg-ok/10 text-ok ring-ok/25",
  warn: "bg-warn/10 text-warn ring-warn/25",
  bad: "bg-bad/10 text-bad ring-bad/25",
  info: "bg-info/10 text-info ring-info/25",
  ia: "bg-ia/10 text-ia ring-ia/25",
  brand: "bg-brand/10 text-brand ring-brand/30",
  neutral: "bg-white/5 text-ink-300 ring-white/10",
};
export function Badge({ tone = "neutral", children, dot }: { tone?: Tone; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset", tones[tone])}>
      {dot && <span className="size-1.5 rounded-full bg-current pulse-dot" />}
      {children}
    </span>
  );
}

export const STATUS: Record<StatusDefesa, { rotulo: string; tone: Tone }> = {
  em_analise: { rotulo: "Em análise", tone: "ia" },
  fora_do_escopo: { rotulo: "Fora do escopo", tone: "info" },
  aguardando_pagamento: { rotulo: "Aguardando pagamento", tone: "brand" },
  aguardando_documentos: { rotulo: "Aguardando seus documentos", tone: "bad" },
  em_preparacao: { rotulo: "Em preparação", tone: "ia" },
  aguardando_validacao: { rotulo: "Aguardando sua validação", tone: "warn" },
  pronta_para_protocolar: { rotulo: "Pronta para protocolar", tone: "brand" },
  protocolada: { rotulo: "Protocolada", tone: "info" },
  deferida: { rotulo: "Deferida", tone: "ok" },
  indeferida: { rotulo: "Indeferida", tone: "bad" },
};
export function StatusBadge({ status }: { status: StatusDefesa }) {
  const s = STATUS[status];
  return <Badge tone={s.tone} dot={status === "em_analise" || status === "em_preparacao"}>{s.rotulo}</Badge>;
}

export const RESULTADO: Record<ResultadoRegra, { rotulo: string; tone: Tone }> = {
  possivel_nulidade: { rotulo: "Possível nulidade", tone: "bad" },
  nao_informado: { rotulo: "Documento não informado", tone: "warn" },
  atencao: { rotulo: "Atenção", tone: "info" },
  ok: { rotulo: "Ok", tone: "ok" },
};

export const FASES: Record<string, string> = { defesa_previa: "Defesa Prévia", jari: "JARI", cetran: "CETRAN", indicacao_condutor: "Indicação de condutor" };

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "ok" | "brand" | "ia" }) {
  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="label">{label}</div>
      <div className={clsx("mt-2 text-3xl font-semibold tracking-tight tabular-nums", tone === "ok" ? "text-ok" : tone === "brand" ? "text-brand" : tone === "ia" ? "text-ia" : "text-white")}>{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-400">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dataBR = (s?: string | null) => (s ? new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("pt-BR") : "—");

export function Bar({ value, tone = "ok" }: { value: number; tone?: "ok" | "brand" | "ia" }) {
  const c = tone === "ok" ? "from-emerald-500 to-ok" : tone === "brand" ? "from-amber-600 to-brand" : "from-cyan-600 to-ia";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/6">
      <div className={clsx("h-full rounded-full bg-gradient-to-r", c)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}
