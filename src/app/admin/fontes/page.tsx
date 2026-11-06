import Link from "next/link";
import { exigirAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { buscarTrechos, listarNormas, trechosDaNorma } from "@/lib/leis/base";
import { Badge, Card, CardTitle, PageHeader, Stat } from "@/components/ui";
import { ValidarCuradoria } from "./ValidarCuradoria";

export const dynamic = "force-dynamic";

export default async function Fontes({ searchParams }: { searchParams: Promise<{ q?: string; norma?: string }> }) {
  await exigirAdmin();
  const { q, norma } = await searchParams;
  const normas = await listarNormas();
  const ctresb = normas.filter((n) => n.origem === "ctresb/leis");
  const curadoria = normas.filter((n) => n.origem === "curadoria");
  const juris = normas.filter((n) => n.origem === "jurisprudencia");
  const commit = ctresb.find((n) => n.repo_commit)?.repo_commit;
  const ultima = normas.reduce((m, n) => (n.sincronizada_em > m ? n.sincronizada_em : m), "");
  const resultados = q ? await buscarTrechos(q, 20) : [];
  const aberta = norma ? normas.find((n) => n.id === norma) : null;
  const trechos = aberta ? await trechosDaNorma(aberta.id) : [];
  const alertas = db().alertas_leis.filter((a) => !a.resolvido);
  const semArtigos = ctresb.filter((n) => n.trechos === 0);

  return (
    <div>
      <PageHeader title="Base de leis e fontes" subtitle="CTB e CONTRAN importados do ctresb/leis, quebrados por artigo, parágrafo, inciso e alínea · cada trecho com URN, hash e link oficial" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Normas (ctresb/leis)" value={ctresb.length} hint={`CTB + ${ctresb.length - 1} do CONTRAN`} />
        <Stat label="Trechos indexados" value={normas.reduce((s, n) => s + n.trechos, 0).toLocaleString("pt-BR")} tone="ia" />
        <Stat label="Curadoria própria" value={curadoria.length} hint={`${curadoria.filter((c) => c.validada_em).length} validada(s) · ${juris.filter((j) => !j.revogada).length} precedente(s) citável(is)`} />
        <Stat label="Repositório" value={<span className="font-mono text-xl">{commit?.slice(0, 8) ?? "—"}</span>} hint={ultima ? `sincronizado ${new Date(ultima).toLocaleString("pt-BR")}` : ""} />
      </div>

      {alertas.length > 0 && (
        <div className="mb-6 rounded-xl border border-bad/30 bg-bad/5 p-4 text-sm text-bad">
          <b>{alertas.length} alteração(ões) na lei afetam regras do motor.</b> Revise e reassine em <Link className="underline" href="/admin/regras">Regras do motor</Link>.
          <ul className="mt-2 list-disc pl-5 text-xs">{alertas.slice(0, 5).map((a) => <li key={a.id}>{a.norma_id}: {a.trechos_alterados.slice(0, 4).join(", ")} → regras {a.regras_afetadas.join(", ")}</li>)}</ul>
        </div>
      )}

      <Card className="mb-6">
        <CardTitle>Buscar na base</CardTitle>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} className="input" placeholder="Ex.: prazo defesa prévia, estacionar local proibido, verificação metrológica…" />
          <button className="btn btn-primary">Buscar</button>
        </form>
        {q && (
          <div className="mt-4 divide-y divide-white/5">
            {resultados.length === 0 && <p className="py-3 text-sm text-ink-400">Nenhum trecho encontrado.</p>}
            {resultados.map((t) => (
              <div key={t.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-white">{t.rotulo}</span>{t.origem === "curadoria" && <Badge tone="warn">curadoria</Badge>}<span className="font-mono text-[10px] text-ink-400">{t.id}</span></div>
                <p className="mt-1 text-ink-300">{t.texto}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {curadoria.length > 0 && (
        <Card className="mb-6">
          <CardTitle>Curadoria própria (lacunas do repositório)</CardTitle>
          {curadoria.map((c) => (
            <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 py-3 last:border-0">
              <div className="min-w-0">
                <Link href={`?norma=${c.id}`} className="font-medium text-white hover:text-brand">{c.titulo}</Link>
                <div className="mt-0.5 text-xs text-ink-400">{c.versao_texto} · {c.trechos} trechos · <a href={c.fonte_oficial_url ?? "#"} target="_blank" className="text-brand hover:underline">fonte oficial (DOU)</a></div>
                {c.validada_em && <div className="mt-0.5 text-xs text-ok">Validada por {c.validada_por} em {new Date(c.validada_em).toLocaleString("pt-BR")}</div>}
              </div>
              <ValidarCuradoria normaId={c.id} validada={!!c.validada_em} />
            </div>
          ))}
          <p className="mt-3 text-[11px] text-ink-400">Trechos de curadoria só podem ser citados pela IA depois de validados. Sem artigos legíveis no repositório: {semArtigos.map((n) => n.sigla).join(", ") || "—"}.</p>
        </Card>
      )}

      {juris.length > 0 && (
        <Card className="mb-6">
          <CardTitle>Jurisprudência (súmulas e teses vinculantes)</CardTitle>
          <p className="mb-2 text-xs text-ink-400">Lista fechada, transcrita literalmente do ctresb/leis (caderno de súmulas do STJ, dados abertos de repetitivos do STJ, Banco Nacional de Precedentes do CNJ). A IA só pode citar estes precedentes, e a trava confere texto e vigência a cada peça.</p>
          {juris.map((j) => (
            <div key={j.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 py-2.5 last:border-0">
              <div className="min-w-0">
                <Link href={`?norma=${j.id}`} className="font-medium text-white hover:text-brand">{j.sigla}</Link>
                <div className="mt-0.5 text-xs text-ink-400">{j.versao_texto} · <a href={j.fonte_oficial_url ?? "#"} target="_blank" className="text-brand hover:underline">fonte oficial</a></div>
              </div>
              <Badge tone={j.revogada ? "bad" : "ok"}>{j.revogada ? "não citável" : "citável"}</Badge>
            </div>
          ))}
        </Card>
      )}

      {aberta && (
        <Card className="mb-6">
          <CardTitle extra={<Link href="?" className="text-xs text-brand">fechar</Link>}>{aberta.titulo}</CardTitle>
          <div className="mb-3 text-xs text-ink-400">{aberta.repo_path} · <a href={aberta.fonte_oficial_url ?? "#"} target="_blank" className="text-brand">texto oficial</a></div>
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-2 text-sm">
            {trechos.map((t) => (
              <div key={t.id} className={t.revogado ? "opacity-40" : ""}>
                <span className="font-medium text-ink-200">{aberta.origem === "jurisprudencia" ? "Enunciado/tese:" : t.rotulo.split(", ").slice(1).join(", ")}</span> <span className="text-ink-300">{t.texto}</span>
                <span className="ml-2 font-mono text-[10px] text-ink-400">{t.hash}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 bg-ink-900"><tr className="border-b border-white/6 text-left">{["Norma", "Data", "Trechos", "Origem", ""].map((h) => <th key={h} className="label px-5 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {normas.map((n) => (
                <tr key={n.id} className="hover:bg-white/[.02]">
                  <td className="px-5 py-2.5"><Link href={`?norma=${n.id}`} className="text-white hover:text-brand">{n.sigla}</Link></td>
                  <td className="px-5 py-2.5 text-ink-400">{n.data ? new Date(n.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-5 py-2.5 font-mono text-ink-300">{n.trechos}</td>
                  <td className="px-5 py-2.5"><Badge tone={n.origem === "curadoria" ? "warn" : n.origem === "jurisprudencia" ? "ia" : "neutral"}>{n.origem}</Badge></td>
                  <td className="px-5 py-2.5 text-right"><a href={n.fonte_oficial_url ?? "#"} target="_blank" className="text-xs text-brand hover:underline">oficial ↗</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
