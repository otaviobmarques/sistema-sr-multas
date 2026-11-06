import { db } from "@/lib/db";
import { Badge, Card, CardTitle, PageHeader, brl } from "@/components/ui";

export default function Parceiros() {
  const d = db();
  const ilustr: Record<string, number> = { par_1: 38, par_2: 22, par_3: 17, par_4: 41, par_5: 0 };
  const ticket = 69.8;
  return (
    <div>
      <PageHeader title="Parceiros" subtitle="Lojas, despachantes e frotas que revendem o Senhor Multas · comissão automática por split Asaas" />
      <Card className="!p-0 mb-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b border-white/6 text-left">{["Parceiro", "Tipo", "Plano", "Comissão (split)", "Defesas no mês", "Repasse do mês", "Link", "Status"].map((h) => <th key={h} className="label px-5 py-3.5 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {d.parceiros.map((p) => {
                const vendas = (ilustr[p.id] ?? 0) + d.pedidos.filter((x) => x.parceiro_id === p.id && x.status === "pago").length;
                return (
                  <tr key={p.id} className="hover:bg-white/[.02]">
                    <td className="px-5 py-3.5 text-white">{p.nome}{p.white_label && <span className="ml-2"><Badge tone="ia">white-label</Badge></span>}</td>
                    <td className="px-5 py-3.5 text-ink-300">{p.tipo}</td>
                    <td className="px-5 py-3.5 text-ink-300">{p.plano}</td>
                    <td className="px-5 py-3.5 font-mono text-ink-300">{p.comissao_pct ? `${p.comissao_pct}%` : "—"}</td>
                    <td className="px-5 py-3.5 font-mono text-ink-300">{vendas}</td>
                    <td className="px-5 py-3.5 font-mono text-ink-200">{p.comissao_pct ? brl(vendas * ticket * (p.comissao_pct / 100)) : "—"}</td>
                    <td className="px-5 py-3.5"><a href={`/p/${p.slug_link}`} className="font-mono text-xs text-brand hover:underline">/p/{p.slug_link}</a></td>
                    <td className="px-5 py-3.5"><Badge tone={p.status === "ativo" ? "ok" : p.status === "assinatura" ? "info" : "warn"}>{p.status === "ativo" ? "Ativo" : p.status === "assinatura" ? "Assinatura" : "Onboarding"}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardTitle>Link de venda</CardTitle><p className="text-sm text-ink-300">Cada parceiro tem um link próprio. O cliente que entra por ele fica vinculado por 30 dias e a comissão é separada na própria cobrança.</p></Card>
        <Card><CardTitle>Marca</CardTitle><p className="text-sm text-ink-300">White-label opcional: logo e cores da loja no painel do cliente; subconta Asaas vinculada para quem quiser conta própria.</p></Card>
        <Card><CardTitle>Repasse</CardTitle><p className="text-sm text-ink-300">Split na própria cobrança Asaas — sem conciliação manual. Estornos removem créditos não usados e ajustam o repasse.</p></Card>
      </div>
    </div>
  );
}
