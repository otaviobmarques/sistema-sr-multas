import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { usuarioAtual } from "@/lib/session";
import { gravidade } from "@/lib/valores";
import { Card, PageHeader, Stat, StatusBadge, brl, dataBR, FASES } from "@/components/ui";
import type { Defesa, Multa } from "@/lib/types";

function proximaEtapa(df: Defesa, m: Multa) {
  switch (df.status) {
    case "em_analise": return `Gerar defesa até ${dataBR(m.prazo)}`;
    case "aguardando_validacao": return `Confirme até ${dataBR(m.prazo)}`;
    case "aguardando_documentos": return `Envie ${df.documentos_pendentes.join(", ")}`;
    case "aguardando_pagamento": return "Escolha um plano";
    case "pronta_para_protocolar": return `Protocole até ${dataBR(m.prazo)}`;
    case "protocolada": return "Aguardando julgamento";
    case "deferida": return "Multa cancelada";
    case "indeferida": return "Abrir próxima fase";
    case "fora_do_escopo": return "Análise especial";
    default: return "—";
  }
}

export default async function MinhasDefesas() {
  const u = await usuarioAtual();
  const d = db();
  const rows = d.defesas.filter((x) => x.dono_id === u.id).map((df) => ({ df, m: d.multas.find((m) => m.id === df.multa_id)! }));
  const deferidas = rows.filter((r) => r.df.status === "deferida");
  return (
    <div>
      <PageHeader title="Minhas defesas" subtitle="Acompanhe cada multa do envio ao julgamento" actions={<Link href="/app/nova" className="btn btn-primary"><Plus className="size-4" /> Enviar multa</Link>} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Em andamento" value={rows.filter((r) => !["deferida", "indeferida"].includes(r.df.status)).length} />
        <Stat label="Deferidas" value={deferidas.length} tone="ok" />
        <Stat label="Pontos evitados" value={deferidas.reduce((s, r) => s + gravidade(r.m).pontos, 0)} />
        <Stat label="Economia acumulada" value={brl(deferidas.reduce((s, r) => s + gravidade(r.m).valor, 0))} tone="brand" />
      </div>
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-white/6 text-left">
                {["Placa", "Órgão", "Infração", "Fase", "Status", "Prazo / próxima etapa"].map((h) => <th key={h} className="label px-5 py-3.5 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map(({ df, m }) => (
                <tr key={df.id} className="transition hover:bg-white/[.02]">
                  <td className="px-5 py-4"><Link href={df.versoes.length || df.status === "fora_do_escopo" ? `/app/defesas/${df.id}` : `/app/nova?defesa=${df.id}`} className="font-mono font-semibold text-white hover:text-brand">{m.placa}</Link></td>
                  <td className="px-5 py-4 text-ink-300">{m.orgao}</td>
                  <td className="px-5 py-4 text-ink-300">{m.descricao}</td>
                  <td className="px-5 py-4 text-ink-300">{FASES[m.fase]}</td>
                  <td className="px-5 py-4"><StatusBadge status={df.status} /></td>
                  <td className="px-5 py-4 text-ink-400">{proximaEtapa(df, m)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
