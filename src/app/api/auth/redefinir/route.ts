import { NextResponse } from "next/server";
import { audit, carregar, rpcServidor, save } from "@/lib/db";
import { usarToken } from "@/lib/email";

/** Define a nova senha a partir do link (token de uso único, 1 hora). */
export async function POST(req: Request) {
  const { token, senha, confirmacao } = (await req.json().catch(() => ({}))) as { token?: string; senha?: string; confirmacao?: string };
  if (!senha || senha.length < 10 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return NextResponse.json({ erro: "A senha precisa ter ao menos 10 caracteres, com letras e números" }, { status: 400 });
  if (senha !== confirmacao) return NextResponse.json({ erro: "A confirmação não confere" }, { status: 400 });
  await carregar(true);
  const usuarioId = usarToken(token ?? "", "senha");
  if (!usuarioId) return NextResponse.json({ erro: "Link inválido ou expirado. Peça um novo." }, { status: 400 });
  await rpcServidor("sm_definir_senha", { p_usuario: usuarioId, p_senha: senha });
  audit(usuarioId, "senha_redefinida_por_email", `usuario:${usuarioId}`);
  await save();
  return NextResponse.json({ ok: true });
}
