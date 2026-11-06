import { NextResponse } from "next/server";
import { carregar } from "@/lib/db";
import { sincronizarLeis } from "@/lib/leis/sincronizar";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Chamado diariamente pelo Vercel Cron (vercel.json). Exige Authorization: Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  await carregar(true);
  try {
    return NextResponse.json(await sincronizarLeis());
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 502 });
  }
}
