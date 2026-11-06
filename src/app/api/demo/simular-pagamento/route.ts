import { NextResponse } from "next/server";
import { asaasAtivo } from "@/lib/asaas";
import { db } from "@/lib/db";
import { processarEventoAsaas } from "@/lib/pagamentos";

/** Somente em modo demonstração: dispara o mesmo processamento de um PAYMENT_RECEIVED real. */
export async function POST(req: Request) {
  if (asaasAtivo()) return NextResponse.json({ erro: "Indisponível com Asaas ativo" }, { status: 403 });
  const { pedido_id } = (await req.json()) as { pedido_id: string };
  const p = db().pedidos.find((x) => x.id === pedido_id);
  if (!p) return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });
  const ev = { id: `evt_demo_${p.asaas_payment_id}`, event: "PAYMENT_RECEIVED", payment: { id: p.asaas_payment_id, externalReference: p.id, value: p.valor } };
  const r1 = processarEventoAsaas(ev);
  const r2 = processarEventoAsaas(ev); // reenvio proposital: prova de idempotência
  return NextResponse.json({ primeiro: r1, reenvio: r2 });
}
