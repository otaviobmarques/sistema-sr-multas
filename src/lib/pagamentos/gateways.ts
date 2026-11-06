/**
 * Conectores de pagamento. Todos seguem o mesmo contrato, para o resto do sistema não depender do gateway.
 * Confira nomes de campos e eventos na documentação vigente de cada provedor:
 *   Asaas: docs.asaas.com · Mercado Pago: mercadopago.com.br/developers · Stripe: docs.stripe.com
 */
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { credencial, lerConfig, type Ambiente, type GatewayId, type Metodo } from "./config";

export type Cliente = { id: string; nome: string; cpf_cnpj: string; email: string; telefone: string; asaas_customer_id?: string | null };
export type CobrancaEntrada = {
  pedidoId: string;
  cliente: Cliente;
  valor: number;
  metodo: Metodo;
  parcelas: number;
  descricao: string;
  urlRetorno: string; // página para onde o cliente volta após pagar (Stripe/Mercado Pago)
  urlWebhook: string;
};
export type CobrancaSaida = { id: string; url_pagamento: string | null; pix_payload?: string | null; pix_qr_base64?: string | null; cliente_gateway_id?: string | null };
export type TipoEvento = "criado" | "pago" | "vencido" | "estornado" | "chargeback" | "ignorado";
export type EventoNormalizado = { id: string; tipo: TipoEvento; pagamento_id: string | null; referencia: string | null; aux?: string | null; bruto: unknown };

export interface Gateway {
  id: GatewayId;
  nome: string;
  criarCobranca(e: CobrancaEntrada, amb: Ambiente): Promise<CobrancaSaida>;
  /** Valida a autenticidade do webhook. Retorna o ambiente cujo segredo confere (ou null). */
  validarWebhook(req: Request, corpo: string): Ambiente | null;
  /** Converte o webhook no evento padrão (pode consultar a API do gateway). */
  normalizar(corpo: string, req: Request, amb: Ambiente): Promise<EventoNormalizado>;
  testar(amb: Ambiente): Promise<{ ok: boolean; detalhe: string }>;
}

const venc = () => new Date(Date.now() + lerConfig().vencimento_dias * 86_400_000).toISOString().slice(0, 10);
const iguais = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const ambientes: Ambiente[] = ["producao", "teste"];

// ---------------------------------------------------------------- Asaas
const asaasBase = (amb: Ambiente) => (amb === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3");
async function asaas<T>(amb: Ambiente, metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const key = credencial("asaas", amb, "api_key");
  if (!key) throw new Error("Asaas sem chave de API neste ambiente");
  const r = await fetch(asaasBase(amb) + caminho, { method: metodo, headers: { "Content-Type": "application/json", access_token: key, "User-Agent": "senhor-multas" }, body: corpo ? JSON.stringify(corpo) : undefined, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Asaas ${r.status}: ${JSON.stringify((j as { errors?: unknown }).errors ?? j).slice(0, 300)}`);
  return j as T;
}

export const Asaas: Gateway = {
  id: "asaas",
  nome: "Asaas",
  async criarCobranca(e, amb) {
    let customer = e.cliente.asaas_customer_id ?? null;
    if (!customer) {
      const c = await asaas<{ id: string }>(amb, "POST", "/customers", { name: e.cliente.nome, cpfCnpj: e.cliente.cpf_cnpj.replace(/\D/g, ""), email: e.cliente.email, mobilePhone: e.cliente.telefone.replace(/\D/g, "") || undefined, externalReference: e.cliente.id });
      customer = c.id;
    }
    const corpo: Record<string, unknown> = { customer, billingType: e.metodo, dueDate: venc(), description: e.descricao, externalReference: e.pedidoId };
    if (e.metodo === "CREDIT_CARD" && e.parcelas > 1) {
      corpo.installmentCount = e.parcelas;
      corpo.totalValue = e.valor;
    } else corpo.value = e.valor;
    const p = await asaas<{ id: string; invoiceUrl: string }>(amb, "POST", "/payments", corpo);
    let pix: { payload: string; encodedImage: string } | null = null;
    if (e.metodo === "PIX") pix = await asaas(amb, "GET", `/payments/${p.id}/pixQrCode`);
    return { id: p.id, url_pagamento: p.invoiceUrl, pix_payload: pix?.payload ?? null, pix_qr_base64: pix?.encodedImage ?? null, cliente_gateway_id: customer };
  },
  validarWebhook(req) {
    const t = req.headers.get("asaas-access-token") ?? "";
    for (const amb of ambientes) {
      const esperado = credencial("asaas", amb, "webhook_token");
      if (esperado && t && iguais(t, esperado)) return amb;
    }
    return null;
  },
  async normalizar(corpo) {
    const ev = JSON.parse(corpo) as { id?: string; event: string; payment?: { id: string; externalReference?: string } };
    const mapa: Record<string, TipoEvento> = { PAYMENT_CREATED: "criado", PAYMENT_CONFIRMED: "pago", PAYMENT_RECEIVED: "pago", PAYMENT_OVERDUE: "vencido", PAYMENT_REFUNDED: "estornado", PAYMENT_CHARGEBACK_REQUESTED: "chargeback" };
    return { id: `asaas:${ev.id ?? `${ev.event}:${ev.payment?.id}`}`, tipo: mapa[ev.event] ?? "ignorado", pagamento_id: ev.payment?.id ?? null, referencia: ev.payment?.externalReference ?? null, bruto: ev };
  },
  async testar(amb) {
    try {
      const r = await asaas<{ totalCount?: number }>(amb, "GET", "/customers?limit=1");
      return { ok: true, detalhe: `Conectado ao Asaas (${amb === "producao" ? "produção" : "sandbox"}) · ${r.totalCount ?? 0} cliente(s) na conta` };
    } catch (e) {
      return { ok: false, detalhe: (e as Error).message };
    }
  },
};

// ---------------------------------------------------------------- Mercado Pago
async function mp<T>(amb: Ambiente, metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const token = credencial("mercadopago", amb, "access_token");
  if (!token) throw new Error("Mercado Pago sem Access Token neste ambiente");
  const r = await fetch("https://api.mercadopago.com" + caminho, { method: metodo, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Idempotency-Key": randomUUID() }, body: corpo ? JSON.stringify(corpo) : undefined, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return j as T;
}

export const MercadoPago: Gateway = {
  id: "mercadopago",
  nome: "Mercado Pago",
  async criarCobranca(e, amb) {
    const [primeiro, ...resto] = e.cliente.nome.split(" ");
    if (e.metodo === "PIX") {
      const doc = e.cliente.cpf_cnpj.replace(/\D/g, "");
      const p = await mp<{ id: number; point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } } }>(amb, "POST", "/v1/payments", {
        transaction_amount: e.valor,
        description: e.descricao,
        payment_method_id: "pix",
        external_reference: e.pedidoId,
        notification_url: e.urlWebhook,
        date_of_expiration: new Date(Date.now() + lerConfig().vencimento_dias * 86_400_000).toISOString(),
        payer: { email: e.cliente.email, first_name: primeiro, last_name: resto.join(" ") || primeiro, identification: { type: doc.length === 14 ? "CNPJ" : "CPF", number: doc } },
      });
      const t = p.point_of_interaction?.transaction_data;
      return { id: String(p.id), url_pagamento: t?.ticket_url ?? null, pix_payload: t?.qr_code ?? null, pix_qr_base64: t?.qr_code_base64 ?? null };
    }
    // Cartão e boleto: Checkout Pro (página do Mercado Pago)
    const excluidos = e.metodo === "CREDIT_CARD" ? ["ticket", "bank_transfer", "atm", "debit_card"] : ["credit_card", "debit_card", "bank_transfer", "atm"];
    const pref = await mp<{ id: string; init_point: string; sandbox_init_point: string }>(amb, "POST", "/checkout/preferences", {
      items: [{ id: e.pedidoId, title: e.descricao, quantity: 1, unit_price: e.valor, currency_id: "BRL" }],
      external_reference: e.pedidoId,
      notification_url: e.urlWebhook,
      payer: { name: primeiro, surname: resto.join(" "), email: e.cliente.email },
      payment_methods: { excluded_payment_types: excluidos.map((id) => ({ id })), installments: e.metodo === "CREDIT_CARD" ? Math.max(1, e.parcelas) : 1 },
      back_urls: { success: e.urlRetorno, pending: e.urlRetorno, failure: e.urlRetorno },
      auto_return: "approved",
    });
    return { id: `pref_${pref.id}`, url_pagamento: amb === "producao" ? pref.init_point : pref.sandbox_init_point || pref.init_point };
  },
  validarWebhook(req, corpo) {
    // x-signature: "ts=...,v1=..." · manifesto: id:{data.id};request-id:{x-request-id};ts:{ts};
    const assinatura = req.headers.get("x-signature") ?? "";
    const requestId = req.headers.get("x-request-id") ?? "";
    const partes = Object.fromEntries(assinatura.split(",").map((p) => p.trim().split("=") as [string, string]));
    const url = new URL(req.url);
    let dataId = url.searchParams.get("data.id") ?? "";
    if (!dataId) {
      try {
        dataId = String((JSON.parse(corpo) as { data?: { id?: string | number } }).data?.id ?? "");
      } catch {
        /* corpo inválido */
      }
    }
    if (!partes.ts || !partes.v1) return null;
    const manifesto = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${partes.ts};`;
    for (const amb of ambientes) {
      const segredo = credencial("mercadopago", amb, "webhook_secret");
      if (segredo && iguais(createHmac("sha256", segredo).update(manifesto).digest("hex"), partes.v1)) return amb;
    }
    return null;
  },
  async normalizar(corpo, req, amb) {
    const ev = JSON.parse(corpo) as { id?: string | number; type?: string; action?: string; data?: { id?: string | number } };
    const pid = String(ev.data?.id ?? new URL(req.url).searchParams.get("data.id") ?? "");
    if ((ev.type ?? "") !== "payment" || !pid) return { id: `mp:${ev.id ?? pid}`, tipo: "ignorado", pagamento_id: pid || null, referencia: null, bruto: ev };
    // Busca o pagamento para saber o status real (nunca confia só no corpo do webhook)
    const p = await mp<{ id: number; status: string; external_reference?: string }>(amb, "GET", `/v1/payments/${pid}`);
    const mapa: Record<string, TipoEvento> = { approved: "pago", refunded: "estornado", charged_back: "chargeback", cancelled: "vencido", rejected: "ignorado", pending: "criado", in_process: "criado" };
    return { id: `mp:${pid}:${p.status}`, tipo: mapa[p.status] ?? "ignorado", pagamento_id: String(p.id), referencia: p.external_reference ?? null, bruto: { evento: ev, status: p.status } };
  },
  async testar(amb) {
    try {
      const r = await mp<{ id: number; nickname?: string; site_id?: string }>(amb, "GET", "/users/me");
      return { ok: true, detalhe: `Conectado ao Mercado Pago · conta ${r.nickname ?? r.id} (${r.site_id ?? ""})` };
    } catch (e) {
      return { ok: false, detalhe: (e as Error).message };
    }
  },
};

// ---------------------------------------------------------------- Stripe
async function stripe<T>(amb: Ambiente, metodo: string, caminho: string, form?: Record<string, string | number>): Promise<T> {
  const key = credencial("stripe", amb, "secret_key");
  if (!key) throw new Error("Stripe sem Secret key neste ambiente");
  const r = await fetch("https://api.stripe.com/v1" + caminho, {
    method: metodo,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form ? new URLSearchParams(Object.entries(form).map(([k, v]) => [k, String(v)])).toString() : undefined,
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Stripe ${r.status}: ${JSON.stringify((j as { error?: unknown }).error ?? j).slice(0, 300)}`);
  return j as T;
}

export const Stripe: Gateway = {
  id: "stripe",
  nome: "Stripe",
  async criarCobranca(e, amb) {
    const tipos = e.metodo === "PIX" ? ["pix"] : e.metodo === "BOLETO" ? ["boleto"] : ["card"];
    const form: Record<string, string | number> = {
      mode: "payment",
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "brl",
      "line_items[0][price_data][unit_amount]": Math.round(e.valor * 100),
      "line_items[0][price_data][product_data][name]": e.descricao,
      client_reference_id: e.pedidoId,
      "metadata[pedido_id]": e.pedidoId,
      "payment_intent_data[metadata][pedido_id]": e.pedidoId,
      customer_email: e.cliente.email,
      success_url: `${e.urlRetorno}${e.urlRetorno.includes("?") ? "&" : "?"}stripe=ok`,
      cancel_url: e.urlRetorno,
      expires_at: Math.floor(Date.now() / 1000) + 23 * 3600,
    };
    tipos.forEach((t, i) => (form[`payment_method_types[${i}]`] = t));
    if (e.metodo === "CREDIT_CARD" && e.parcelas > 1) form["payment_method_options[card][installments][enabled]"] = "true";
    if (e.metodo === "BOLETO") form["payment_method_options[boleto][expires_after_days]"] = lerConfig().vencimento_dias;
    const s = await stripe<{ id: string; url: string }>(amb, "POST", "/checkout/sessions", form);
    return { id: s.id, url_pagamento: s.url };
  },
  validarWebhook(req, corpo) {
    // Stripe-Signature: t=...,v1=...  · assinatura = HMAC-SHA256(`${t}.${corpo}`)
    const cab = req.headers.get("stripe-signature") ?? "";
    const t = cab.match(/t=(\d+)/)?.[1];
    const v1s = [...cab.matchAll(/v1=([a-f0-9]+)/g)].map((m) => m[1]);
    if (!t || !v1s.length || Math.abs(Date.now() / 1000 - Number(t)) > 600) return null;
    for (const amb of ambientes) {
      const segredo = credencial("stripe", amb, "webhook_secret");
      if (!segredo) continue;
      const esperado = createHmac("sha256", segredo).update(`${t}.${corpo}`).digest("hex");
      if (v1s.some((v) => iguais(v, esperado))) return amb;
    }
    return null;
  },
  async normalizar(corpo) {
    const ev = JSON.parse(corpo) as { id: string; type: string; data: { object: { id: string; payment_status?: string; client_reference_id?: string; metadata?: { pedido_id?: string }; payment_intent?: string } } };
    const o = ev.data.object;
    const ref = o.client_reference_id ?? o.metadata?.pedido_id ?? null;
    const sessao = o.id.startsWith("cs_");
    let tipo: TipoEvento = "ignorado";
    if (ev.type === "checkout.session.completed") tipo = o.payment_status === "paid" ? "pago" : "criado";
    else if (ev.type === "checkout.session.async_payment_succeeded") tipo = "pago";
    else if (ev.type === "checkout.session.expired" || ev.type === "checkout.session.async_payment_failed") tipo = "vencido";
    else if (ev.type === "charge.refunded") tipo = "estornado";
    else if (ev.type === "charge.dispute.created") tipo = "chargeback";
    // sessão: pagamento_id = id da sessão; aux = payment_intent (guardado para casar estornos/contestações)
    // charge/dispute: pagamento_id = payment_intent
    return { id: `stripe:${ev.id}`, tipo, pagamento_id: sessao ? o.id : o.payment_intent ?? null, referencia: ref, aux: sessao ? o.payment_intent ?? null : null, bruto: { type: ev.type, id: o.id } };
  },
  async testar(amb) {
    try {
      const r = await stripe<{ available?: { amount: number; currency: string }[]; livemode?: boolean }>(amb, "GET", "/balance");
      return { ok: true, detalhe: `Conectado à Stripe (${r.livemode ? "produção" : "teste"})` };
    } catch (e) {
      return { ok: false, detalhe: (e as Error).message };
    }
  },
};

export const GATEWAYS: Record<GatewayId, Gateway> = { asaas: Asaas, mercadopago: MercadoPago, stripe: Stripe };
