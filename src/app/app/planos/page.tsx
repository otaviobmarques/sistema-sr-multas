import { cookies } from "next/headers";
import { db, saldo } from "@/lib/db";
import { usuarioAtual } from "@/lib/session";
import { Badge, PageHeader } from "@/components/ui";
import { Checkout } from "./Checkout";

export default async function Planos({ searchParams }: { searchParams: Promise<{ defesa?: string }> }) {
  const { defesa } = await searchParams;
  const u = await usuarioAtual();
  const d = db();
  const ref = (await cookies()).get("sm_ref")?.value;
  const parceiro = ref ? d.parceiros.find((p) => p.slug_link === ref) : undefined;
  return (
    <div>
      <PageHeader
        title="Planos e créditos"
        subtitle="1 crédito = 1 defesa completa (todas as fases daquela multa) · valores ilustrativos"
        actions={<><Badge tone="ia">Saldo: {saldo(u.id)} crédito(s)</Badge>{parceiro && <Badge tone="brand">Indicação: {parceiro.nome}</Badge>}</>}
      />
      <Checkout planos={d.planos} defesaRetorno={defesa ?? null} demo={!process.env.ASAAS_API_KEY} />
    </div>
  );
}
