import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { dataBR } from "@/lib/peca-formato";
import { Card, PageHeader, Stat, STATUS, StatusBadge } from "@/components/ui";
import type { StatusDefesa } from "@/lib/types";

export const dynamic = "force-dynamic";
const FASE: Record<string, string> = { defesa_previa: "Defesa prévia", jari: "JARI", cetran: "CETRAN", indicacao_condutor: "Indicação de condutor" };

export default async function DefesasAdmin({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; cliente?: string }> }) {
  const eu = await exigirAdmin();
  if (eu.perfil !== "admin") redirect("/admin");
  const { q, status, cliente } = await searchParams;
  const d = db();
  const termo = q?.trim().toLowerCase();
  const linhas = d.defesas
    .map((x) => ({ x, m: d.multas.find((m) => m.id === x.multa_id), u: d.usuarios.find((u) => u.id === x.dono_id) }))
    .filter(({ x }) => !status || x.status === status)
    .filter(({ x }) => !cliente || x.dono_id === cliente)
    .filter(({ x, m, u }) => !termo || `${m?.placa} ${m?.numero_auto} ${m?.orgao} ${u?.nome} ${u?.email} ${u?.cpf_cnpj} ${x.protocolo_sm ?? ""}`.toLowerCase().includes(termo))
    .sort((a, b) => String(b.x.criado_em).localeCompare(String(a.x.criado_em)));
  const geradas = d.defesas.filter((x) => x.versoes.length).length;
  const assinadas = d.defesas.filter((x) => x.assinada_em).length;
  const nomeCliente = cliente ? d.usuarios.find((u) => u.id === cliente)?.nome : null;

  return (
    <div>
      <PageHeader title="Defesas" subtitle={nomeCliente ? `Defesas de ${nomeCliente}` : "Todas as multas enviadas e defesas dos clientes · abrir, conferir e baixar"} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Multas enviadas" value={d.defesas.length} />
        <Stat label="Peças geradas" value={geradas} tone="ia" />
        <Stat label="Assinadas" value={assinadas} tone="ok" />
        <Stat label="Com resultado" value={d.defesas.filter((x) => x.resultado).length} hint={`${d.defesas.filter((x) => x.resultado === "deferida").length} deferida(s)`} />
      </div>
      <form className="mb-4 flex flex-col gap-2 sm:flex-row">
        {cliente && <input type="hidden" name="cliente" value={cliente} />}
        <input name="q" defaultValue={q} className="input" placeholder="Placa, auto, órgão, cliente, CPF ou protocolo SM" />
        <select name="status" defaultValue={status ?? ""} className="input sm:max-w-[240px]">
          <option value="">Todas as situações</option>
          {(Object.keys(STATUS) as StatusDefesa[]).map((s) => <option key={s} value={s}>{STATUS[s].rotulo}</option>)}
        </select>
        <button className="btn btn-ghost">Filtrar</button>
        {(q || status || cliente) && <Link href="/admin/defesas" className="btn btn-ghost">Limpar</Link>}
      </form>
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead><tr className="border-b border-white/6 text-left">{["Cliente", "Multa", "Fase", "Prazo", "Situação", "Protocolo SM", ""].map((h, i) => <th key={i} className="label px-5 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {linhas.map(({ x, m, u }) => (
                <tr key={x.id} className="align-top hover:bg-white/[.02]">
                  <td className="px-5 py-3"><div className="text-white">{u?.nome ?? "—"}</div><div className="text-xs text-ink-400">{u?.email}</div></td>
                  <td className="px-5 py-3"><div className="font-mono text-ink-200">{m?.placa ?? "—"}</div><div className="text-xs text-ink-400">{m?.orgao} · auto {m?.numero_auto || "—"}</div></td>
                  <td className="px-5 py-3 text-ink-300">{FASE[x.fase] ?? x.fase}</td>
                  <td className="px-5 py-3 text-ink-300">{dataBR(m?.prazo)}</td>
                  <td className="px-5 py-3"><StatusBadge status={x.status} /></td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-300">{x.protocolo_sm ?? "—"}</td>
                  <td className="px-5 py-3 text-right"><Link href={`/admin/defesas/${x.id}`} className="btn btn-ghost !px-3 !py-1.5 !text-xs">Abrir</Link></td>
                </tr>
              ))}
              {linhas.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-ink-400">Nenhuma defesa encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
