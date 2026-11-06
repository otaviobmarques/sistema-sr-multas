import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { audit, db, save, uid } from "@/lib/db";
import { asaasAtivo, criarCobranca, garantirCliente } from "@/lib/asaas";
import { usuarioAtual } from "@/lib/session";

/** Etapa 6 / cap. 8.2: cria (ou reutiliza) o cliente no Asaas e a cobrança, com split se houver parceiro. */
export async function POST(req: Request) {
  const u = await usuarioAtual();
  const d = db();
  const { plano_id, metodo, parcelas } = (await req.json()) as { plano_id: string; metodo: "PIX" | "CREDIT_CARD" | "BOLETO"; parcelas?: number };
  const plano = d.planos.find((p) => p.id === plano_id);
  if (!plano || !plano.preco || !plano.creditos) return NextResponse.json({ erro: "Plano indisponível para compra direta" }, { status: 400 });
  if (!["PIX", "CREDIT_CARD", "BOLETO"].includes(metodo)) return NextResponse.json({ erro: "Método inválido" }, { status: 400 });
  const nParcelas = metodo === "CREDIT_CARD" ? Math.min(Math.max(1, parcelas ?? 1), plano.id === "avulso" ? 1 : 6) : 1;

  const ref = (await cookies()).get("sm_ref")?.value;
  const parceiro = ref ? d.parceiros.find((p) => p.slug_link === ref && p.status === "ativo") : undefined;

  try {
    const customer = await garantirCliente(u);
    u.asaas_customer_id = customer;
    const pedidoId = uid("ped");
    const cob = await criarCobranca({
      customer,
      valor: plano.preco,
      metodo,
      parcelas: nParcelas,
      descricao: `Senhor Multas · ${plano.nome}`,
      externalReference: pedidoId,
      split: parceiro?.asaas_wallet_id && parceiro.comissao_pct ? [{ walletId: parceiro.asaas_wallet_id, percentualValue: parceiro.comissao_pct }] : undefined,
    });
    d.pedidos.unshift({
      id: pedidoId,
      usuario_id: u.id,
      plano_id: plano.id,
      valor: plano.preco,
      creditos: plano.creditos,
      metodo,
      parcelas: nParcelas,
      parceiro_id: parceiro?.id ?? null,
      status: "aguardando_pagamento",
      asaas_payment_id: cob.id,
      invoice_url: cob.invoiceUrl,
      pix_payload: cob.pixPayload ?? null,
      pix_qrcode_base64: cob.pixQr ?? null,
      criado_em: new Date().toISOString(),
    });
    audit(u.id, "cobranca_criada", `pedido:${pedidoId}`, `${plano.nome} · ${metodo}`);
    save();
    return NextResponse.json({ pedido: d.pedidos[0], demo: !asaasAtivo() });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 502 });
  }
}
