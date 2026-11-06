/**
 * Prepara a foto tirada pelo celular antes do envio (roda no navegador):
 * corrige a orientação (EXIF), reduz para no máximo 2000px e converte para JPEG.
 * Fotos de câmera costumam ter 5–12 MB; a API de visão aceita até ~5 MB por imagem.
 */
/** Limite seguro de envio (a hospedagem recusa acima de ~4,5 MB). */
export const LIMITE_ENVIO = 4_200_000;

/**
 * PDF grande (escaneado): renderiza cada página no navegador e remonta um PDF leve só com imagens JPEG.
 * O conteúdo visual é o mesmo; a leitura pela IA não muda. PDFs já pequenos seguem como estão.
 */
export type Progresso = { fase: "pdf" | "foto"; pagina?: number; total?: number; tentativa?: number };

async function reduzirPdf(file: File, aviso?: (p: Progresso) => void): Promise<File> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const { PDFDocument } = await import("pdf-lib");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const paginas = Math.min(doc.numPages, 6);
  // tenta qualidade alta e reduz se ainda passar do limite
  let tentativa = 0;
  for (const [larg, qual] of [[1700, 0.8], [1400, 0.7], [1100, 0.6]] as const) {
    tentativa++;
    const novo = await PDFDocument.create();
    for (let i = 1; i <= paginas; i++) {
      aviso?.({ fase: "pdf", pagina: i, total: paginas, tentativa });
      const pag = await doc.getPage(i);
      const base = pag.getViewport({ scale: 1 });
      // largura alvo `larg` px, sem passar de 1,45× isso na altura (A4 em pé ≈ 1,41)
      const vp = pag.getViewport({ scale: Math.min(larg / base.width, (larg * 1.45) / base.height) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await pag.render({ canvasContext: ctx, viewport: vp }).promise;
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", qual));
      if (!blob) throw new Error("falha ao converter página");
      const img = await novo.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      novo.addPage([base.width, base.height]).drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
    }
    const bytes = await novo.save();
    if (bytes.length <= LIMITE_ENVIO) return new File([bytes as unknown as BlobPart], file.name.replace(/\.pdf$/i, "") + "-reduzido.pdf", { type: "application/pdf" });
  }
  return file;
}

export async function prepararArquivo(file: File, aviso?: (p: Progresso) => void): Promise<File> {
  if (file.type === "application/pdf") {
    if (file.size <= LIMITE_ENVIO) return file;
    try {
      return await reduzirPdf(file, aviso);
    } catch {
      return file;
    }
  }
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const MAX = 2000;
    const escala = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    if (escala === 1 && file.size < 3_500_000 && file.type !== "image/heic") return file;
    aviso?.({ fase: "foto" });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
