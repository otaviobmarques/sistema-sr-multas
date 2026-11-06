import { audit, db, save, uid } from "./db";

type EventoPayload = { id?: string; event: string; payment?: { id: string; externalReference?: string; value?: number } };

/**
 * Processa um evento de webhook do Asaas com IDEMPOTÊNCIA:
 * o mesmo evento (id) nunca libera créditos duas vezes.
 */
export async function processarEventoAsaas(ev: EventoPayload): Promise<{ ok: true; duplicado?: boolean; acao?: string }> {
  const d = db();
  const eventoId = ev.id ?? `${ev.event}:${ev.payment?.id}`;
  if (d.eventos_asaas.some((e) => e.id === eventoId)) return { ok: true, duplicado: true };
  d.eventos_asaas.unshift({ id: eventoId, evento: ev.event, payload: ev, recebido_em: new Date().toISOString(), processado: false });

  const pedido = d.pedidos.find((p) => p.asaas_payment_id === ev.payment?.id || p.id === ev.payment?.externalReference);
  let acao = "ignorado";
  if (pedido) {
    switch (ev.event) {
      case "PAYMENT_CREATED":
        acao = "aguardando pagamento";
        break;
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        if (pedido.status !== "pago") {
          pedido.status = "pago";
          pedido.pago_em = new Date().toISOString();
          const validade = new Date();
          validade.setMonth(validade.getMonth() + 12);
          const plano = d.planos.find((p) => p.id === pedido.plano_id);
          d.carteira.unshift({ id: uid("cart"), usuario_id: pedido.usuario_id, pedido_id: pedido.id, quantidade: pedido.creditos, descricao: `Compra · ${plano?.nome ?? pedido.plano_id}`, validade: validade.toISOString(), data: new Date().toISOString() });
          audit(pedido.usuario_id, "pagamento_confirmado", `pedido:${pedido.id}`, `${pedido.creditos} crédito(s) liberado(s)`);
          // Aqui: emitir recibo/NF e notificar o cliente no app e no WhatsApp (fila interna).
          acao = "créditos liberados";
        }
        break;
      case "PAYMENT_OVERDUE":
        pedido.status = "vencido";
        acao = "lembrete ao cliente";
        break;
      case "PAYMENT_REFUNDED":
      case "PAYMENT_CHARGEBACK_REQUESTED": {
        pedido.status = ev.event === "PAYMENT_REFUNDED" ? "estornado" : "em_analise";
        // remove apenas créditos ainda não usados
        const usados = d.carteira.filter((c) => c.usuario_id === pedido.usuario_id && c.quantidade < 0).length;
        const comprados = d.carteira.filter((c) => c.usuario_id === pedido.usuario_id && c.quantidade > 0).reduce((s, c) => s + c.quantidade, 0);
        const remover = Math.min(pedido.creditos, Math.max(0, comprados - usados));
        if (remover) d.carteira.unshift({ id: uid("cart"), usuario_id: pedido.usuario_id, pedido_id: pedido.id, quantidade: -remover, descricao: `Estorno · pedido ${pedido.id}`, data: new Date().toISOString() });
        audit(pedido.usuario_id, "estorno", `pedido:${pedido.id}`, `${remover} crédito(s) removido(s)`);
        acao = "créditos não usados removidos";
        break;
      }
    }
  }
  d.eventos_asaas[0].processado = true;
  await save();
  return { ok: true, acao };
}
