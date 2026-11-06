import { audit, db, save, uid } from "../db";
import type { EventoNormalizado } from "./gateways";

/**
 * Processa um evento de pagamento (de qualquer gateway) com IDEMPOTÊNCIA:
 * o mesmo evento nunca libera créditos duas vezes.
 */
export async function processarEvento(ev: EventoNormalizado, gateway: string): Promise<{ ok: true; duplicado?: boolean; acao?: string }> {
  const d = db();
  if (d.eventos_asaas.some((e) => e.id === ev.id)) return { ok: true, duplicado: true };
  d.eventos_asaas.unshift({ id: ev.id, evento: `${gateway}:${ev.tipo}`, payload: ev.bruto, recebido_em: new Date().toISOString(), processado: false });

  const pedido = d.pedidos.find(
    (p) => (ev.pagamento_id && (p.asaas_payment_id === ev.pagamento_id || p.gateway_aux === ev.pagamento_id)) || (ev.referencia && p.id === ev.referencia),
  );
  let acao = "ignorado";
  if (pedido) {
    if (ev.aux && !pedido.gateway_aux) pedido.gateway_aux = ev.aux;
    switch (ev.tipo) {
      case "criado":
        acao = "aguardando pagamento";
        break;
      case "pago":
        if (pedido.status !== "pago") {
          pedido.status = "pago";
          pedido.pago_em = new Date().toISOString();
          const validade = new Date();
          validade.setMonth(validade.getMonth() + 12);
          const plano = d.planos.find((p) => p.id === pedido.plano_id);
          d.carteira.unshift({ id: uid("cart"), usuario_id: pedido.usuario_id, pedido_id: pedido.id, quantidade: pedido.creditos, descricao: `Compra · ${plano?.nome ?? pedido.plano_id}`, validade: validade.toISOString(), data: new Date().toISOString() });
          audit(pedido.usuario_id, "pagamento_confirmado", `pedido:${pedido.id}`, `${gateway} · ${pedido.creditos} crédito(s) liberado(s)`);
          acao = "créditos liberados";
        } else acao = "já estava pago";
        break;
      case "vencido":
        if (pedido.status === "aguardando_pagamento") pedido.status = "vencido";
        acao = "lembrete ao cliente";
        break;
      case "estornado":
      case "chargeback": {
        if (pedido.status === "estornado") break;
        const eraPago = pedido.status === "pago" || pedido.status === "em_analise";
        pedido.status = ev.tipo === "estornado" ? "estornado" : "em_analise";
        if (eraPago) {
          // remove apenas créditos ainda não usados
          const usados = d.carteira.filter((c) => c.usuario_id === pedido.usuario_id && c.quantidade < 0 && c.defesa_id).length;
          const comprados = d.carteira.filter((c) => c.usuario_id === pedido.usuario_id && c.quantidade > 0).reduce((s, c) => s + c.quantidade, 0);
          const jaRemovidos = -d.carteira.filter((c) => c.pedido_id === pedido.id && c.quantidade < 0).reduce((s, c) => s + c.quantidade, 0);
          const remover = Math.max(0, Math.min(pedido.creditos - jaRemovidos, comprados - usados - jaRemovidos));
          if (remover) d.carteira.unshift({ id: uid("cart"), usuario_id: pedido.usuario_id, pedido_id: pedido.id, quantidade: -remover, descricao: `${ev.tipo === "estornado" ? "Estorno" : "Contestação"} · pedido ${pedido.id}`, data: new Date().toISOString() });
          audit(pedido.usuario_id, ev.tipo, `pedido:${pedido.id}`, `${remover} crédito(s) removido(s)`);
        }
        acao = "créditos não usados removidos";
        break;
      }
    }
  }
  d.eventos_asaas[0].processado = true;
  await save();
  return { ok: true, acao };
}
