/**
 * M9 · Integração Asaas (API v3).
 * A chave fica SOMENTE no servidor. Sem ASAAS_API_KEY o módulo opera em modo demonstração:
 * as cobranças são simuladas e o pagamento é confirmado por um evento de webhook simulado,
 * que passa exatamente pelo mesmo processamento do webhook real.
 * Confirme nomes de campos/eventos na documentação vigente: docs.asaas.com
 */
import { randomUUID } from "crypto";

export const asaasAtivo = () => Boolean(process.env.ASAAS_API_KEY);
const BASE = () => (process.env.ASAAS_ENV === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3");

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE() + path, {
    method,
    headers: { "Content-Type": "application/json", access_token: process.env.ASAAS_API_KEY!, "User-Agent": "senhor-multas" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Asaas ${res.status}: ${JSON.stringify((json as { errors?: unknown }).errors ?? json)}`);
  return json as T;
}

export async function garantirCliente(u: { nome: string; cpf_cnpj: string; email: string; telefone: string; asaas_customer_id?: string | null }) {
  if (u.asaas_customer_id) return u.asaas_customer_id;
  if (!asaasAtivo()) return `cus_demo_${randomUUID().slice(0, 8)}`;
  const c = await call<{ id: string }>("POST", "/customers", {
    name: u.nome,
    cpfCnpj: u.cpf_cnpj.replace(/\D/g, ""),
    email: u.email,
    mobilePhone: u.telefone.replace(/\D/g, ""),
  });
  return c.id;
}

export type CobrancaInput = {
  customer: string;
  valor: number;
  metodo: "PIX" | "CREDIT_CARD" | "BOLETO";
  parcelas?: number;
  descricao: string;
  externalReference: string;
  split?: { walletId: string; percentualValue: number }[];
};

export async function criarCobranca(i: CobrancaInput): Promise<{ id: string; invoiceUrl: string | null; pixPayload?: string; pixQr?: string }> {
  if (!asaasAtivo()) {
    return { id: `pay_demo_${randomUUID().slice(0, 8)}`, invoiceUrl: null, pixPayload: i.metodo === "PIX" ? `00020126580014br.gov.bcb.pix0136demo-${i.externalReference}5204000053039865406${i.valor.toFixed(2)}5802BR6304DEMO` : undefined };
  }
  const due = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const body: Record<string, unknown> = {
    customer: i.customer,
    billingType: i.metodo,
    dueDate: due,
    description: i.descricao,
    externalReference: i.externalReference,
    ...(i.split?.length ? { split: i.split } : {}),
  };
  if (i.metodo === "CREDIT_CARD" && i.parcelas && i.parcelas > 1) {
    body.installmentCount = i.parcelas;
    body.totalValue = i.valor;
  } else body.value = i.valor;
  const p = await call<{ id: string; invoiceUrl: string }>("POST", "/payments", body);
  let pixPayload: string | undefined, pixQr: string | undefined;
  if (i.metodo === "PIX") {
    const q = await call<{ payload: string; encodedImage: string }>("GET", `/payments/${p.id}/pixQrCode`);
    pixPayload = q.payload;
    pixQr = q.encodedImage;
  }
  return { id: p.id, invoiceUrl: p.invoiceUrl, pixPayload, pixQr };
}

/** Valida o token enviado pelo Asaas no header `asaas-access-token`. */
export function webhookAutorizado(token: string | null) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!esperado) return !asaasAtivo(); // em demo, aceita
  return token === esperado;
}
