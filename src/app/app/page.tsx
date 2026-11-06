import Link from "next/link";
import { ArrowRight, Bot, CalendarClock, FileText, Upload, Sparkles } from "lucide-react";
import { db, saldo } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";
import { gravidade } from "@/lib/valores";
import { Card, CardTitle, Stat, StatusBadge, brl, dataBR, FASES } from "@/components/ui";

export default async function Inicio() {
  const u = await exigirUsuario();
  const d = db();
  const defs = d.defesas.filter((x) => x.dono_id === u.id).map((df) => ({ df, m: d.multas.find((m) => m.id === df.multa_id)! }));
  const deferidas = defs.filter((x) => x.df.status === "deferida");
  const andamento = defs.filter((x) => !["deferida", "indeferida"].includes(x.df.status));
  const pontos = deferidas.reduce((s, x) => s + gravidade(x.m).pontos, 0);
  const economia = deferidas.reduce((s, x) => s + gravidade(x.m).valor, 0);
  const acoes = andamento
    .filter((x) => ["aguardando_validacao", "aguardando_documentos", "em_analise", "pronta_para_protocolar", "aguardando_pagamento"].includes(x.df.status))
    .sort((a, b) => a.m.prazo.localeCompare(b.m.prazo));

  return (
    <div className="space-y-6">
      <div className="panel relative overflow-hidden p-7 md:p-9">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-ia"><Sparkles className="size-3.5" /> Seu painel</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Olá, {u.nome.split(" ")[0]}.</h1>
            <p className="mt-1 text-ink-400">
              {acoes.length ? `Você tem ${acoes.length} defesa(s) aguardando uma ação sua.` : "Tudo em dia. Recebeu uma nova multa?"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/app/nova" className="btn btn-primary !py-3"><Upload className="size-4" /> Enviar multa</Link>
            <Link href="/app/assistente" className="btn btn-ghost !py-3"><Bot className="size-4" /> Sr. Multas</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Em andamento" value={andamento.length} />
        <Stat label="Deferidas" value={deferidas.length} tone="ok" />
        <Stat label="Pontos evitados na CNH" value={pontos} />
        <Stat label="Economia acumulada" value={brl(economia)} tone="brand" hint={`Saldo: ${saldo(u.id)} crédito(s)`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardTitle extra={<Link href="/app/defesas" className="text-xs text-brand hover:underline">Ver todas</Link>}>Próximas ações</CardTitle>
          <div className="divide-y divide-white/5">
            {acoes.length === 0 && <p className="py-6 text-sm text-ink-400">Nenhuma ação pendente.</p>}
            {acoes.map(({ df, m }) => (
              <Link key={df.id} href={df.versoes.length ? `/app/defesas/${df.id}` : `/app/nova?defesa=${df.id}`} className="group flex items-center gap-4 py-3.5">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.04] ring-1 ring-white/8"><FileText className="size-4 text-ink-300" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-white">{m.placa}</span>
                    <span className="text-xs text-ink-400">{m.orgao} · {m.descricao} · {FASES[m.fase]}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-400"><CalendarClock className="size-3.5" /> prazo {dataBR(m.prazo)}</div>
                </div>
                <StatusBadge status={df.status} />
                <ArrowRight className="size-4 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-white" />
              </Link>
            ))}
          </div>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -bottom-20 -right-10 size-60 rounded-full bg-ia/15 blur-3xl" />
          <CardTitle>Como funciona</CardTitle>
          <ol className="relative space-y-4 text-sm">
            {[
              ["Envie a notificação", "foto ou PDF — a análise é gratuita"],
              ["Veja a auditoria", "nulidades, estimativa e comparação com desconto"],
              ["Gere a Defesa Pronta", "consome 1 crédito, cobre todas as fases"],
              ["Confira e assine", "você valida os fatos antes de assinar"],
            ].map(([t, s], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand ring-1 ring-brand/30">{i + 1}</span>
                <div><div className="font-medium text-white">{t}</div><div className="text-xs text-ink-400">{s}</div></div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
