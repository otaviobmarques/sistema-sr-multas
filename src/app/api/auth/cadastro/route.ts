import { NextResponse } from "next/server";
import { audit, carregar, db, rpcServidor, save, supabaseAtivo } from "@/lib/db";
import { emailsAdmin, supabaseServidor } from "@/lib/session";
import { criarToken, emailAtivo, Emails } from "@/lib/email";

/** Cadastro: cria a conta no Supabase Auth (já confirmada) e o perfil do cliente. */
export async function POST(req: Request) {
  if (!supabaseAtivo()) return NextResponse.json({ erro: "Cadastro indisponível no modo demonstração" }, { status: 400 });
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const nome = (b.nome ?? "").trim().replace(/\s+/g, " ");
  const email = (b.email ?? "").trim().toLowerCase();
  const doc = (b.cpf_cnpj ?? "").replace(/\D/g, "");
  const tel = (b.telefone ?? "").trim();
  const senha = b.senha ?? "";
  if (nome.split(" ").length < 2) return NextResponse.json({ erro: "Informe nome e sobrenome" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ erro: "E-mail inválido" }, { status: 400 });
  if (doc.length !== 11 && doc.length !== 14) return NextResponse.json({ erro: "CPF ou CNPJ inválido" }, { status: 400 });
  if (senha.length < 10 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return NextResponse.json({ erro: "A senha precisa ter ao menos 10 caracteres, com letras e números" }, { status: 400 });
  if (!b.aceite) return NextResponse.json({ erro: "É preciso aceitar os termos de uso" }, { status: 400 });

  let uid: string;
  try {
    uid = await rpcServidor<string>("sm_criar_usuario", { p_email: email, p_senha: senha });
  } catch (e) {
    const msg = String((e as Error).message);
    return NextResponse.json({ erro: msg.includes("email_ja_cadastrado") ? "Este e-mail já tem conta. Faça login." : "Não foi possível criar a conta" }, { status: 400 });
  }
  await carregar(true);
  const fmt = doc.length === 11 ? doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  const perfil = emailsAdmin().includes(email) ? "admin" : doc.length === 14 ? "cliente_empresa" : "cliente";
  const confirmar = emailAtivo() && perfil !== "admin";
  db().usuarios.unshift({ id: uid, perfil, nome, cpf_cnpj: fmt, email, telefone: tel, email_confirmado: confirmar ? false : true, criado_em: new Date().toISOString() });
  if (confirmar) await Emails.confirmar(db().usuarios[0], criarToken(uid, "email", 48 * 60));
  audit(uid, "cadastro", `usuario:${uid}`, "aceite dos termos de uso e da geração por IA");
  await save();

  const { error } = await (await supabaseServidor()).auth.signInWithPassword({ email, password: senha });
  if (error) return NextResponse.json({ erro: "Conta criada. Faça login." }, { status: 200 });
  return NextResponse.json({ ok: true, destino: perfil === "admin" ? "/admin" : "/app" });
}
