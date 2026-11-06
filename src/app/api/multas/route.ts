import { NextResponse } from "next/server";
import { extrair } from "@/lib/ai/extractor";
import { multaDeExtracao, registrarMulta } from "@/lib/servico";
import { usuarioAtual } from "@/lib/session";
import { db, save, uid } from "@/lib/db";

export const runtime = "nodejs";
const TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/** Etapas 1–5: recebe a notificação, extrai (IA), classifica escopo, audita por regras e estima. */
export async function POST(req: Request) {
  const u = await usuarioAtual();
  const form = await req.formData();
  const file = form.get("arquivo");
  if (!(file instanceof File)) return NextResponse.json({ erro: "Envie a foto ou PDF da notificação" }, { status: 400 });
  if (!TIPOS.includes(file.type)) return NextResponse.json({ erro: "Formato aceito: PDF, JPG, PNG ou WEBP" }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ erro: "Arquivo acima de 15 MB" }, { status: 400 });

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const { dados, modo } = await extrair({ base64, mime: file.type, nome: file.name });
    const multa = multaDeExtracao(dados, u.id, file.name);
    if (dados.instrucoes_suspeitas) {
      db().trava.unshift({ id: uid("tr"), defesa_id: "-", caso: `#${multa.id.slice(-4)}`, acao: "anexo_sinalizado", motivo: "Texto oculto tratado como dado", data: new Date().toISOString() });
      save();
    }
    if (!dados.legivel) multa.confianca.legibilidade = 0.3;
    const defesa = registrarMulta(multa);
    return NextResponse.json({ defesa_id: defesa.id, modo });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
