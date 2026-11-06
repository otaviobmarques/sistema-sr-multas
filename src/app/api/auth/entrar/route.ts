import { NextResponse } from "next/server";
import { carregar, db } from "@/lib/db";
import { supabaseServidor } from "@/lib/session";

export async function POST(req: Request) {
  const { email, senha } = (await req.json().catch(() => ({}))) as { email?: string; senha?: string };
  if (!email || !senha) return NextResponse.json({ erro: "Informe e-mail e senha" }, { status: 400 });
  // "Usuário" sem @ (ex.: admin) vira o e-mail interno da conta
  const login = email.trim().toLowerCase();
  const emailReal = login.includes("@") ? login : `${login}@senhormultas.interno`;
  const { data, error } = await (await supabaseServidor()).auth.signInWithPassword({ email: emailReal, password: senha });
  if (error || !data.user) return NextResponse.json({ erro: "E-mail ou senha incorretos" }, { status: 401 });
  await carregar(true);
  const u = db().usuarios.find((x) => x.id === data.user.id);
  return NextResponse.json({ ok: true, destino: u && ["admin", "qualidade"].includes(u.perfil) ? "/admin" : "/app" });
}
