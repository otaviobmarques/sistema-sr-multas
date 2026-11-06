import { NextResponse } from "next/server";
import { audit, save } from "@/lib/db";
import { validarNorma } from "@/lib/leis/base";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

/** Valida (ou retira a validação de) uma norma de curadoria própria. */
export async function POST(req: Request) {
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  if (!["admin", "qualidade"].includes(u.perfil)) return NextResponse.json({ erro: "Somente a equipe de qualidade" }, { status: 403 });
  const { norma_id, por, retirar } = (await req.json().catch(() => ({}))) as { norma_id?: string; por?: string; retirar?: boolean };
  if (!norma_id?.startsWith("curadoria-")) return NextResponse.json({ erro: "Só normas de curadoria são validadas aqui" }, { status: 400 });
  if (!retirar && (!por?.trim() || por.trim().length < 6)) return NextResponse.json({ erro: "Informe nome e OAB de quem validou" }, { status: 400 });
  await validarNorma(norma_id, retirar ? "" : por!.trim());
  audit(u.id, retirar ? "curadoria_validacao_retirada" : "curadoria_validada", `norma:${norma_id}`, por);
  await save();
  return NextResponse.json({ ok: true });
}
