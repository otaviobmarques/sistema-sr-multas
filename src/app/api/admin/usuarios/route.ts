import { NextResponse } from "next/server";
import { audit, carregar, db, rpcServidor, save, supabaseAtivo } from "@/lib/db";
import { naoAutorizado, usuarioAtual } from "@/lib/session";
import { criarToken, emailAtivo, Emails } from "@/lib/email";
import { formatarDoc, lancarCortesia, MSG_SENHA, senhaTemporaria, senhaValida } from "@/lib/usuarios";
import type { Perfil } from "@/lib/types";

const PERFIS: Perfil[] = ["cliente", "cliente_empresa", "qualidade", "admin"];

/** Admin cria uma conta (testadores, convidados, equipe). Acesso por convite no e-mail ou senha temporária. */
export async function POST(req: Request) {
  const admin = await usuarioAtual(true);
  if (!admin) return naoAutorizado();
  if (admin.perfil !== "admin") return NextResponse.json({ erro: "Somente administradores" }, { status: 403 });
  if (!supabaseAtivo()) return NextResponse.json({ erro: "Indisponível no modo demonstração" }, { status: 400 });

  const b = (await req.json().catch(() => ({}))) as Record<string, string | number>;
  const nome = String(b.nome ?? "").trim().replace(/\s+/g, " ");
  const email = String(b.email ?? "").trim().toLowerCase();
  const doc = String(b.cpf_cnpj ?? "").replace(/\D/g, "");
  const telefone = String(b.telefone ?? "").trim();
  const creditos = Math.trunc(Number(b.creditos ?? 0));
  const acesso = b.acesso === "senha" ? "senha" : "convite";
  const perfil = (PERFIS.includes(b.perfil as Perfil) ? b.perfil : doc.length === 14 ? "cliente_empresa" : "cliente") as Perfil;

  if (nome.split(" ").length < 2) return NextResponse.json({ erro: "Informe nome e sobrenome" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ erro: "E-mail inválido" }, { status: 400 });
  if (doc.length !== 11 && doc.length !== 14) return NextResponse.json({ erro: "CPF ou CNPJ inválido (ele aparece na qualificação da peça)" }, { status: 400 });
  if (!(creditos >= 0 && creditos <= 100)) return NextResponse.json({ erro: "Créditos: de 0 a 100" }, { status: 400 });
  if (acesso === "convite" && !emailAtivo()) return NextResponse.json({ erro: "E-mail não configurado: use a opção de senha temporária" }, { status: 400 });

  const informada = String(b.senha ?? "");
  if (acesso === "senha" && informada && !senhaValida(informada)) return NextResponse.json({ erro: MSG_SENHA }, { status: 400 });
  const senha = acesso === "senha" && informada ? informada : senhaTemporaria();
  let id: string;
  try {
    id = await rpcServidor<string>("sm_criar_usuario", { p_email: email, p_senha: senha });
  } catch (e) {
    return NextResponse.json({ erro: String((e as Error).message).includes("email_ja_cadastrado") ? "Já existe uma conta com este e-mail" : "Não foi possível criar a conta" }, { status: 400 });
  }
  await carregar(true);
  const u = { id, perfil, nome, cpf_cnpj: formatarDoc(doc), email, telefone, email_confirmado: true, criado_por: admin.id, criado_em: new Date().toISOString() };
  db().usuarios.unshift(u);
  audit(admin.id, "usuario_criado", `usuario:${id}`, `${perfil} · acesso por ${acesso === "convite" ? "convite no e-mail" : informada ? "senha definida pelo admin" : "senha gerada"}`);
  if (creditos > 0) lancarCortesia(id, creditos, "conta criada pelo administrador", admin.id);
  if (acesso === "convite") await Emails.convite(u, criarToken(id, "senha", 7 * 24 * 60), creditos);
  await save();
  return NextResponse.json({ ok: true, id, ...(acesso === "senha" ? { senha } : { convite: email }) });
}
