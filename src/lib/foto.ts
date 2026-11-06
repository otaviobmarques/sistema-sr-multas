/**
 * Prepara a foto tirada pelo celular antes do envio (roda no navegador):
 * corrige a orientação (EXIF), reduz para no máximo 2000px e converte para JPEG.
 * Fotos de câmera costumam ter 5–12 MB; a API de visão aceita até ~5 MB por imagem.
 */
export async function prepararArquivo(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const MAX = 2000;
    const escala = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    if (escala === 1 && file.size < 3_500_000 && file.type !== "image/heic") return file;
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
