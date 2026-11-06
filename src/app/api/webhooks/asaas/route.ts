import { NextResponse } from "next/server";
import { webhookAutorizado } from "@/lib/asaas";
import { processarEventoAsaas } from "@/lib/pagamentos";

/** Webhook do Asaas: valida token, grava com idempotência e responde rápido. */
export async function POST(req: Request) {
  if (!webhookAutorizado(req.headers.get("asaas-access-token"))) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const ev = await req.json().catch(() => null);
  if (!ev?.event) return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
  return NextResponse.json(processarEventoAsaas(ev));
}
