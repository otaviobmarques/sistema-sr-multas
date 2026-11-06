import { NextResponse } from "next/server";
import { audit, db, save } from "@/lib/db";
import { usuarioAtual } from "@/lib/session";

/** Etapa 13: registra o comprovante de protocolo (online ou guiado). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioAtual();
  const d = db();
  const defesa = d.defesas.find((x) => x.id === id && x.dono_id === u.id);
  if (!defesa || defesa.status !== "pronta_para_protocolar") return NextResponse.json({ erro: "Defesa ainda não assinada" }, { status: 400 });
  const { protocolo } = (await req.json()) as { protocolo: string };
  if (!protocolo?.trim()) return NextResponse.json({ erro: "Informe o número do protocolo" }, { status: 400 });
  defesa.protocolo = protocolo.trim();
  defesa.status = "protocolada";
  audit(u.id, "protocolo_registrado", `defesa:${defesa.id}`, protocolo);
  save();
  return NextResponse.json({ ok: true });
}
