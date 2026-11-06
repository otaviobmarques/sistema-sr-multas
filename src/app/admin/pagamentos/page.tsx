import { headers } from "next/headers";
import { exigirAdmin } from "@/lib/session";
import { CAMPOS, credencial, lerConfig, principal, type Ambiente, type GatewayId } from "@/lib/pagamentos/config";
import { mascarar } from "@/lib/cripto";
import { PageHeader } from "@/components/ui";
import { ConfigPagamentosForm } from "./ConfigPagamentosForm";

export const dynamic = "force-dynamic";

export default async function PaginaPagamentos() {
  await exigirAdmin();
  const cfg = lerConfig();
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const G: GatewayId[] = ["asaas", "mercadopago", "stripe"];
  const A: Ambiente[] = ["teste", "producao"];
  // estado das credenciais para a tela: só "configurado ••••1234", nunca o valor
  const estado = Object.fromEntries(
    G.map((g) => [
      g,
      Object.fromEntries(A.map((a) => [a, Object.fromEntries(CAMPOS[g].map((c) => {
        const v = credencial(g, a, c.chave);
        return [c.chave, v ? (c.publico ? v : mascarar(v)) : null];
      }))])),
    ]),
  ) as Record<GatewayId, Record<Ambiente, Record<string, string | null>>>;
  const prontos = Object.fromEntries(G.map((g) => [g, Object.fromEntries(A.map((a) => [a, !!credencial(g, a, principal[g])]))])) as Record<GatewayId, Record<Ambiente, boolean>>;
  return (
    <div>
      <PageHeader title="Pagamentos" subtitle="Gateway, ambiente (teste ou produção), formas de pagamento, credenciais e webhooks" />
      <ConfigPagamentosForm
        inicial={{ gateway: cfg.gateway, ambiente: cfg.ambiente, metodos: cfg.metodos, parcelas_max: cfg.parcelas_max, vencimento_dias: cfg.vencimento_dias }}
        campos={CAMPOS}
        estado={estado}
        prontos={prontos}
        base={base}
        atualizado={cfg.atualizado_em ? `${new Date(cfg.atualizado_em).toLocaleString("pt-BR")} por ${cfg.atualizado_por}` : null}
      />
    </div>
  );
}
