/**
 * Protocolo Senhor Multas: número sequencial por ano + impressão digital (SHA-256) da peça assinada.
 * Qualquer pessoa confere a autenticidade em /verificar/{protocolo}.
 */
import { createHash } from "crypto";
import QRCode from "qrcode";
import { db } from "./db";
import { urlBase } from "./email";
import { montarPeca } from "./peca-formato";
import type { Defesa, Multa, Usuario } from "./types";

const limpar = (t: string) => t.replace(/\[\[fato:([^\]]+)\]\]/g, "$1").replace(/\[\[fonte:([^|\]]+)\|([^\]]+)\]\]/g, "$2");

/** Texto canônico da peça (o que é assinado). */
export function textoCanonico(defesa: Defesa, multa: Multa, cliente: Pick<Usuario, "nome" | "cpf_cnpj">) {
  const v = defesa.versoes.at(-1)!;
  const b = montarPeca({ conteudo: v.conteudo, citacoes: v.citacoes, multa, defesa: { ...defesa, assinada_em: null, protocolo_sm: null }, versao: v, cliente });
  return [
    ...b.enderecamento,
    ...b.referencias.map(([k, x]) => `${k}: ${x}`),
    limpar(b.qualificacao),
    b.titulo,
    b.abertura,
    ...b.secoes.flatMap((s) => [s.titulo, ...s.paragrafos.map(limpar)]),
    ...b.pedidos,
    b.fechamento,
    ...b.fundamentos,
  ].join("\n");
}

export const hashTexto = (t: string) => createHash("sha256").update(t.normalize("NFC")).digest("hex");

/** Próximo número: SM-AAAA-000001 (contador guardado em config). */
export function proximoProtocolo(): string {
  const ano = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 4);
  const lista = db().config as unknown as { id: string; ano?: string; seq?: number }[];
  let c = lista.find((x) => x.id === "protocolo");
  if (!c) lista.push((c = { id: "protocolo", ano, seq: 0 }));
  if (c.ano !== ano) Object.assign(c, { ano, seq: 0 });
  // garante unicidade mesmo se o contador estiver atrás
  const usados = new Set(db().defesas.map((d) => d.protocolo_sm).filter(Boolean));
  let n: string;
  do {
    c.seq = (c.seq ?? 0) + 1;
    n = `SM-${ano}-${String(c.seq).padStart(6, "0")}`;
  } while (usados.has(n));
  return n;
}

export const urlVerificacao = (protocolo: string) => `${urlBase()}/verificar/${protocolo}`;

export async function qrSvg(protocolo: string) {
  return QRCode.toString(urlVerificacao(protocolo), { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#13294b", light: "#ffffff" } });
}
export async function qrPng(protocolo: string) {
  return QRCode.toBuffer(urlVerificacao(protocolo), { type: "png", margin: 1, width: 240, errorCorrectionLevel: "M", color: { dark: "#13294b", light: "#ffffff" } });
}

/** "Marina Souza Lima" → "M. S. L." (página pública de verificação não mostra o nome). */
export const iniciais = (nome: string) => nome.trim().split(/\s+/).filter((p) => p.length > 2).map((p) => `${p[0].toUpperCase()}.`).join(" ");
