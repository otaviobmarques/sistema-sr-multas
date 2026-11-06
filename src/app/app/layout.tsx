import { Shell } from "@/components/Shell";
import { saldo } from "@/lib/db";
import { usuarioAtual } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await usuarioAtual();
  return (
    <Shell area="cliente" user={{ nome: u.nome, perfil: u.perfil }} saldo={saldo(u.id)} modoDemo={{ ia: !!process.env.ANTHROPIC_API_KEY, asaas: !!process.env.ASAAS_API_KEY }}>
      {children}
    </Shell>
  );
}
