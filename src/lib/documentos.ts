/**
 * Documentos do cliente (cap. 3, etapa 7: "o sistema pede só o que falta").
 * Conteúdo cifrado (AES-256-GCM) e guardado fora do estado principal (tabela sm_arquivos).
 */
import { createHash } from "crypto";
import { rpcServidor, uid } from "./db";
import { cifrar, decifrar } from "./cripto";
import type { Defesa, Multa } from "./types";

export type TipoDoc = "cnh" | "crlv" | "procuracao" | "prova";
export const DOCS: Record<TipoDoc, { rotulo: string; ajuda: string }> = {
  cnh: { rotulo: "CNH do condutor", ajuda: "Frente e verso, ou o PDF da CNH Digital." },
  crlv: { rotulo: "CRLV do veículo", ajuda: "Documento do veículo (CRLV-e em PDF serve)." },
  procuracao: { rotulo: "Procuração ou autorização do proprietário", ajuda: "Necessária porque a notificação está em nome de outra pessoa." },
  prova: { rotulo: "Outras provas (opcional)", ajuda: "Fotos do local, sinalização, boletim de ocorrência, comprovantes." },
};
export const TIPOS_ACEITOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const TAMANHO_MAX = 4 * 1024 * 1024; // limite do corpo da requisição na Vercel (~4,5 MB)

export type ArquivoInfo = { id: string; dono_id: string; defesa_id: string; tipo: TipoDoc; nome: string; mime: string; tamanho: number; sha256: string; criado_em: string };

/** Documentos obrigatórios para esta defesa. */
export function obrigatorios(m: Pick<Multa, "remetente">): TipoDoc[] {
  return ["cnh", "crlv", ...(m.remetente?.situacao === "terceiro" ? (["procuracao"] as TipoDoc[]) : [])];
}

export async function listarArquivos(defesaIds: string[]): Promise<ArquivoInfo[]> {
  if (!defesaIds.length) return [];
  return rpcServidor<ArquivoInfo[]>("sm_arquivo_listar", { p_defesas: defesaIds });
}

/** Documentos valem para todas as fases da mesma multa (defesa prévia → JARI → CETRAN). */
export function idsDaCadeia(d: { defesas: Defesa[] }, defesa: Defesa): string[] {
  return d.defesas.filter((x) => x.multa_id === defesa.multa_id).map((x) => x.id);
}

export async function faltantes(d: { defesas: Defesa[] }, defesa: Defesa, multa: Multa): Promise<TipoDoc[]> {
  const enviados = new Set((await listarArquivos(idsDaCadeia(d, defesa))).map((a) => a.tipo));
  return obrigatorios(multa).filter((t) => !enviados.has(t));
}

export async function gravarArquivo(a: { dono_id: string; defesa_id: string; tipo: TipoDoc; nome: string; mime: string; bytes: Buffer }) {
  const id = uid("doc");
  await rpcServidor("sm_arquivo_gravar", {
    p_arquivo: {
      id,
      dono_id: a.dono_id,
      defesa_id: a.defesa_id,
      tipo: a.tipo,
      nome: a.nome.replace(/[^\p{L}\p{N} ._()-]/gu, "_").slice(0, 120),
      mime: a.mime,
      tamanho: a.bytes.length,
      sha256: createHash("sha256").update(a.bytes).digest("hex"),
      conteudo: cifrar(a.bytes.toString("base64")),
    },
  });
  return id;
}

export async function lerArquivo(id: string) {
  const [a] = await rpcServidor<(Omit<ArquivoInfo, "sha256" | "criado_em"> & { conteudo: string })[]>("sm_arquivo_obter", { p_id: id });
  if (!a) return null;
  const b64 = decifrar(a.conteudo);
  return b64 ? { ...a, bytes: Buffer.from(b64, "base64") } : null;
}

export const apagarArquivo = (id: string, dono: string | null) => rpcServidor<number>("sm_arquivo_apagar", { p_id: id, p_dono: dono });
export const apagarArquivosDoTitular = (dono: string) => rpcServidor<number>("sm_arquivo_apagar_titular", { p_dono: dono });

/** Confere a "assinatura" do arquivo (os primeiros bytes), para não aceitar um executável renomeado para .pdf. */
export function tipoReal(b: Buffer): string | null {
  if (b.subarray(0, 4).toString() === "%PDF") return "application/pdf";
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}
