/**
 * Jurisprudência de trânsito — SOMENTE precedentes reais, transcritos do repositório ctresb/leis
 * (pasta jurisprudencia/, que espelha o caderno de súmulas do STJ, os dados abertos de repetitivos do STJ
 * e o Banco Nacional de Precedentes do CNJ para o STF).
 *
 * Regras:
 *  - O texto citável é o enunciado/tese literal do arquivo (com hash); nada é escrito à mão aqui.
 *  - Entram apenas precedentes da lista JURIS abaixo (selecionados por pertinência à defesa administrativa).
 *  - Súmula revogada, tema cancelado/não julgado em definitivo → importado como "revogado" (não citável).
 *  - O pesquisador só entrega jurisprudência fora do modo conservador, e a trava confere hash e vigência.
 */
import { hashTexto, normalizar, type NormaLei, type TrechoLei } from "./parser.ts";

type Item = {
  id: string; // id do trecho citável
  arquivo: string; // caminho relativo à pasta jurisprudencia/ do ctresb/leis
  /** Regras do motor (R01…) cujo resultado "possível nulidade/não informado" justifica citar o precedente. */
  regras: string[];
  /** Situações do caso que justificam citar (além das regras). */
  quando?: ("recurso" | "indicacao_condutor")[];
};

export const JURIS: Item[] = [
  // Prazo de 30 dias para expedir a notificação da autuação → decadência (CTB, art. 281, parágrafo único, II)
  { id: "juris-stj-tema-105", arquivo: "stj/repetitivos/tema-105.md", regras: ["R01"] },
  // Dupla notificação (autuação e penalidade)
  { id: "juris-stj-sumula-312", arquivo: "stj/sumulas/sumula-312.md", regras: ["R01"], quando: ["recurso", "indicacao_condutor"] },
  // Multa por não indicação do condutor (PJ) também exige a dupla notificação
  { id: "juris-stj-tema-1097", arquivo: "stj/repetitivos/tema-1097.md", regras: [], quando: ["indicacao_condutor"] },
  // Base de consulta (não entram automaticamente na peça)
  { id: "juris-stj-sumula-127", arquivo: "stj/sumulas/sumula-127.md", regras: [] },
  { id: "juris-stj-sumula-434", arquivo: "stj/sumulas/sumula-434.md", regras: [] },
  { id: "juris-stf-rg-430", arquivo: "stf/repercussao-geral/tema-430.md", regras: [] },
];

function frontMatter(md: string) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta: Record<string, string> = {};
  for (const l of (m?.[1] ?? "").split("\n")) {
    const i = l.indexOf(":");
    if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
  }
  return { meta, corpo: m ? md.slice(m[0].length) : md };
}

/** Bloco de texto entre um título/rótulo e o próximo. */
function secao(corpo: string, inicio: RegExp, fim: RegExp) {
  const linhas = corpo.split("\n");
  const i = linhas.findIndex((l) => inicio.test(l.trim()));
  if (i < 0) return "";
  const out: string[] = [];
  for (const l of linhas.slice(i + 1)) {
    if (fim.test(l.trim())) break;
    out.push(l);
  }
  return normalizar(out.join(" "));
}

const ORGAO: Record<string, string> = { S1: "Primeira Seção", S2: "Segunda Seção", S3: "Terceira Seção", CE: "Corte Especial" };
const dataBR = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split("-").reverse().join("/") : null);

export type Precedente = { norma: NormaLei; trecho: TrechoLei; vigente: boolean; motivo?: string };

/** Lê um arquivo de jurisprudência do ctresb/leis e devolve norma + trecho citável (enunciado/tese literal). */
export function lerPrecedente(md: string, item: Pick<Item, "id" | "arquivo">, o: { commit: string | null; gitSha: string | null }): Precedente {
  const { meta, corpo } = frontMatter(md);
  const tribunal = meta.tribunal ?? "";
  const tipo = meta.tipo ?? "";
  const numero = meta.numero ?? "";
  let texto = "";
  let rotulo = "";
  let vigente = true;
  let motivo: string | undefined;

  if (/^Súmula$/i.test(tipo)) {
    texto = secao(corpo, /^Enunciado$/i, /^(Órgão Julgador|Data da Decisão|Fonte|Referências)/i) || secao(corpo, /^##\s*Questão/i, /^##/);
    rotulo = `Súmula nº ${numero} do ${tribunal}`;
    if (meta.revogada === "true") (vigente = false), (motivo = "Súmula revogada/cancelada");
  } else if (/repetitivo/i.test(tipo)) {
    texto = secao(corpo, /^###\s*teseFirmada$/i, /^###\s/);
    const orgao = ORGAO[secao(corpo, /^###\s*orgaoJulgador$/i, /^###\s/)] ?? null;
    const j = dataBR(meta.data);
    rotulo = `${tribunal}, Tema Repetitivo nº ${numero}${orgao || j ? ` (${[orgao, j ? `julgado em ${j}` : null].filter(Boolean).join(", ")})` : ""}`;
    if (!/trânsito em julgado|acórdão publicado/i.test(meta.situacao ?? "")) (vigente = false), (motivo = `Situação do tema: ${meta.situacao || "não informada"}`);
  } else if (/repercussão geral/i.test(tipo)) {
    texto = secao(corpo, /^##\s*Tese$/i, /^##\s/);
    rotulo = `${tribunal}, Tema nº ${numero} da Repercussão Geral`;
    if (/cancelad|sem repercussão|não há repercussão/i.test(meta.situacao ?? "")) (vigente = false), (motivo = `Situação do tema: ${meta.situacao}`);
  } else throw new Error(`Tipo de precedente não suportado: ${tipo} (${item.arquivo})`);

  if (!texto || /^não informado$/i.test(texto) || /aguardando a publicação/i.test(texto)) (vigente = false), (motivo = motivo ?? "Sem enunciado/tese definitiva no arquivo");

  const normaId = item.id.replace(/^juris-/, "");
  const urn = `urn:lex:br:${tribunal.toLowerCase()}:${tipo.toLowerCase().replace(/\s+/g, ".")}:${numero}`;
  const norma: NormaLei = {
    id: normaId,
    urn,
    sigla: rotulo,
    titulo: meta.titulo ?? rotulo,
    tipo: `Jurisprudência · ${tipo}`,
    numero,
    data: /^\d{4}-\d{2}-\d{2}$/.test(meta.data ?? "") ? meta.data : null,
    ementa: texto.slice(0, 400),
    fonte_oficial_url: meta.fonte ?? null,
    versao_texto: [meta.versao_texto, meta.situacao ? `situação: ${meta.situacao}` : null].filter(Boolean).join(" · ") || null,
    origem: "jurisprudencia",
    repo_path: `jurisprudencia/${item.arquivo}`,
    repo_commit: o.commit,
    git_sha: o.gitSha,
    baixado_em: meta.baixado_em ?? null,
    trechos: 1,
    revogada: !vigente,
  };
  const trecho: TrechoLei = {
    id: item.id,
    norma_id: normaId,
    urn: `${urn}!tese`,
    rotulo,
    nivel: "tese",
    artigo: "",
    texto,
    contexto: null,
    nota: motivo ?? null,
    revogado: !vigente,
    ordem: 0,
    hash: hashTexto(texto),
  };
  return { norma, trecho, vigente, motivo };
}

/** Quais precedentes da lista se aplicam ao caso (antes da trava). */
export function jurisprudenciaDoCaso(o: { regrasRelevantes: string[]; fase: string; enquadramento?: string | null; descricao?: string | null }): string[] {
  const nic = o.fase === "indicacao_condutor" || /indica\S*\s+(do\s+)?condutor|art\.?\s*257\s*,?\s*§\s*[78]/i.test(`${o.enquadramento ?? ""} ${o.descricao ?? ""}`);
  const recurso = o.fase === "jari" || o.fase === "cetran";
  return JURIS.filter(
    (j) => j.regras.some((r) => o.regrasRelevantes.includes(r)) || (j.quando ?? []).some((q) => (q === "recurso" ? recurso : nic)),
  ).map((j) => j.id);
}
