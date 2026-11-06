import { receberWebhook } from "@/lib/pagamentos/webhook";

export const runtime = "nodejs";

/** Webhook asaas: URL a cadastrar no painel do gateway (Admin → Pagamentos mostra a URL e as instruções). */
export async function POST(req: Request) {
  return receberWebhook("asaas", req);
}
