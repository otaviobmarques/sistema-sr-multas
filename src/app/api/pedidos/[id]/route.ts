import { NextResponse } from "next/server";
import { db, saldo } from "@/lib/db";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

/** Situação de um pedido (o checkout consulta até o webhook confirmar). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  const p = db().pedidos.find((x) => x.id === id && x.usuario_id === u.id);
  if (!p) return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });
  return NextResponse.json({ status: p.status, saldo: saldo(u.id) });
}
