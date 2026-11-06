import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { audit, db, save, uid } from "@/lib/db";
import { naoAutorizado, usuarioAtual } from "@/lib/session";
import { gatewayConfigurado, lerConfig, metodosAtivos, type Metodo } from "@/lib/pagamentos/config";
import { GATEWAYS } from "@/lib/pagamentos/gateways";

/** Cria o pedido e a cobrança no gateway ativo (Asaas, Mercado Pago ou Stripe), no ambiente configurado. */
export async function POST(req: Request) {
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  if (u.email_confirmado === false) return NextResponse.json({ erro: "Confirme seu e-mail para comprar créditos (enviamos um link na sua caixa de entrada)." }, { status: 403 });
  const d = db();
  const cfg = lerConfig();
  const { plano_id, metodo, parcelas } = (await req.json()) as { plano_id: string; metodo: Metodo; parcelas?: number };
  const plano = d.planos.find((p) => p.id === plano_id);
  if (!plano || !plano.preco || !plano.creditos) return NextResponse.json({ erro: "Plano indisponível para compra direta" }, { status: 400 });
  if (!metodosAtivos().includes(metodo)) return NextResponse.json({ erro: "Forma de pagamento indisponível" }, { status: 400 });
  const nParcelas = metodo === "CREDIT_CARD" ? Math.min(Math.max(1, parcelas ?? 1), plano.id === "avulso" ? 1 : cfg.parcelas_max) : 1;

  const h = await headers();
  const base = process.env.APP_URL && !process.env.APP_URL.includes("localhost") ? process.env.APP_URL : `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const pedidoId = uid("ped");
  const real = gatewayConfigurado();

  try {
    let cob: { id: string; url_pagamento: string | null; pix_payload?: string | null; pix_qr_base64?: string | null; cliente_gateway_id?: string | null };
    if (real) {
      cob = await GATEWAYS[cfg.gateway].criarCobranca(
        {
          pedidoId,
          cliente: u,
          valor: plano.preco,
          metodo,
          parcelas: nParcelas,
          descricao: `Senhor Multas · ${plano.nome}`,
          urlRetorno: `${base}/app/pagamentos?pedido=${pedidoId}`,
          urlWebhook: `${base}/api/webhooks/${cfg.gateway}`,
        },
        cfg.ambiente,
      );
      if (cfg.gateway === "asaas" && cob.cliente_gateway_id) u.asaas_customer_id = cob.cliente_gateway_id;
    } else {
      cob = { id: `sim_${randomUUID().slice(0, 8)}`, url_pagamento: null, pix_payload: metodo === "PIX" ? `00020126580014br.gov.bcb.pix0136simulado-${pedidoId}5204000053039865406${plano.preco.toFixed(2)}5802BR6304SIMU` : null };
    }
    d.pedidos.unshift({
      id: pedidoId,
      usuario_id: u.id,
      plano_id: plano.id,
      valor: plano.preco,
      creditos: plano.creditos,
      metodo,
      parcelas: nParcelas,
      status: "aguardando_pagamento",
      asaas_payment_id: cob.id,
      gateway: real ? cfg.gateway : "simulado",
      ambiente: cfg.ambiente,
      invoice_url: cob.url_pagamento,
      pix_payload: cob.pix_payload ?? null,
      pix_qrcode_base64: cob.pix_qr_base64 ?? null,
      criado_em: new Date().toISOString(),
    });
    audit(u.id, "cobranca_criada", `pedido:${pedidoId}`, `${plano.nome} · ${metodo} · ${real ? `${cfg.gateway}/${cfg.ambiente}` : "simulado"}`);
    await save();
    return NextResponse.json({ pedido: d.pedidos[0], demo: !real, gateway: real ? GATEWAYS[cfg.gateway].nome : "Simulado" });
  } catch (e) {
    return NextResponse.json({ erro: `Não foi possível criar a cobrança: ${(e as Error).message}` }, { status: 502 });
  }
}
