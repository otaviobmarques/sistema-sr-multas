/**
 * Estrutura formal da peça (padrão de petição administrativa) — fonte única para tela, PDF e DOCX.
 * Cabeçalhos e fundamentos de cabimento conferidos no texto vigente do CTB (base ctresb/leis):
 *   defesa prévia: art. 281-A · JARI: art. 285 · 2ª instância: arts. 288 e 289
 *   (penalidade de órgão da União → colegiado especial, art. 289, I; estadual/municipal → CETRAN; DF → CONTRANDIFE, art. 289, II).
 */
import type { Citacao, ConteudoPeca, Defesa, DefesaVersao, Multa, Usuario } from "./types";

export type BlocosPeca = {
  enderecamento: string[];
  referencias: [string, string][];
  qualificacao: string; // pode conter [[fato:...]]
  titulo: string;
  abertura: string;
  secoes: { titulo: string; paragrafos: string[] }[];
  pedidos: string[];
  fechamento: string;
  localData: string;
  assinatura: { nome: string; documento: string; carimbo: string | null };
  anexos: string[];
  fundamentos: string[];
  rodape: string;
};

const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export const dataExtenso = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const sp = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${sp.getDate()} de ${MESES[sp.getMonth()]} de ${sp.getFullYear()}`;
};
/** Datas sem fuso (ex.: "2026-09-02T08:47:00", vindas da notificação) já estão no horário local: não converter. */
const temFuso = (s: string) => /(Z|[+-]\d{2}:?\d{2})$/i.test(s);
const instante = (s: string) => (temFuso(s) ? { d: new Date(s), tz: "America/Sao_Paulo" } : { d: new Date(s.length === 10 ? `${s}T12:00:00Z` : `${s}Z`), tz: "UTC" });
export const dataBR = (s?: string | null) => (s ? (({ d, tz }) => d.toLocaleDateString("pt-BR", { timeZone: tz }))(instante(s)) : "—");
export const horaBR = (s: string) => (({ d, tz }) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz }))(instante(s));

/** UF a partir do órgão ("DER-MG", "DETRAN-SP") ou do local ("Itaúna/MG"). */
export function uf(m: Pick<Multa, "orgao" | "local">) {
  return m.orgao.match(/[-/\s]([A-Z]{2})\b/)?.[1] ?? m.local.match(/\/\s*([A-Z]{2})\b/)?.[1] ?? null;
}
const cidade = (m: Pick<Multa, "local">) => m.local.match(/(?:[,—–-]\s*)?([A-Za-zÀ-ÿ' .]+?)\s*\/\s*[A-Z]{2}\b/)?.[1]?.trim() ?? null;

export function tipoPeca(m: Pick<Multa, "fase" | "esfera" | "orgao" | "local">) {
  if (m.fase === "jari") return { titulo: "RECURSO À JARI", base: "no art. 285 do Código de Trânsito Brasileiro (Lei nº 9.503/1997)", nome: "o presente recurso" };
  if (m.fase === "cetran") {
    const federal = m.esfera === "federal";
    return { titulo: federal ? "RECURSO EM SEGUNDA INSTÂNCIA" : "RECURSO AO CETRAN", base: "nos arts. 288 e 289 do Código de Trânsito Brasileiro (Lei nº 9.503/1997)", nome: "o presente recurso" };
  }
  return { titulo: "DEFESA PRÉVIA", base: "no art. 281-A do Código de Trânsito Brasileiro (Lei nº 9.503/1997)", nome: "a presente defesa prévia" };
}

export function enderecamento(m: Pick<Multa, "fase" | "esfera" | "orgao" | "local">): string[] {
  const orgao = m.orgao.toUpperCase();
  const u = uf(m);
  if (m.fase === "jari") return ["ILUSTRÍSSIMO(A) SENHOR(A) PRESIDENTE DA JUNTA ADMINISTRATIVA", `DE RECURSOS DE INFRAÇÕES – JARI – ${orgao}`];
  if (m.fase === "cetran") {
    if (m.esfera === "federal") return ["AO COLEGIADO ESPECIAL DE JULGAMENTO DE RECURSOS EM SEGUNDA INSTÂNCIA", `${orgao} (CTB, art. 289, I)`];
    if (u === "DF") return ["AO EGRÉGIO CONSELHO DE TRÂNSITO DO DISTRITO FEDERAL – CONTRANDIFE"];
    return [`AO EGRÉGIO CONSELHO ESTADUAL DE TRÂNSITO${u ? ` DE ${u}` : ""} – CETRAN${u ? `/${u}` : ""}`];
  }
  return ["ILUSTRÍSSIMA AUTORIDADE DE TRÂNSITO", orgao];
}

/** Título da seção vindo da IA sem a numeração (o sistema numera). */
const semNumero = (t: string) => t.replace(/^\s*[IVXLC]+\s*[.–—-]\s*/i, "").trim().toUpperCase();

export function montarPeca(o: {
  conteudo: ConteudoPeca;
  citacoes: Citacao[];
  multa: Multa;
  defesa: Pick<Defesa, "assinada_em" | "protocolo_sm" | "fase">;
  versao: Pick<DefesaVersao, "versao">;
  cliente: Pick<Usuario, "nome" | "cpf_cnpj">;
  anexos?: { tipo: string; nome: string }[];
}): BlocosPeca {
  const { multa: m, cliente: c } = o;
  const t = tipoPeca(m);
  const qualidade = m.remetente?.situacao === "terceiro" ? "representante do(a) proprietário(a)" : "proprietário(a) e/ou condutor(a)";
  const doc = c.cpf_cnpj.replace(/\D/g, "").length === 14 ? "CNPJ" : "CPF";

  const fatos = o.conteudo.secoes.find((s) => /FATO/i.test(s.titulo));
  const demais = o.conteudo.secoes.filter((s) => s !== fatos);
  const secoes = [
    ...(fatos ? [{ titulo: "DOS FATOS", paragrafos: fatos.paragrafos }] : []),
    { titulo: "DA TEMPESTIVIDADE", paragrafos: [`${t.nome[0].toUpperCase()}${t.nome.slice(1)} é tempestiv${t.nome.startsWith("a ") ? "a" : "o"}, pois apresentad${t.nome.startsWith("a ") ? "a" : "o"} dentro do prazo indicado na notificação, que se encerra em [[fato:${dataBR(m.prazo)}]].`] },
    ...demais.map((s) => ({ titulo: semNumero(s.titulo), paragrafos: s.paragrafos })),
  ].map((s, i) => ({ titulo: `${ROMANOS[i] ?? i + 1} – ${s.titulo}`, paragrafos: s.paragrafos }));
  secoes.push({ titulo: `${ROMANOS[secoes.length]} – DOS PEDIDOS`, paragrafos: [] });

  const confirmadas = o.citacoes.filter((x) => x.status_trava === "confirmada");
  const anexos = [
    "Cópia da notificação recebida (facultativa — CTB, art. 285, § 4º)",
    ...(o.anexos ?? []).filter((a) => a.tipo !== "prova").map((a) => ({ cnh: "CNH do condutor", crlv: "CRLV do veículo", procuracao: "Procuração/autorização do(a) proprietário(a)" })[a.tipo as "cnh"] ?? a.nome),
    ...((o.anexos ?? []).some((a) => a.tipo === "prova") ? [`Provas complementares (${(o.anexos ?? []).filter((a) => a.tipo === "prova").length} arquivo(s))`] : []),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const cid = cidade(m);
  const quando = o.defesa.assinada_em ?? new Date().toISOString();
  return {
    enderecamento: enderecamento(m),
    referencias: [
      ["Auto de infração", m.numero_auto || "—"],
      ["Placa do veículo", m.placa],
      ["Órgão autuador", m.orgao],
      ["Data e hora da infração", `${dataBR(m.data_infracao)}, às ${horaBR(m.data_infracao)}`],
      ["Enquadramento", m.enquadramento || m.descricao],
      ...(o.defesa.protocolo_sm ? ([["Protocolo Senhor Multas", o.defesa.protocolo_sm]] as [string, string][]) : []),
    ],
    qualificacao: `[[fato:${c.nome.toUpperCase()}]], inscrito(a) no ${doc} sob o nº [[fato:${c.cpf_cnpj}]], na qualidade de ${qualidade} do veículo de placa [[fato:${m.placa}]], vem, respeitosamente, à presença de Vossa Senhoria, com fundamento ${t.base}, apresentar`,
    titulo: t.titulo,
    abertura: "pelos fatos e fundamentos a seguir expostos.",
    secoes,
    pedidos: o.conteudo.pedidos,
    fechamento: "Termos em que, pede deferimento.",
    localData: `${cid ? `${cid}, ` : ""}${dataExtenso(quando)}.`,
    assinatura: {
      nome: c.nome.toUpperCase(),
      documento: `${doc}: ${c.cpf_cnpj}`,
      carimbo: o.defesa.assinada_em ? `Assinado eletronicamente em ${dataBR(o.defesa.assinada_em)}, às ${horaBR(o.defesa.assinada_em)}${o.defesa.protocolo_sm ? ` · Protocolo ${o.defesa.protocolo_sm}` : ""}` : null,
    },
    anexos,
    fundamentos: confirmadas.map((x, i) => `Fonte ${i + 1}: ${x.rotulo}`),
    rodape: `${t.titulo} · Auto ${m.numero_auto || "—"} · Placa ${m.placa}${o.defesa.protocolo_sm ? ` · Protocolo ${o.defesa.protocolo_sm}` : ""} · versão ${o.versao.versao}`,
  };
}
