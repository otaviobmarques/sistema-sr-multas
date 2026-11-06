import { db, saldo } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";
import { gravidade } from "@/lib/valores";
import { PageHeader } from "@/components/ui";
import { NovaDefesa } from "./NovaDefesa";

export default async function Nova({ searchParams }: { searchParams: Promise<{ defesa?: string }> }) {
  const { defesa: id } = await searchParams;
  const u = await exigirUsuario();
  const d = db();
  const defesa = id ? d.defesas.find((x) => x.id === id && x.dono_id === u.id) : undefined;
  const multa = defesa ? d.multas.find((m) => m.id === defesa.multa_id) : undefined;
  return (
    <div>
      <PageHeader title="Nova defesa" subtitle="Envie a notificação; a IA extrai os dados e faz a auditoria automática" />
      <NovaDefesa
        key={defesa?.id ?? "novo"}
        defesa={defesa ?? null}
        multa={multa ?? null}
        saldo={saldo(u.id)}
        gravidade={multa ? gravidade(multa) : null}
      />
    </div>
  );
}
