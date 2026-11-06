import { db } from "@/lib/db";
import { Badge, Card, CardTitle, PageHeader, Stat, brl } from "@/components/ui";

export default function Financeiro() {
  const d = db();
  const pagos = d.pedidos.filter((p) => p.status === "pago");
  const pend = d.pedidos.filter((p) => p.status === "aguardando_pagamento");
  return (
    <div>
      <PageHeader title="Financeiro (Asaas)" subtitle={`${process.env.ASAAS_API_KEY ? `Conectado · ${process.env.ASAAS_ENV ?? "sandbox"}` : "Modo demonstração"} · conciliação entre pedidos e cobranças`} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Recebido" value={brl(pagos.reduce((s, p) => s + p.valor, 0))} tone="ok" />
        <Stat label="Aguardando" value={brl(pend.reduce((s, p) => s + p.valor, 0))} />
        <Stat label="Pedidos" value={d.pedidos.length} />
        <Stat label="Eventos de webhook" value={d.eventos_asaas.length} tone="ia" hint={`${d.eventos_asaas.filter((e) => e.processado).length} processados`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Pedidos x cobranças</CardTitle>
          <div className="divide-y divide-white/5 text-sm">
            {d.pedidos.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div><div className="font-mono text-xs text-ink-200">{p.id} ↔ {p.asaas_payment_id}</div><div className="text-xs text-ink-400">{d.usuarios.find((u) => u.id === p.usuario_id)?.nome} · {p.metodo}{p.parceiro_id ? ` · split ${d.parceiros.find((x) => x.id === p.parceiro_id)?.nome}` : ""}</div></div>
                <div className="flex items-center gap-2"><span className="font-mono text-ink-200">{brl(p.valor)}</span><Badge tone={p.status === "pago" ? "ok" : p.status === "aguardando_pagamento" ? "warn" : "bad"}>{p.status.replace("_", " ")}</Badge></div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Log de webhooks (idempotente)</CardTitle>
          {d.eventos_asaas.length === 0 && <p className="text-sm text-ink-400">Nenhum evento recebido ainda. Faça uma compra no portal do cliente e simule o pagamento.</p>}
          <div className="divide-y divide-white/5 font-mono text-xs">
            {d.eventos_asaas.slice(0, 20).map((e) => (
              <div key={e.id} className="flex justify-between gap-3 py-2.5"><span className="text-ink-200">{e.evento}</span><span className="truncate text-ink-400">{e.id}</span><span className={e.processado ? "text-ok" : "text-warn"}>{e.processado ? "ok" : "fila"}</span></div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-ink-400">Endpoint: <span className="font-mono">POST /api/webhooks/asaas</span> · header <span className="font-mono">asaas-access-token</span></p>
        </Card>
      </div>
    </div>
  );
}
