/**
 * Leitor das normas no formato do repositório ctresb/leis:
 * um arquivo Markdown por norma, cabeçalho YAML e dispositivos marcados
 * (**Art. 1º**, **§ 1º**, **Parágrafo único.**, "I - ...", "a) ...").
 * Gera a norma e seus trechos (artigo, caput, parágrafo, inciso, alínea), cada um com URN e hash.
 * Sem dependências: usado pelo script de importação e pela sincronização diária.
 */
import { createHash } from "crypto";

export type NormaLei = {
  id: string;
  urn: string;
  sigla: string;
  titulo: string;
  tipo: string;
  numero: string | null;
  data: string | null;
  ementa: string | null;
  fonte_oficial_url: string | null;
  versao_texto: string | null;
  origem: "ctresb/leis" | "curadoria";
  repo_path: string | null;
  repo_commit: string | null;
  git_sha: string | null;
  baixado_em: string | null;
  trechos: number;
  revogada: boolean | null;
};

export type TrechoLei = {
  id: string;
  norma_id: string;
  urn: string;
  rotulo: string;
  nivel: "artigo" | "caput" | "paragrafo" | "inciso" | "alinea";
  artigo: string;
  texto: string;
  contexto: string | null;
  nota: string | null;
  revogado: boolean;
  ordem: number;
  hash: string;
};

export const normalizar = (t: string) => t.normalize("NFC").replace(/\s+/g, " ").trim();
export const hashTexto = (t: string) => createHash("sha256").update(normalizar(t)).digest("hex").slice(0, 16);

function frontMatter(md: string): { meta: Record<string, string>; corpo: string } {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, corpo: md };
  const meta: Record<string, string> = {};
  for (const linha of m[1].split("\n")) {
    const kv = linha.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].replace(/^"(.*)"$/, "$1").replace(/\\"/g, '"').trim();
  }
  return { meta, corpo: md.slice(m[0].length) };
}

/** Remove marcação Markdown e separa as notas de redação em itálico, ex.: *(Inciso com redação dada pela Lei ...)* */
function limpar(linha: string): { texto: string; nota: string | null } {
  const notas: string[] = [];
  let t = linha.replace(/\*\((.*?)\)\*/g, (_, n) => {
    notas.push(String(n).replace(/\*/g, "").trim());
    return "";
  });
  t = t.replace(/\*\*/g, "").replace(/(^|\s)\*([^*]+)\*/g, "$1$2").replace(/\\([.\-*_()[\]#])/g, "$1");
  return { texto: normalizar(t), nota: notas.length ? notas.join(" | ") : null };
}

const ROMANOS: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
function romano(r: string) {
  let n = 0;
  for (let i = 0; i < r.length; i++) {
    const v = ROMANOS[r[i]], prox = ROMANOS[r[i + 1]] ?? 0;
    n += v < prox ? -v : v;
  }
  return n;
}

const RE_ART = /^\*\*\s*Art\.\s*(\d+)\s*[º°o]?\s*(?:-\s*([A-Z]))?\s*\.?\s*\*\*\s*\.?\s*(.*)$/;
const RE_PAR = /^\*\*\s*§\s*(\d+)\s*[º°o]?\s*\.?\s*\*\*\s*\.?\s*(.*)$/;
const RE_PARU = /^\*\*\s*Parágrafo\s+único\s*\.?\s*\*\*\s*\.?\s*(.*)$/i;
const RE_INC = /^([IVXLC]+)\s*[-–—]\s+(.*)$/;
const RE_ALI = /^([a-z])\)\s+(.*)$/;

export function identificarNorma(meta: Record<string, string>, path: string): Pick<NormaLei, "id" | "sigla" | "urn" | "tipo" | "numero" | "data"> {
  const numero = meta.numero || null;
  const data = meta.data || null;
  const ano = data?.slice(0, 4) ?? "";
  if (path.includes("lei-9503-1997"))
    return { id: "ctb", sigla: "CTB (Lei 9.503/1997)", urn: meta.urn || "urn:lex:br:federal:lei:1997-09-23;9503", tipo: "Lei Ordinária", numero, data };
  if (path.includes("/contran/")) {
    const del = path.includes("/deliberacoes/");
    return {
      id: `contran-${del ? "del" : "res"}-${numero}-${ano}`,
      sigla: `${del ? "Deliberação" : "Res."} CONTRAN ${numero}/${ano}`,
      urn: meta.urn || `urn:lex:br:conselho.nacional.transito:${del ? "deliberacao" : "resolucao"}:${data};${numero}`,
      tipo: del ? "Deliberação" : "Resolução",
      numero,
      data,
    };
  }
  const slug = path.split("/").pop()!.replace(/\.md$/, "");
  return { id: slug, sigla: meta.titulo || slug, urn: meta.urn || `urn:sm:${slug}`, tipo: meta.tipo || "Norma", numero, data };
}

export function lerNorma(md: string, opts: { path: string; commit?: string | null; gitSha?: string | null }): { norma: NormaLei; trechos: TrechoLei[] } {
  const { meta, corpo } = frontMatter(md);
  const ident = identificarNorma(meta, opts.path);
  const trechos: TrechoLei[] = [];
  let ordem = 0;

  type Art = { num: string; slug: string; partes: string[] };
  let art: Art | null = null;
  let pai: { id: string; texto: string; rot: string; urn: string } | null = null; // caput ou §
  let incisoAtual: { id: string; texto: string; rot: string; urn: string } | null = null;
  let ultimo: TrechoLei | null = null;

  const fecharArtigo = () => {
    if (!art) return;
    const texto = art.partes.join(" ");
    trechos.push({
      id: `${ident.id}-art${art.slug}`,
      norma_id: ident.id,
      urn: `${ident.urn}!art${art.slug}`,
      rotulo: `${ident.sigla}, art. ${art.num}`,
      nivel: "artigo",
      artigo: art.num,
      texto,
      contexto: null,
      nota: null,
      revogado: /^\(?(revogad|vetad)/i.test(texto.replace(/^Art\.[^ ]+ /, "")),
      ordem: ordem++,
      hash: hashTexto(texto),
    });
  };

  const add = (t: Omit<TrechoLei, "norma_id" | "ordem" | "hash" | "revogado">) => {
    const revogado = /^\(?\s*(revogad[oa]|vetad[oa])/i.test(t.texto) || /^\(VETADO\)$/i.test(t.texto);
    const tr: TrechoLei = { ...t, norma_id: ident.id, ordem: ordem++, revogado, hash: hashTexto(t.texto) };
    trechos.push(tr);
    art?.partes.push(`${t.rotulo.split(", ").slice(2).join(", ") || "caput"}: ${t.texto}`);
    ultimo = tr;
    return tr;
  };

  for (const bruta of corpo.split("\n")) {
    const linha = bruta.trim();
    if (!linha) continue;
    if (linha.startsWith("#")) {
      if (/ANEXO/i.test(linha)) {
        fecharArtigo();
        art = null;
        pai = incisoAtual = ultimo = null;
      }
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = linha.match(RE_ART))) {
      fecharArtigo();
      const num = m[2] ? `${m[1]}-${m[2]}` : m[1];
      const numRot = m[2] ? `${m[1]}-${m[2]}` : Number(m[1]) < 10 ? `${m[1]}º` : m[1];
      art = { num: numRot, slug: m[2] ? `${m[1]}${m[2].toLowerCase()}` : m[1], partes: [] };
      const { texto, nota } = limpar(m[3]);
      const base = `${ident.sigla}, art. ${numRot}`;
      const cpt = add({ id: `${ident.id}-art${art.slug}-cpt`, urn: `${ident.urn}!art${art.slug}_cpt`, rotulo: base, nivel: "caput", artigo: numRot, texto: texto || "(caput)", contexto: null, nota });
      void num;
      pai = { id: cpt.id, texto: cpt.texto, rot: base, urn: `${ident.urn}!art${art.slug}` };
      incisoAtual = null;
      continue;
    }
    if (!art) continue;
    if ((m = linha.match(RE_PAR)) || (m = linha.match(RE_PARU))) {
      const unico = m.length === 2;
      const n = unico ? "1u" : m[1];
      const rot = unico ? "parágrafo único" : `§ ${Number(m[1]) < 10 ? `${m[1]}º` : m[1]}`;
      const { texto, nota } = limpar(unico ? m[1] : m[2]);
      const caputTexto = trechos.find((t) => t.id === `${ident.id}-art${art!.slug}-cpt`)?.texto ?? null;
      const p = add({ id: `${ident.id}-art${art.slug}-par${n}`, urn: `${ident.urn}!art${art.slug}_par${n}`, rotulo: `${ident.sigla}, art. ${art.num}, ${rot}`, nivel: "paragrafo", artigo: art.num, texto, contexto: caputTexto, nota });
      pai = { id: p.id, texto: p.texto, rot: p.rotulo, urn: p.urn };
      incisoAtual = null;
      continue;
    }
    if ((m = linha.match(RE_INC)) && pai) {
      const n = romano(m[1]);
      const { texto, nota } = limpar(m[2]);
      const base = pai.id.endsWith("-cpt") ? pai.id.replace(/-cpt$/, "") : pai.id;
      const urnBase = pai.urn;
      const i = add({ id: `${base}-inc${n}`, urn: `${urnBase}_inc${n}`, rotulo: `${pai.rot}, ${m[1]}`, nivel: "inciso", artigo: art.num, texto, contexto: pai.texto, nota });
      incisoAtual = { id: i.id, texto: i.texto, rot: i.rotulo, urn: i.urn };
      continue;
    }
    if ((m = linha.match(RE_ALI)) && incisoAtual) {
      const n = m[1].charCodeAt(0) - 96;
      const { texto, nota } = limpar(m[2]);
      add({ id: `${incisoAtual.id}-ali${n}`, urn: `${incisoAtual.urn}_ali${n}`, rotulo: `${incisoAtual.rot}, ${m[1]}`, nivel: "alinea", artigo: art.num, texto, contexto: incisoAtual.texto, nota });
      continue;
    }
    // Linha de continuação (ex.: "Infração - média;", "Penalidade - multa;"): agrega ao último dispositivo.
    const u = ultimo as TrechoLei | null;
    if (u) {
      const { texto, nota } = limpar(linha);
      if (texto) {
        u.texto = normalizar(`${u.texto} ${texto}`);
        u.hash = hashTexto(u.texto);
        if (nota) u.nota = u.nota ? `${u.nota} | ${nota}` : nota;
        if (art) art.partes[art.partes.length - 1] += ` ${texto}`;
      }
    }
  }
  fecharArtigo();

  // IDs únicos (artigos repetidos em anexos ou erros de conversão)
  const vistos = new Map<string, number>();
  for (const t of trechos) {
    const n = vistos.get(t.id) ?? 0;
    vistos.set(t.id, n + 1);
    if (n) t.id = `${t.id}~${n + 1}`;
  }

  const norma: NormaLei = {
    ...ident,
    titulo: meta.titulo || ident.sigla,
    ementa: meta.ementa || null,
    fonte_oficial_url: meta.fonte || null,
    versao_texto: meta.versao_texto || null,
    origem: "ctresb/leis",
    repo_path: opts.path,
    repo_commit: opts.commit ?? null,
    git_sha: opts.gitSha ?? null,
    baixado_em: meta.baixado_em || null,
    trechos: trechos.length,
    revogada: meta.revogada === "true" ? true : meta.revogada === "false" ? false : null,
  };
  return { norma, trechos };
}
