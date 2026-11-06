import { NextResponse } from "next/server";
import { extrair } from "@/lib/ai/extractor";
import { multaDeExtracao, registrarMulta } from "@/lib/servico";
import { naoAutorizado, usuarioAtual } from "@/lib/session";
import { db, save, uid } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 90;
const TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/** Link de compartilhamento do Google Drive → arquivo. Só aceita domínios do Google (nada de URLs arbitrárias). */
async function baixarDoDrive(link: string): Promise<{ base64: string; mime: string; nome: string; tamanho: number } | { erro: string }> {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return { erro: "Link inválido. Cole o link de compartilhamento do Google Drive." };
  }
  if (!["drive.google.com", "docs.google.com"].includes(url.hostname)) return { erro: "Por enquanto aceitamos apenas links do Google Drive." };
  const id = url.pathname.match(/\/d\/([\w-]{10,})/)?.[1] ?? url.searchParams.get("id");
  if (!id || !/^[\w-]+$/.test(id)) return { erro: "Não encontrei o arquivo neste link. No Drive, use Compartilhar → Copiar link." };
  const r = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`, { redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(30_000) }).catch(() => null);
  if (!r || !r.ok) return { erro: "Não consegui baixar o arquivo. Confira se o compartilhamento está como “Qualquer pessoa com o link”." };
  const mime = (r.headers.get("content-type") ?? "").split(";")[0].trim();
  if (mime.startsWith("text/html")) return { erro: "O arquivo está privado. No Drive, em Compartilhar, mude o acesso geral para “Qualquer pessoa com o link” e tente de novo." };
  const buf = Buffer.from(await r.arrayBuffer());
  const nome = decodeURIComponent(r.headers.get("content-disposition")?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i)?.[1] ?? "notificacao-drive");
  return { base64: buf.toString("base64"), mime, nome, tamanho: buf.length };
}

/** Etapas 1–5: recebe a notificação, extrai (IA), classifica escopo, audita por regras e estima. */
export async function POST(req: Request) {
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  const form = await req.formData();
  const file = form.get("arquivo");
  const link = form.get("link");
  let arquivo: { base64: string; mime: string; nome: string };
  if (typeof link === "string" && link.trim()) {
    const d = await baixarDoDrive(link);
    if ("erro" in d) return NextResponse.json({ erro: d.erro }, { status: 400 });
    if (!TIPOS.includes(d.mime)) return NextResponse.json({ erro: "O arquivo do link precisa ser PDF, JPG, PNG ou WEBP" }, { status: 400 });
    // limites da leitura por IA: PDF até 30 MB; imagem até 5 MB
    if (d.mime === "application/pdf" ? d.tamanho > 30 * 1024 * 1024 : d.tamanho > 5 * 1024 * 1024) return NextResponse.json({ erro: d.mime === "application/pdf" ? "PDF acima de 30 MB" : "Imagem acima de 5 MB: envie pela câmera do app" }, { status: 400 });
    arquivo = d;
  } else {
    if (!(file instanceof File)) return NextResponse.json({ erro: "Envie a foto ou PDF da notificação" }, { status: 400 });
    if (!TIPOS.includes(file.type)) return NextResponse.json({ erro: "Formato aceito: PDF, JPG, PNG ou WEBP" }, { status: 400 });
    if (file.size > 15 * 1024 * 1024) return NextResponse.json({ erro: "Arquivo acima de 15 MB" }, { status: 400 });
    arquivo = { base64: Buffer.from(await file.arrayBuffer()).toString("base64"), mime: file.type, nome: file.name };
  }

  try {
    const { dados, modo } = await extrair(arquivo);
    if (!dados.qualidade_foto.ok) {
      // Foto ruim: nada é registrado e nenhum crédito é usado — o cliente refaz a foto.
      return NextResponse.json({ erro: "Não consegui ler bem a notificação", problema: dados.qualidade_foto.problema, orientacao: dados.qualidade_foto.orientacao }, { status: 422 });
    }
    const multa = multaDeExtracao(dados, u.id, arquivo.nome);
    if (dados.instrucoes_suspeitas) {
      db().trava.unshift({ id: uid("tr"), defesa_id: "-", caso: `#${multa.id.slice(-4)}`, acao: "anexo_sinalizado", motivo: "Texto oculto tratado como dado", data: new Date().toISOString() });
      await save();
    }
    if (!dados.legivel) multa.confianca.legibilidade = 0.3;
    const defesa = await registrarMulta(multa);
    return NextResponse.json({ defesa_id: defesa.id, modo });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
