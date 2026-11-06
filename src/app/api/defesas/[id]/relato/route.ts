import { NextResponse } from "next/server";
import { audit, carregar, db, save } from "@/lib/db";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

const LIMITE_RELATO = 3000;

/** Relato do cliente ("o que aconteceu"): fatos e circunstâncias que a IA usa para compor a defesa. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  await carregar(true);
  const defesa = db().defesas.find((x) => x.id === id && x.dono_id === u.id);
  if (!defesa) return NextResponse.json({ erro: "Defesa não encontrada" }, { status: 404 });
  if (defesa.assinada_em) return NextResponse.json({ erro: "A defesa já foi assinada" }, { status: 400 });
  const { relato } = (await req.json().catch(() => ({}))) as { relato?: string };
  const texto = String(relato ?? "").replace(/\r/g, "").trim().slice(0, LIMITE_RELATO);
  if ((defesa.relato ?? "") === texto) return NextResponse.json({ ok: true, relato: texto });
  defesa.relato = texto || null;
  audit(u.id, "relato_atualizado", `defesa:${defesa.id}`, `${texto.length} caracteres`);
  await save();
  return NextResponse.json({ ok: true, relato: texto });
}
