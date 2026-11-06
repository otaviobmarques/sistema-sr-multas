import { NextResponse } from "next/server";
import { audit, db, save } from "@/lib/db";
import { DOCS, faltantes, gravarArquivo, idsDaCadeia, listarArquivos, TAMANHO_MAX, tipoReal, TIPOS_ACEITOS, type TipoDoc } from "@/lib/documentos";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

export const runtime = "nodejs";

async function contexto(id: string) {
  const u = await usuarioAtual(true);
  if (!u) return { erro: naoAutorizado() } as const;
  const d = db();
  const defesa = d.defesas.find((x) => x.id === id && x.dono_id === u.id);
  if (!defesa) return { erro: NextResponse.json({ erro: "Defesa não encontrada" }, { status: 404 }) } as const;
  return { u, d, defesa, multa: d.multas.find((m) => m.id === defesa.multa_id)! } as const;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await contexto((await params).id);
  if ("erro" in c) return c.erro;
  const arquivos = await listarArquivos(idsDaCadeia(c.d, c.defesa));
  return NextResponse.json({ arquivos: arquivos.map(({ id, tipo, nome, mime, tamanho, criado_em }) => ({ id, tipo, nome, mime, tamanho, criado_em })), faltam: await faltantes(c.d, c.defesa, c.multa) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await contexto((await params).id);
  if ("erro" in c) return c.erro;
  const form = await req.formData();
  const file = form.get("arquivo");
  const tipo = String(form.get("tipo") ?? "") as TipoDoc;
  if (!(tipo in DOCS)) return NextResponse.json({ erro: "Tipo de documento inválido" }, { status: 400 });
  if (!(file instanceof File) || !file.size) return NextResponse.json({ erro: "Selecione o arquivo" }, { status: 400 });
  if (file.size > TAMANHO_MAX) return NextResponse.json({ erro: "Arquivo acima de 4 MB. Envie uma foto ou um PDF menor." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const real = tipoReal(bytes);
  if (!real || !TIPOS_ACEITOS.includes(real)) return NextResponse.json({ erro: "Formato aceito: PDF, JPG, PNG ou WEBP" }, { status: 400 });
  const existentes = await listarArquivos(idsDaCadeia(c.d, c.defesa));
  if (existentes.length >= 12) return NextResponse.json({ erro: "Limite de 12 arquivos por multa" }, { status: 400 });
  await gravarArquivo({ dono_id: c.u.id, defesa_id: c.defesa.id, tipo, nome: file.name || `${tipo}.${real.split("/")[1]}`, mime: real, bytes });
  // tira a defesa de "aguardando documentos" quando nada mais falta
  const faltam = await faltantes(c.d, c.defesa, c.multa);
  c.defesa.documentos_pendentes = faltam.map((t) => DOCS[t].rotulo);
  if (!faltam.length && c.defesa.status === "aguardando_documentos") c.defesa.status = c.defesa.versoes.length ? "aguardando_validacao" : "em_analise";
  audit(c.u.id, "documento_enviado", `defesa:${c.defesa.id}`, `${tipo} · ${(bytes.length / 1024).toFixed(0)} KB`);
  await save();
  return NextResponse.json({ ok: true, faltam });
}
