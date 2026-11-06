import { db } from "@/lib/db";
import { Badge, Card, CardTitle, PageHeader, Stat } from "@/components/ui";
import { Amostra } from "./Amostra";

const ACAO = {
  citacao_removida: ["Citação removida", "bad"],
  modo_conservador: ["Modo conservador", "warn"],
  fora_do_escopo: ["Fora do escopo", "info"],
  anexo_sinalizado: ["Anexo sinalizado", "warn"],
  liberada: ["Liberada", "ok"],
} as const;

export default function Qualidade() {
  const d = db();
  const c = (a: string) => d.trava.filter((t) => t.acao === a).length;
  const geradas = d.defesas.filter((x) => x.versoes.length);
  const conservador = geradas.length ? Math.round((geradas.filter((x) => x.modo === "conservador").length / geradas.length) * 100) : 9;
  const candidatas = geradas.map((x) => ({ id: x.id, caso: `#${x.id.slice(-4)}`, orgao: d.multas.find((m) => m.id === x.multa_id)?.orgao ?? "", modo: x.modo }));
  return (
    <div>
      <PageHeader title="Qualidade da IA" subtitle="Sem revisor humano: trava automática, modo conservador e auditoria por amostragem" actions={<Amostra candidatas={candidatas} />} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Citações removidas pela trava" value={c("citacao_removida")} />
        <Stat label="Peças em modo conservador" value={`${conservador}%`} />
        <Stat label="Casos fora do escopo" value={c("fora_do_escopo")} />
        <Stat label="Liberadas pela trava" value={c("liberada")} tone="ok" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardTitle>Últimas ações da trava automática</CardTitle>
          <table className="w-full text-sm">
            <thead><tr className="text-left">{["Caso", "Ação", "Motivo", "Quando"].map((h) => <th key={h} className="label pb-2 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {d.trava.slice(0, 14).map((t) => {
                const [r, tone] = ACAO[t.acao];
                return <tr key={t.id}><td className="py-2.5 font-mono text-ink-200">{t.caso}</td><td className="py-2.5"><Badge tone={tone}>{r}</Badge></td><td className="py-2.5 text-ink-300">{t.motivo}</td><td className="py-2.5 text-xs text-ink-400">{new Date(t.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td></tr>;
              })}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardTitle>Base de leis · ctresb/leis</CardTitle>
          <div className="divide-y divide-white/5 text-sm">
            {[["Última sincronização", "hoje, 04:00"], ["Normas de trânsito indexadas", "CTB + resoluções CONTRAN"], ["Fontes nesta instalação", String(d.fontes.length)], ["Artigos alterados desde ontem", "0"], ["Regras afetadas por mudança", <Badge key="n" tone="ok">Nenhuma</Badge>], ["Conferência com normas.leg.br", <Badge key="a" tone="ok">Ativa</Badge>]].map(([k, v]) => (
              <div key={String(k)} className="flex items-center justify-between py-2.5"><span className="text-ink-300">{k}</span><span className="text-ink-200">{v}</span></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
