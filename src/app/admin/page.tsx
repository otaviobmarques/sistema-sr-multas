import { db } from "@/lib/db";
import { Bar, Card, CardTitle, PageHeader, Stat, brl } from "@/components/ui";

const ARG: Record<string, string> = { R01: "Notificação fora do prazo", R02: "Campos obrigatórios do auto", R03: "Aferição do equipamento", R04: "Competência do órgão", R05: "Erro de enquadramento" };
// Base ilustrativa do mês (somada aos dados reais desta instalação)
const BASE = { receita: 48320, defesas: 612, porPlano: { avulso: 231, pack5: 64, pack20: 12, personalizado: 5 } as Record<string, number> };

export default function VisaoGeral() {
  const d = db();
  const pagos = d.pedidos.filter((p) => p.status === "pago");
  const receita = BASE.receita + pagos.reduce((s, p) => s + p.valor, 0);
  const geradas = BASE.defesas + d.defesas.filter((x) => x.versoes.length).length;
  const tot = d.resultados_orgao.reduce((s, r) => s + r.total, 0);
  const def = d.resultados_orgao.reduce((s, r) => s + r.deferidas, 0);
  const tempos = d.defesas.map((x) => x.tempo_geracao_s).filter(Boolean) as number[];
  const tempo = tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 180;
  const args = Object.values(
    d.jurimetria.reduce<Record<string, { a: string; uso: number; exito: number }>>((acc, j) => {
      acc[j.argumento] ??= { a: j.argumento, uso: 0, exito: 0 };
      acc[j.argumento].uso += j.uso;
      acc[j.argumento].exito += j.exito;
      return acc;
    }, {}),
  ).sort((a, b) => b.uso - a.uso);
  const cont = (a: string) => d.trava.filter((t) => t.acao === a).length;

  return (
    <div>
      <PageHeader title="Visão geral" subtitle={`${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} · base ilustrativa + dados desta instalação`} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Receita (Asaas)" value={brl(receita)} />
        <Stat label="Defesas geradas" value={geradas} />
        <Stat label="Taxa de deferimento" value={`${Math.round((def / tot) * 100)}%`} tone="ok" />
        <Stat label="Tempo médio até a peça" value={tempo < 60 ? `${tempo} s` : `${Math.round(tempo / 60)} min`} tone="ia" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Deferimento por órgão (jurimetria própria)</CardTitle>
          <div className="space-y-3.5">
            {d.resultados_orgao.map((r) => {
              const p = Math.round((r.deferidas / r.total) * 100);
              return (
                <div key={r.orgao} className="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-sm">
                  <span className="text-ink-300">{r.orgao}</span><Bar value={p} /><span className="text-right font-mono text-xs text-ink-300">{p}%</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardTitle>Argumentos que mais vencem</CardTitle>
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th className="label pb-2 font-medium">Argumento</th><th className="label pb-2 text-right font-medium">Uso</th><th className="label pb-2 text-right font-medium">Êxito</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {args.map((a) => <tr key={a.a}><td className="py-2.5 text-ink-200">{ARG[a.a]}</td><td className="py-2.5 text-right font-mono text-ink-300">{a.uso}</td><td className="py-2.5 text-right font-mono text-ok">{Math.round((a.exito / a.uso) * 100)}%</td></tr>)}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardTitle>Vendas por plano</CardTitle>
          <div className="divide-y divide-white/5 text-sm">
            {d.planos.map((p) => {
              const n = (BASE.porPlano[p.id] ?? 0) + pagos.filter((x) => x.plano_id === p.id).length;
              return <div key={p.id} className="flex justify-between py-2.5"><span className="text-ink-200">{p.nome}</span><span className="font-mono text-ink-300">{n}{p.id === "personalizado" ? " contratos" : ""}</span></div>;
            })}
          </div>
        </Card>
        <Card>
          <CardTitle>Auditoria da IA</CardTitle>
          <div className="divide-y divide-white/5 text-sm">
            {[["Citações bloqueadas pelo verificador", cont("citacao_removida")], ["Peças em modo conservador", cont("modo_conservador")], ["Casos fora do escopo", cont("fora_do_escopo")], ["Tentativas de comando oculto em anexos", cont("anexo_sinalizado")]].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5"><span className="text-ink-200">{k}</span><span className="font-mono text-ink-300">{v}</span></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
