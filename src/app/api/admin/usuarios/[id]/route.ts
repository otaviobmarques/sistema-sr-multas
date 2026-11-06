import { NextResponse } from "next/server";
import { audit, carregar, db, rpcServidor, save, saldo } from "@/lib/db";
import { naoAutorizado, usuarioAtual } from "@/lib/session";
import { criarToken, emailAtivo, Emails } from "@/lib/email";
import { lancarCortesia, MSG_SENHA, senhaTemporaria, senhaValida } from "@/lib/usuarios";

/** Ações do admin sobre uma conta: lançar/remover créditos de cortesia ou reenviar o acesso. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await usuarioAtual(true);
  if (!admin) return naoAutorizado();
  if (admin.perfil !== "admin") return NextResponse.json({ erro: "Somente administradores" }, { status: 403 });
  const { id } = await params;
  await carregar(true);
  const u = db().usuarios.find((x) => x.id === id);
  if (!u) return NextResponse.json({ erro: "Usuário não encontrado" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { acao?: string; quantidade?: number; motivo?: string; modo?: string; senha?: string };

  if (b.acao === "creditos") {
    const q = Math.trunc(Number(b.quantidade));
    const motivo = String(b.motivo ?? "").trim().slice(0, 120);
    if (!q || q > 100 || q < -100) return NextResponse.json({ erro: "Quantidade: de -100 a 100 (diferente de zero)" }, { status: 400 });
    if (q < 0 && saldo(id) + q < 0) return NextResponse.json({ erro: `O usuário só tem ${saldo(id)} crédito(s) disponível(is)` }, { status: 400 });
    lancarCortesia(id, q, motivo, admin.id);
    await save();
    return NextResponse.json({ ok: true, saldo: saldo(id) });
  }

  if (b.acao === "acesso") {
    if (u.email.endsWith("@senhormultas.interno")) return NextResponse.json({ erro: "Conta interna: altere a senha em Minha conta" }, { status: 400 });
    if (b.modo === "senha") {
      if (b.senha && !senhaValida(b.senha)) return NextResponse.json({ erro: MSG_SENHA }, { status: 400 });
      const senha = b.senha || senhaTemporaria();
      await rpcServidor("sm_definir_senha", { p_usuario: id, p_senha: senha });
      audit(admin.id, "senha_temporaria", `usuario:${id}`);
      await save();
      return NextResponse.json({ ok: true, senha });
    }
    if (!emailAtivo()) return NextResponse.json({ erro: "E-mail não configurado" }, { status: 400 });
    await Emails.convite(u, criarToken(id, "senha", 7 * 24 * 60), saldo(id));
    audit(admin.id, "convite_reenviado", `usuario:${id}`);
    await save();
    return NextResponse.json({ ok: true, convite: u.email });
  }
  return NextResponse.json({ erro: "Ação inválida" }, { status: 400 });
}
