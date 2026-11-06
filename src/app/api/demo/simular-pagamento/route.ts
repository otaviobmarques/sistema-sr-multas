import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { naoAutorizado, usuarioAtual } from "@/lib/session";
import { gatewayConfigurado } from "@/lib/pagamentos/config";
import { processarEvento } from "@/lib/pagamentos/processar";

/** Só quando o gateway ativo não tem credencial: simula o mesmo processamento de um pagamento confirmado. */
export async function POST(req: Request) {
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  if (gatewayConfigurado()) return NextResponse.json({ erro: "Gateway real ativo: simulação desligada" }, { status: 403 });
  // Em produção, só administradores podem simular (evita créditos grátis)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && u.perfil !== "admin" && process.env.SM_DEMO_PAGAMENTO !== "1")
    return NextResponse.json({ erro: "Pagamento indisponível no momento" }, { status: 403 });
  const { pedido_id } = (await req.json()) as { pedido_id: string };
  const p = db().pedidos.find((x) => x.id === pedido_id && x.usuario_id === u.id);
  if (!p) return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });
  const ev = { id: `simulado:${p.asaas_payment_id}`, tipo: "pago" as const, pagamento_id: p.asaas_payment_id, referencia: p.id, bruto: { simulado: true } };
  const r1 = await processarEvento(ev, "simulado");
  const r2 = await processarEvento(ev, "simulado"); // reenvio proposital: prova de idempotência
  return NextResponse.json({ primeiro: r1, reenvio: r2 });
}
