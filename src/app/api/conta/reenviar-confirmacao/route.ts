import { NextResponse } from "next/server";
import { db, save } from "@/lib/db";
import { criarToken, Emails } from "@/lib/email";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

export async function POST() {
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  if (u.email_confirmado !== false) return NextResponse.json({ ok: true, mensagem: "Seu e-mail já está confirmado." });
  const recentes = db().tokens.filter((t) => t.usuario_id === u.id && t.tipo === "email" && Date.now() - new Date(t.criado_em).getTime() < 600_000).length;
  if (recentes >= 2) return NextResponse.json({ erro: "Aguarde alguns minutos antes de pedir outro e-mail." }, { status: 429 });
  const r = await Emails.confirmar(u, criarToken(u.id, "email", 48 * 60));
  await save();
  if (!r.ok) return NextResponse.json({ erro: `Não foi possível enviar agora (${r.motivo}).` }, { status: 502 });
  return NextResponse.json({ ok: true, mensagem: `Enviamos um novo link para ${u.email}.` });
}
