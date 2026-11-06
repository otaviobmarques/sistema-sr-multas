import { exigirAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";

export default async function Fontes() {
  await exigirAdmin();
  const d = db();
  return (
    <div>
      <PageHeader title="Base de leis e fontes" subtitle="Toda fonte entra com origem, link oficial, data de coleta, cópia do texto e hash · importação diária do ctresb/leis" />
      <div className="mb-5 rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm text-warn">
        Esta instalação usa uma <b>amostra de demonstração</b>. A lista de regras do motor de nulidades e as referências legais devem ser montadas e assinadas por especialista em direito de trânsito antes da produção.
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {d.fontes.map((f) => (
          <Card key={f.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium text-white">{f.rotulo}</div>
              <Badge tone={f.tipo === "norma" ? "ok" : f.tipo === "decisao_propria" ? "brand" : "info"}>{f.tipo === "norma" ? "Norma" : f.tipo === "decisao_propria" ? "Decisão própria" : "Jurisprudência"}</Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">{f.texto}</p>
            <div className="mt-4 grid gap-1 font-mono text-[11px] text-ink-400">
              <div className="truncate">urn: {f.urn}</div>
              <div>origem: {f.origem}{f.repo_commit ? ` @ ${f.repo_commit}` : ""} · hash: {f.hash}</div>
              <a href={f.fonte_oficial_url} target="_blank" className="truncate text-brand hover:underline">{f.fonte_oficial_url}</a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
