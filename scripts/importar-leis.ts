/**
 * Importa a base de leis de trânsito do repositório ctresb/leis para o Supabase.
 *
 * Uso (precisa de um clone local, pode ser parcial/sparse):
 *   git clone --depth 1 --filter=blob:none --sparse https://github.com/ctresb/leis ../leis
 *   git -C ../leis sparse-checkout set --no-cone /federal/leis-ordinarias/1997/lei-9503-1997-09-23.md /reguladores/contran/
 *   node --env-file=.env.local --experimental-strip-types scripts/importar-leis.ts ../leis
 *
 * Importa: CTB (Lei 9.503/1997) + todas as resoluções e deliberações do CONTRAN presentes no repositório.
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { lerNorma, type NormaLei, type TrechoLei } from "../src/lib/leis/parser.ts";
import { NORMAS_CURADORIA } from "../src/lib/leis/curadoria.ts";

const repo = path.resolve(process.argv[2] ?? "../leis");
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!, KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, SEGREDO = process.env.SM_SERVER_SECRET!;
if (!URL || !KEY || !SEGREDO) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SM_SERVER_SECRET");

async function rpc(fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ p_segredo: SEGREDO, ...args }) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

const commit = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();
const arquivos = execSync("git ls-tree -r HEAD -- federal/leis-ordinarias/1997/lei-9503-1997-09-23.md reguladores/contran", { cwd: repo })
  .toString()
  .trim()
  .split("\n")
  .map((l) => {
    const [info, p] = l.split("\t");
    return { sha: info.split(" ")[2], path: p };
  })
  .filter((a) => a.path.endsWith(".md"));

console.log(`ctresb/leis @ ${commit.slice(0, 8)} · ${arquivos.length} arquivos`);
let totalTrechos = 0;
const semArtigos: string[] = [];
const fila: { norma: NormaLei; trechos: TrechoLei[] }[] = [];
for (const a of arquivos) {
  const md = readFileSync(path.join(repo, a.path), "utf8");
  const r = lerNorma(md, { path: a.path, commit, gitSha: a.sha });
  if (!r.trechos.length) semArtigos.push(r.norma.sigla);
  fila.push(r);
  totalTrechos += r.trechos.length;
}

// envia em lotes de ~800 trechos
let lote: { normas: NormaLei[]; trechos: TrechoLei[] } = { normas: [], trechos: [] };
const enviar = async () => {
  if (!lote.normas.length) return;
  await rpc("sm_normas_gravar", { p_normas: lote.normas, p_trechos: lote.trechos });
  lote = { normas: [], trechos: [] };
};
for (const { norma, trechos } of fila) {
  if (trechos.length > 800) {
    await enviar();
    for (let i = 0; i < trechos.length; i += 800) await rpc("sm_normas_gravar", { p_normas: [norma], p_trechos: trechos.slice(i, i + 800) });
    await rpc("sm_normas_podar", { p_norma_id: norma.id, p_manter: trechos.map((t) => t.id) });
  } else {
    if (lote.trechos.length + trechos.length > 800) await enviar();
    lote.normas.push(norma);
    lote.trechos.push(...trechos);
  }
}
await enviar();
// poda das normas pequenas enviadas em lote (após gravadas)
for (const { norma, trechos } of fila) if (trechos.length <= 800) await rpc("sm_normas_podar", { p_norma_id: norma.id, p_manter: trechos.map((t) => t.id) });

// curadoria própria (entra sem validação; o especialista valida na tela Base de leis)
for (const c of NORMAS_CURADORIA) {
  await rpc("sm_normas_gravar", { p_normas: [c.norma], p_trechos: c.trechos });
  await rpc("sm_normas_podar", { p_norma_id: c.norma.id, p_manter: c.trechos.map((t) => t.id) });
}
console.log(`Curadoria: ${NORMAS_CURADORIA.length} norma(s), ${NORMAS_CURADORIA.reduce((s, c) => s + c.trechos.length, 0)} trechos (pendentes de validação).`);
console.log(`Importado: ${fila.length} normas, ${totalTrechos} trechos.`);
if (semArtigos.length) console.log(`Sem artigos identificáveis (${semArtigos.length}), ex.: ${semArtigos.slice(0, 8).join("; ")}`);
