/**
 * Importa os precedentes da lista fechada (src/lib/leis/jurisprudencia.ts) do repositório ctresb/leis.
 *
 *   git -C ../leis sparse-checkout add /jurisprudencia/stj/ /jurisprudencia/stf/repercussao-geral/
 *   node --env-file=.env.local --experimental-strip-types scripts/importar-jurisprudencia.ts ../leis
 *
 * Nada é digitado à mão: o texto citável é o enunciado/tese literal do arquivo, com hash e commit do repositório.
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { JURIS, lerPrecedente } from "../src/lib/leis/jurisprudencia.ts";

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
for (const j of JURIS) {
  const rel = `jurisprudencia/${j.arquivo}`;
  const sha = execSync(`git ls-tree HEAD -- ${rel}`, { cwd: repo }).toString().split(/\s+/)[2] ?? null;
  const p = lerPrecedente(readFileSync(path.join(repo, rel), "utf8"), j, { commit, gitSha: sha });
  await rpc("sm_normas_gravar", { p_normas: [p.norma], p_trechos: [p.trecho] });
  await rpc("sm_normas_podar", { p_norma_id: p.norma.id, p_manter: [p.trecho.id] });
  console.log(`${p.vigente ? "✓" : "✗"} ${p.trecho.rotulo} · ${p.trecho.hash}${p.motivo ? ` · ${p.motivo}` : ""}`);
}
console.log(`ctresb/leis @ ${commit.slice(0, 8)} · ${JURIS.length} precedentes`);
