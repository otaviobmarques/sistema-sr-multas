import { NextResponse } from "next/server";
import { audit, db, save } from "@/lib/db";
import { apagarArquivo, DOCS, faltantes, lerArquivo } from "@/lib/documentos";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

export const runtime = "nodejs";

/** Baixar um documento (dono ou administrador). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioAtual();
  if (!u) return naoAutorizado();
  const a = await lerArquivo((await params).id);
  if (!a || (a.dono_id !== u.id && u.perfil !== "admin")) return NextResponse.json({ erro: "Documento não encontrado" }, { status: 404 });
  if (u.perfil === "admin" && a.dono_id !== u.id) {
    audit(u.id, "documento_acessado_admin", `documento:${a.id}`, a.tipo);
    await save();
  }
  return new Response(new Uint8Array(a.bytes), {
    headers: { "Content-Type": a.mime, "Content-Disposition": `inline; filename="${encodeURIComponent(a.nome)}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

/** Excluir um documento (só o dono). */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  const id = (await params).id;
  const a = await lerArquivo(id);
  if (!a || a.dono_id !== u.id) return NextResponse.json({ erro: "Documento não encontrado" }, { status: 404 });
  await apagarArquivo(id, u.id);
  const d = db();
  const defesa = d.defesas.find((x) => x.id === a.defesa_id);
  if (defesa) {
    const multa = d.multas.find((m) => m.id === defesa.multa_id)!;
    defesa.documentos_pendentes = (await faltantes(d, defesa, multa)).map((t) => DOCS[t].rotulo);
  }
  audit(u.id, "documento_excluido", `documento:${id}`, a.tipo);
  await save();
  return NextResponse.json({ ok: true });
}
