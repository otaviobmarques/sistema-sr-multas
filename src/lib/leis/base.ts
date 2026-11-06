/**
 * Acesso à base de leis (Supabase: tabelas normas / normas_trechos), sempre pelo servidor.
 */
import { rpcServidor, supabaseAtivo } from "../db";

export type TrechoBase = {
  id: string;
  norma_id: string;
  urn?: string;
  rotulo: string;
  nivel: string;
  artigo?: string;
  texto: string;
  contexto: string | null;
  nota?: string | null;
  revogado: boolean;
  hash: string;
  fonte_oficial_url: string | null;
  origem: string; // ctresb/leis | curadoria | jurisprudencia
  repo_commit?: string | null;
  validada_em?: string | null;
  sincronizado_em?: string;
};

export type NormaResumo = {
  id: string;
  sigla: string;
  titulo: string;
  tipo: string;
  data: string | null;
  origem: string;
  repo_path: string | null;
  repo_commit: string | null;
  git_sha: string | null;
  trechos: number;
  revogada: boolean | null;
  fonte_oficial_url: string | null;
  versao_texto: string | null;
  validada_por: string | null;
  validada_em: string | null;
  sincronizada_em: string;
};

/** Uma fonte só pode ser citada se não estiver revogada e, se for de curadoria, se já foi validada pelo especialista. */
export function citavel(t: Pick<TrechoBase, "revogado" | "origem" | "validada_em">): { ok: boolean; motivo?: string } {
  if (t.revogado) return { ok: false, motivo: t.origem === "jurisprudencia" ? "Precedente revogado, cancelado ou sem tese definitiva" : "Dispositivo revogado ou vetado no texto vigente" };
  if (t.origem === "curadoria" && !t.validada_em) return { ok: false, motivo: "Fonte de curadoria aguardando validação do especialista" };
  return { ok: true };
}

export async function obterTrechos(ids: string[]): Promise<TrechoBase[]> {
  if (!ids.length || !supabaseAtivo()) return [];
  return rpcServidor<TrechoBase[]>("sm_normas_obter", { p_ids: [...new Set(ids)] });
}

export async function buscarTrechos(consulta: string, limite = 8, normas?: string[]): Promise<TrechoBase[]> {
  if (!consulta.trim() || !supabaseAtivo()) return [];
  return rpcServidor<TrechoBase[]>("sm_normas_buscar", { p_consulta: consulta, p_limite: limite, p_normas: normas ?? null });
}

export async function listarNormas(): Promise<NormaResumo[]> {
  if (!supabaseAtivo()) return [];
  return rpcServidor<NormaResumo[]>("sm_normas_lista", {});
}

export async function trechosDaNorma(normaId: string) {
  if (!supabaseAtivo()) return [];
  return rpcServidor<{ id: string; rotulo: string; nivel: string; texto: string; nota: string | null; revogado: boolean; hash: string }[]>("sm_normas_trechos", { p_norma_id: normaId });
}

export async function validarNorma(normaId: string, por: string) {
  await rpcServidor("sm_normas_validar", { p_norma_id: normaId, p_por: por });
}
