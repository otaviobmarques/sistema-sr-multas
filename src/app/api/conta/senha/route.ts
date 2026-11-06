import { NextResponse } from "next/server";
import { audit, save, supabaseAtivo } from "@/lib/db";
import { naoAutorizado, supabaseServidor, usuarioAtual } from "@/lib/session";

/** Troca de senha: confere a senha atual e grava a nova no Supabase Auth. */
export async function POST(req: Request) {
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  if (!supabaseAtivo()) return NextResponse.json({ erro: "Indisponível no modo demonstração" }, { status: 400 });
  const { atual, nova, confirmacao } = (await req.json().catch(() => ({}))) as { atual?: string; nova?: string; confirmacao?: string };
  if (!atual || !nova) return NextResponse.json({ erro: "Preencha a senha atual e a nova" }, { status: 400 });
  if (nova !== confirmacao) return NextResponse.json({ erro: "A confirmação não confere com a nova senha" }, { status: 400 });
  if (nova.length < 10 || !/[A-Za-z]/.test(nova) || !/\d/.test(nova)) return NextResponse.json({ erro: "A nova senha precisa ter ao menos 10 caracteres, com letras e números" }, { status: 400 });
  if (nova === atual) return NextResponse.json({ erro: "A nova senha deve ser diferente da atual" }, { status: 400 });
  const supa = await supabaseServidor();
  const { error: erroLogin } = await supa.auth.signInWithPassword({ email: u.email, password: atual });
  if (erroLogin) return NextResponse.json({ erro: "Senha atual incorreta" }, { status: 400 });
  const { error } = await supa.auth.updateUser({ password: nova });
  if (error) return NextResponse.json({ erro: "Não foi possível alterar a senha agora" }, { status: 500 });
  audit(u.id, "senha_alterada", `usuario:${u.id}`);
  await save();
  return NextResponse.json({ ok: true });
}
