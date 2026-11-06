import { db, saldo } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";
import { Badge, Card, CardTitle, PageHeader, Stat, brl, dataBR } from "@/components/ui";

const ST = { pago: ["Pago", "ok"], aguardando_pagamento: ["Aguardando", "warn"], vencido: ["Vencido", "bad"], estornado: ["Estornado", "bad"], em_analise: ["Em análise", "info"] } as const;
const MET = { PIX: "Pix", CREDIT_CARD: "Cartão", BOLETO: "Boleto" };

export default async function Pagamentos() {
  const u = await exigirUsuario();
  const d = db();
  const pedidos = d.pedidos.filter((p) => p.usuario_id === u.id);
  const extrato = d.carteira.filter((c) => c.usuario_id === u.id);
  return (
    <div>
      <PageHeader title="Pagamentos" subtitle="Pedidos, cobranças Asaas e extrato de créditos" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Saldo atual" value={saldo(u.id)} tone="ia" hint="crédito(s) disponíveis" />
        <Stat label="Total pago" value={brl(pedidos.filter((p) => p.status === "pago").reduce((s, p) => s + p.valor, 0))} />
        <Stat label="Créditos usados" value={-extrato.filter((c) => c.quantidade < 0 && c.defesa_id).reduce((s, c) => s + c.quantidade, 0)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Pedidos</CardTitle>
          <div className="divide-y divide-white/5 text-sm">
            {pedidos.map((p) => {
              const [rot, tone] = ST[p.status];
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="text-white">{d.planos.find((x) => x.id === p.plano_id)?.nome} · {brl(p.valor)}</div>
                    <div className="text-xs text-ink-400">{dataBR(p.criado_em)} · {MET[p.metodo]}{p.parcelas && p.parcelas > 1 ? ` ${p.parcelas}x` : ""} · <span className="font-mono">{p.asaas_payment_id}</span></div>
                  </div>
                  <Badge tone={tone}>{rot}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardTitle>Extrato de créditos</CardTitle>
          <div className="divide-y divide-white/5 text-sm">
            {extrato.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="text-white">{c.descricao}</div>
                  <div className="text-xs text-ink-400">{dataBR(c.data)}{c.validade ? ` · válido até ${dataBR(c.validade)}` : ""}</div>
                </div>
                <span className={`font-mono font-semibold ${c.quantidade > 0 ? "text-ok" : "text-ink-300"}`}>{c.quantidade > 0 ? "+" : ""}{c.quantidade}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
