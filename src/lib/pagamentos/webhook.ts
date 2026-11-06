import { NextResponse } from "next/server";
import { carregar } from "../db";
import { GATEWAYS } from "./gateways";
import { processarEvento } from "./processar";
import type { GatewayId } from "./config";

/** Recebe o webhook de qualquer gateway: valida a assinatura, normaliza e processa com idempotência. */
export async function receberWebhook(gatewayId: GatewayId, req: Request) {
  await carregar(true);
  const corpo = await req.text();
  const g = GATEWAYS[gatewayId];
  const amb = g.validarWebhook(req, corpo);
  if (!amb) return NextResponse.json({ erro: "assinatura inválida ou webhook não configurado" }, { status: 401 });
  try {
    const ev = await g.normalizar(corpo, req, amb);
    return NextResponse.json(await processarEvento(ev, gatewayId));
  } catch (e) {
    // 500 faz o gateway reenviar depois
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
