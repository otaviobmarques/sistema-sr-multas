import { NextResponse } from "next/server";
import { resetDb } from "@/lib/db";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

/** Restaura os dados de demonstração (somente administradores; contas reais são preservadas). */
export async function POST() {
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  if (u.perfil !== "admin") return NextResponse.json({ erro: "Somente administradores" }, { status: 403 });
  await resetDb();
  return NextResponse.json({ ok: true });
}
