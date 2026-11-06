import { NextResponse } from "next/server";
import { audit, db, save, uid } from "@/lib/db";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

/** LGPD: titular abre pedido (exclusão/correção); admin conclui. */
export async function POST(req: Request) {
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  const b = (await req.json().catch(() => ({}))) as { tipo?: string; detalhe?: string; concluir?: string };
  const d = db();
  if (b.concluir) {
    if (u.perfil !== "admin") return NextResponse.json({ erro: "Somente administradores" }, { status: 403 });
    const s = d.solicitacoes_lgpd.find((x) => x.id === b.concluir);
    if (!s) return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });
    s.status = "concluida";
    s.concluida_em = new Date().toISOString();
    audit(u.id, "lgpd_pedido_concluido", `lgpd:${s.id}`, s.tipo);
    await save();
    return NextResponse.json({ ok: true });
  }
  const tipo = b.tipo === "exclusao" || b.tipo === "correcao" ? b.tipo : "outro";
  if (d.solicitacoes_lgpd.some((s) => s.usuario_id === u.id && s.tipo === tipo && s.status === "aberta"))
    return NextResponse.json({ erro: "Você já tem um pedido desse tipo em andamento" }, { status: 400 });
  d.solicitacoes_lgpd.unshift({ id: uid("lgpd"), usuario_id: u.id, nome: u.nome, email: u.email, tipo, detalhe: b.detalhe?.slice(0, 1000) || null, status: "aberta", data: new Date().toISOString() });
  audit(u.id, "lgpd_pedido_aberto", `usuario:${u.id}`, tipo);
  await save();
  return NextResponse.json({ ok: true });
}
