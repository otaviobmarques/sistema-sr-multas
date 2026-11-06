import { NextResponse } from "next/server";
import { gerar } from "@/lib/servico";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  if (u.email_confirmado === false) return NextResponse.json({ erro: "Confirme seu e-mail para gerar a defesa (enviamos um link na sua caixa de entrada)." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { ajuste?: string };
  try {
    const r = await gerar(id, u.id, body.ajuste?.slice(0, 1000));
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 400 });
  }
}
