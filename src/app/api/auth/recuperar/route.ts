import { NextResponse } from "next/server";
import { audit, carregar, db, save } from "@/lib/db";
import { criarToken, emailAtivo, Emails } from "@/lib/email";

/** Pedido de redefinição de senha. Resposta sempre igual (não revela se o e-mail existe). */
export async function POST(req: Request) {
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const resposta = NextResponse.json({ ok: true, mensagem: "Se houver uma conta com este e-mail, enviamos um link para criar uma nova senha. Confira também a caixa de spam." });
  if (!email?.includes("@")) return resposta;
  if (!emailAtivo()) return NextResponse.json({ erro: "Recuperação por e-mail ainda não está disponível. Fale com o atendimento." }, { status: 503 });
  await carregar(true);
  const u = db().usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u || u.email.endsWith("@senhormultas.interno")) return resposta;
  // limite: 3 pedidos por hora por conta
  const recentes = db().tokens.filter((t) => t.usuario_id === u.id && t.tipo === "senha" && Date.now() - new Date(t.criado_em).getTime() < 3_600_000).length;
  if (recentes >= 3) return resposta;
  const token = criarToken(u.id, "senha", 60);
  await Emails.redefinir(u, token);
  audit(u.id, "senha_recuperacao_pedida", `usuario:${u.id}`);
  await save();
  return resposta;
}
