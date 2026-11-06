import { NextResponse } from "next/server";
import { carregar, db, save } from "@/lib/db";
import { Emails } from "@/lib/email";
import type { Defesa } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const PROXIMO: Partial<Record<Defesa["status"], string>> = {
  em_analise: "gerar a sua defesa",
  aguardando_pagamento: "escolher um plano e gerar a defesa",
  aguardando_documentos: "enviar os documentos pendentes",
  aguardando_validacao: "conferir os fatos e assinar a defesa",
  pronta_para_protocolar: "protocolar a defesa no órgão",
};
const AVISOS = [7, 3, 1];

/** Vercel Cron diário: avisa por e-mail 7, 3 e 1 dia antes do prazo da fase (uma vez por marco). */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  await carregar(true);
  const d = db();
  const hoje = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) + "T12:00:00");
  let enviados = 0;
  for (const df of d.defesas) {
    const acao = PROXIMO[df.status];
    const m = d.multas.find((x) => x.id === df.multa_id);
    const u = d.usuarios.find((x) => x.id === df.dono_id);
    if (!acao || !m?.prazo || !u) continue;
    const dias = Math.round((new Date(m.prazo + "T12:00:00").getTime() - hoje.getTime()) / 86_400_000);
    const marco = AVISOS.find((a) => dias === a);
    if (!marco) continue;
    if (d.emails.some((e) => e.tipo === `prazo_${marco}d` && e.referencia === df.id && e.status === "enviado")) continue;
    const r = await Emails.prazo(u, df.id, m.placa, m.orgao, new Date(m.prazo + "T12:00:00").toLocaleDateString("pt-BR"), marco, acao);
    if (r.ok) enviados++;
  }
  await save();
  return NextResponse.json({ ok: true, enviados });
}
