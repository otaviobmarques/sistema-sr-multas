import { exigirAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { Badge, Card, CardTitle, PageHeader, Stat } from "@/components/ui";
import { Amostra } from "./Amostra";
import { listarNormas } from "@/lib/leis/base";
import { situacaoDasRegras } from "@/lib/regras-validacao";
import Link from "next/link";

const ACAO = {
  citacao_removida: ["Citação removida", "bad"],
  modo_conservador: ["Modo conservador", "warn"],
  fora_do_escopo: ["Fora do escopo", "info"],
  anexo_sinalizado: ["Anexo sinalizado", "warn"],
  liberada: ["Liberada", "ok"],
} as const;

export default async function Qualidade() {
  await exigirAdmin();
  const d = db();
  const c = (a: string) => d.trava.filter((t) => t.acao === a).length;
  const geradas = d.defesas.filter((x) => x.versoes.length);
  const conservador = geradas.length ? Math.round((geradas.filter((x) => x.modo === "conservador").length / geradas.length) * 100) : 9;
  const normas = await listarNormas();
  const regras = await situacaoDasRegras();
  const sync = d.auditoria.find((a) => a.acao === "sync_leis");
  const alertas = d.alertas_leis.filter((a) => !a.resolvido);
  const curPend = normas.filter((n) => n.origem === "curadoria" && !n.validada_em).length;
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
          <CardTitle extra={<Link href="/admin/fontes" className="text-xs text-brand">abrir</Link>}>Base de leis · ctresb/leis</CardTitle>
          <div className="divide-y divide-white/5 text-sm">
            {([
              ["Última sincronização", sync ? `${new Date(sync.data).toLocaleString("pt-BR")} · ${sync.detalhe?.slice(0, 8)}` : "ainda não executada"],
              ["Normas de trânsito indexadas", `${normas.length} (${normas.reduce((s, n) => s + n.trechos, 0).toLocaleString("pt-BR")} trechos)`],
              ["Regras assinadas por especialista", <Badge key="r" tone={regras.every((r) => r.status === "assinada") ? "ok" : "warn"}>{regras.filter((r) => r.status === "assinada").length}/{regras.length}</Badge>],
              ["Regras afetadas por mudança na lei", <Badge key="n" tone={alertas.length ? "bad" : "ok"}>{alertas.length ? `${alertas.length} alerta(s)` : "Nenhuma"}</Badge>],
              ["Curadoria pendente de validação", <Badge key="c" tone={curPend ? "warn" : "ok"}>{curPend}</Badge>],
              ["Conferência na citação", <Badge key="a" tone="ok">Hash + vigência na base</Badge>],
            ] as [string, React.ReactNode][]).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5"><span className="text-ink-300">{k}</span><span className="text-ink-200">{v}</span></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
