import { db } from "@/lib/db";
import { AMOSTRA_MINIMA } from "@/lib/rules";
import { Badge, Bar, Card, PageHeader } from "@/components/ui";

const ARG: Record<string, string> = { R01: "Notificação fora do prazo", R02: "Campos obrigatórios do auto", R03: "Aferição do equipamento", R04: "Competência do órgão", R05: "Erro de enquadramento" };

export default function Jurimetria() {
  const d = db();
  const rows = [...d.jurimetria].sort((a, b) => b.exito / b.uso - a.exito / a.uso);
  return (
    <div>
      <PageHeader title="Jurimetria" subtitle={`Deferimento por órgão e por argumento · cada resultado registrado volta para esta base · estimativa só aparece com ${AMOSTRA_MINIMA}+ casos`} />
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-white/6 text-left">{["Órgão", "Argumento", "Casos", "Êxito", "", "Estimativa"].map((h, i) => <th key={i} className="label px-5 py-3.5 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => {
                const p = Math.round((r.exito / r.uso) * 100);
                return (
                  <tr key={r.orgao + r.argumento} className="hover:bg-white/[.02]">
                    <td className="px-5 py-3.5 text-white">{r.orgao}</td>
                    <td className="px-5 py-3.5 text-ink-300">{ARG[r.argumento]} <span className="font-mono text-[10px] text-ink-400">{r.argumento}</span></td>
                    <td className="px-5 py-3.5 font-mono text-ink-300">{r.uso}</td>
                    <td className="px-5 py-3.5 font-mono text-ok">{p}%</td>
                    <td className="w-48 px-5 py-3.5"><Bar value={p} /></td>
                    <td className="px-5 py-3.5">{r.uso >= AMOSTRA_MINIMA ? <Badge tone={p >= 60 ? "ok" : p >= 35 ? "warn" : "bad"}>{p >= 60 ? "Alta" : p >= 35 ? "Moderada" : "Baixa"}</Badge> : <Badge>Amostra insuficiente</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
