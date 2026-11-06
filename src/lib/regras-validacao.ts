import { createHash } from "crypto";
import { db } from "./db";
import { REGRAS } from "./rules";
import { obterTrechos, type TrechoBase } from "./leis/base";

/** Hash dos dispositivos legais de uma regra: se a lei mudar, a assinatura do especialista deixa de valer. */
export function hashFontesRegra(codigo: string, versao: string, trechos: Pick<TrechoBase, "id" | "hash">[]) {
  const base = [codigo, versao, ...trechos.map((t) => `${t.id}:${t.hash}`).sort()].join("|");
  return createHash("sha256").update(base).digest("hex").slice(0, 16);
}

export type SituacaoRegra = {
  codigo: string;
  titulo: string;
  logica: string;
  versao: string;
  normas: string[];
  trechos: TrechoBase[];
  hash: string;
  assinatura: ReturnType<typeof db>["validacoes_regras"][number] | null;
  status: "assinada" | "revisar" | "pendente";
};

export async function situacaoDasRegras(): Promise<SituacaoRegra[]> {
  const todos = await obterTrechos(REGRAS.flatMap((r) => r.normas));
  const porId = new Map(todos.map((t) => [t.id, t]));
  return REGRAS.map((r) => {
    const trechos = r.normas.map((id) => porId.get(id)).filter(Boolean) as TrechoBase[];
    const hash = hashFontesRegra(r.codigo, r.versao, trechos);
    const assinaturas = db().validacoes_regras.filter((v) => v.codigo === r.codigo).sort((a, b) => b.data.localeCompare(a.data));
    const vigente = assinaturas.find((v) => v.versao === r.versao) ?? null;
    const status = vigente && vigente.hash_fontes === hash ? "assinada" : vigente || assinaturas.length ? "revisar" : "pendente";
    return { codigo: r.codigo, titulo: r.titulo, logica: r.logica, versao: r.versao, normas: r.normas, trechos, hash, assinatura: vigente ?? assinaturas[0] ?? null, status };
  });
}

/** Conjunto de regras com assinatura válida (usado quando SM_EXIGIR_REGRAS_ASSINADAS=1). */
export async function regrasAssinadas(): Promise<Set<string>> {
  return new Set((await situacaoDasRegras()).filter((r) => r.status === "assinada").map((r) => r.codigo));
}
