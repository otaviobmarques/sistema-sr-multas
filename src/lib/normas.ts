import { createHash } from "crypto";
import type { Fonte } from "./types";

export const sha = (t: string) => createHash("sha256").update(t.normalize("NFC")).digest("hex").slice(0, 16);

/**
 * AMOSTRA DE DEMONSTRAÇÃO da base de fontes.
 * Em produção, esta base é importada do repositório github.com/ctresb/leis
 * (scripts/importar-leis.ts), quebrada por artigo/parágrafo/inciso e conferida
 * com o texto oficial em normas.leg.br pela trava automática.
 *
 * IMPORTANTE (cap. 6 do descritivo): a lista final de regras e referências legais
 * deve ser montada e assinada por especialista em direito de trânsito.
 */
const base: Omit<Fonte, "hash" | "coletada_em" | "demonstracao">[] = [
  {
    id: "ctb-281-pu-ii",
    tipo: "norma",
    urn: "urn:lex:br:federal:lei:1997-09-23;9503!art281_par1u_inc2",
    rotulo: "CTB (Lei 9.503/1997), art. 281, parágrafo único, II",
    texto:
      "O auto de infração será arquivado e seu registro julgado insubsistente: [...] II - se, no prazo máximo de trinta dias, não for expedida a notificação da autuação.",
    fonte_oficial_url: "https://normas.leg.br/?urn=urn:lex:br:federal:lei:1997-09-23;9503",
    origem: "ctresb/leis",
    repo_commit: "demo",
  },
  {
    id: "ctb-280",
    tipo: "norma",
    urn: "urn:lex:br:federal:lei:1997-09-23;9503!art280",
    rotulo: "CTB (Lei 9.503/1997), art. 280",
    texto:
      "Ocorrendo infração prevista na legislação de trânsito, lavrar-se-á auto de infração, do qual constará: I - tipificação da infração; II - local, data e hora do cometimento da infração; III - caracteres da placa de identificação do veículo, sua marca e espécie, e outros elementos julgados necessários à sua identificação; [...] V - identificação do órgão ou entidade e da autoridade ou agente autuador ou equipamento que comprovar a infração.",
    fonte_oficial_url: "https://normas.leg.br/?urn=urn:lex:br:federal:lei:1997-09-23;9503",
    origem: "ctresb/leis",
    repo_commit: "demo",
  },
  {
    id: "ctb-281-pu-i",
    tipo: "norma",
    urn: "urn:lex:br:federal:lei:1997-09-23;9503!art281_par1u_inc1",
    rotulo: "CTB (Lei 9.503/1997), art. 281, parágrafo único, I",
    texto:
      "O auto de infração será arquivado e seu registro julgado insubsistente: I - se considerado inconsistente ou irregular;",
    fonte_oficial_url: "https://normas.leg.br/?urn=urn:lex:br:federal:lei:1997-09-23;9503",
    origem: "ctresb/leis",
    repo_commit: "demo",
  },
  {
    id: "contran-798-2020",
    tipo: "norma",
    urn: "urn:lex:br:conselho.nacional.transito:resolucao:2020;798",
    rotulo: "Resolução CONTRAN 798/2020 (medidores de velocidade)",
    texto:
      "Dispõe sobre requisitos técnicos mínimos para a fiscalização da velocidade de veículos automotores, elétricos, reboques e semirreboques, incluindo a verificação metrológica periódica dos medidores de velocidade. [trecho de demonstração — conferir redação oficial]",
    fonte_oficial_url: "https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes",
    origem: "curadoria própria",
  },
  {
    id: "dec-jari-mg-0412",
    tipo: "decisao_propria",
    urn: "sm:decisao:jari:der-mg:2026:0412",
    rotulo: "Decisão JARI/DER-MG nº 0412/2026 (base própria)",
    texto:
      "Recurso provido por ausência de comprovação de verificação metrológica do equipamento medidor de velocidade dentro do prazo de validade. [caso ilustrativo da base própria]",
    fonte_oficial_url: "https://senhormultas.com.br/base/decisoes/0412",
    origem: "base própria",
  },
];

export function fontesIniciais(): Fonte[] {
  const now = new Date().toISOString();
  return base.map((f) => ({ ...f, hash: sha(f.texto), coletada_em: now, demonstracao: true }));
}

/** Cópia "oficial" usada pela trava para conferência (em produção: fetch em fonte_oficial_url). */
export function textoOficial(f: Fonte): string | null {
  const original = base.find((b) => b.id === f.id);
  return original ? original.texto : null;
}
