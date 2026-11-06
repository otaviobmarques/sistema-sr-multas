/**
 * Sincronização diária com o ctresb/leis (cap. 6.2, item 4).
 * Detecta arquivos alterados pelo sha do Git, reimporta só o que mudou e, se um dispositivo usado
 * por alguma regra do motor mudar, registra alerta (a assinatura da regra deixa de valer).
 */
import { lerNorma } from "./parser.ts";
import { JURIS, lerPrecedente } from "./jurisprudencia.ts";
import { listarNormas, trechosDaNorma } from "./base";
import { audit, db, rpcServidor, save, uid } from "../db";
import { REGRAS } from "../rules";

const REPO = "ctresb/leis";
const CTB = "federal/leis-ordinarias/1997/lei-9503-1997-09-23.md";
const PASTAS = ["reguladores/contran/resolucoes", "reguladores/contran/deliberacoes"];

async function gh<T>(caminho: string): Promise<T> {
  const r = await fetch(`https://api.github.com/repos/${REPO}/${caminho}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "senhor-multas-sync", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`GitHub ${r.status} em ${caminho}`);
  return r.json() as Promise<T>;
}
type Item = { name: string; path: string; sha: string; type: "file" | "dir" };

export async function sincronizarLeis(opts: { limite?: number } = {}) {
  const limite = opts.limite ?? 40;
  const { sha: commit } = await gh<{ sha: string }>("commits/main");
  const ultimo = db().auditoria.find((a) => a.acao === "sync_leis")?.detalhe?.split(" ")[0];
  if (ultimo === commit) return { commit, mudancas: 0, mensagem: "Sem novidades no repositório" };

  // arquivos acompanhados e seus shas
  const arquivos: { path: string; sha: string }[] = [];
  const ctbDir = await gh<Item[]>(`contents/federal/leis-ordinarias/1997?ref=${commit}`);
  const ctb = ctbDir.find((i) => i.path === CTB);
  if (ctb) arquivos.push({ path: ctb.path, sha: ctb.sha });
  for (const pasta of PASTAS) {
    for (const ano of (await gh<Item[]>(`contents/${pasta}?ref=${commit}`)).filter((i) => i.type === "dir")) {
      for (const f of await gh<Item[]>(`contents/${ano.path}?ref=${commit}`)) if (f.type === "file" && f.name.endsWith(".md")) arquivos.push({ path: f.path, sha: f.sha });
    }
  }

  const atuais = new Map((await listarNormas()).filter((n) => n.repo_path).map((n) => [n.repo_path!, n]));
  const mudaram = arquivos.filter((a) => atuais.get(a.path)?.git_sha !== a.sha);
  const usadosPorRegra = new Map<string, string[]>();
  for (const r of REGRAS) for (const id of r.normas) usadosPorRegra.set(id, [...(usadosPorRegra.get(id) ?? []), r.codigo]);

  let processadas = 0;
  const alertas: string[] = [];
  for (const a of mudaram.slice(0, limite)) {
    const md = await (await fetch(`https://raw.githubusercontent.com/${REPO}/${commit}/${a.path}`, { cache: "no-store" })).text();
    const { norma, trechos } = lerNorma(md, { path: a.path, commit, gitSha: a.sha });
    const antes = atuais.get(a.path) ? new Map((await trechosDaNorma(norma.id)).map((t) => [t.id, t.hash])) : new Map<string, string>();
    for (let i = 0; i < Math.max(trechos.length, 1); i += 800) await rpcServidor("sm_normas_gravar", { p_normas: [norma], p_trechos: trechos.slice(i, i + 800) });
    await rpcServidor("sm_normas_podar", { p_norma_id: norma.id, p_manter: trechos.map((t) => t.id) });
    const depois = new Map(trechos.map((t) => [t.id, t.hash]));
    const alterados = [...new Set([...antes.keys(), ...depois.keys()])].filter((id) => antes.get(id) !== depois.get(id));
    const regras = [...new Set(alterados.flatMap((id) => usadosPorRegra.get(id) ?? []))];
    if (regras.length) {
      db().alertas_leis.unshift({ id: uid("alt"), data: new Date().toISOString(), commit, norma_id: norma.id, trechos_alterados: alterados.filter((id) => usadosPorRegra.has(id)), regras_afetadas: regras, resolvido: false });
      alertas.push(`${norma.sigla}: ${regras.join(", ")}`);
    }
    processadas++;
  }
  // Jurisprudência (lista fechada): reimporta se o arquivo mudou; súmula revogada / tema cancelado passa a "revogado" e a trava bloqueia.
  for (const j of JURIS) {
    const rel = `jurisprudencia/${j.arquivo}`;
    const info = await gh<{ sha: string; download_url: string }>(`contents/${rel}?ref=${commit}`).catch(() => null);
    if (!info || atuais.get(rel)?.git_sha === info.sha) continue;
    const md = await (await fetch(`https://raw.githubusercontent.com/${REPO}/${commit}/${rel}`, { cache: "no-store" })).text();
    const p = lerPrecedente(md, j, { commit, gitSha: info.sha });
    await rpcServidor("sm_normas_gravar", { p_normas: [p.norma], p_trechos: [p.trecho] });
    if (atuais.has(rel)) alertas.push(`${p.trecho.rotulo}: ${p.vigente ? "texto atualizado" : `não citável (${p.motivo})`}`);
    processadas++;
  }
  const pendentes = Math.max(0, mudaram.length - Math.min(mudaram.length, limite));
  if (!pendentes) audit("sistema", "sync_leis", "ctresb/leis", `${commit} · ${processadas} norma(s) atualizada(s)`);
  await save();
  return { commit, mudancas: processadas, pendentes, alertas };
}
