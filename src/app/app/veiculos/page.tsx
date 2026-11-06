import { Car } from "lucide-react";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";
import { Card, PageHeader } from "@/components/ui";

export default async function Veiculos() {
  const u = await exigirUsuario();
  const d = db();
  const veiculos = d.veiculos.filter((v) => v.dono_id === u.id);
  return (
    <div>
      <PageHeader title="Meus veículos" subtitle="Seus veículos cadastrados · usados para reconhecer de quem é a notificação enviada" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {veiculos.map((v) => {
          const multas = d.multas.filter((m) => m.placa === v.placa && m.dono_id === u.id);
          return (
            <Card key={v.id} className="panel-hover">
              <div className="flex items-start justify-between">
                <div className="grid size-11 place-items-center rounded-xl bg-white/[.04] ring-1 ring-white/8"><Car className="size-5 text-ink-200" /></div>
              </div>
              <div className="mt-4 inline-block rounded-md border-2 border-ink-200/80 bg-white px-3 py-1 font-mono text-lg font-bold tracking-[0.15em] text-ink-950">{v.placa}</div>
              <div className="mt-3 text-sm text-white">{v.modelo}</div>
              <div className="mt-1 text-xs text-ink-400">RENAVAM {v.renavam} · condutor principal: {v.condutor_principal}</div>
              <div className="mt-4 border-t border-white/5 pt-3 text-xs text-ink-400">{multas.length} multa(s) no sistema</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
