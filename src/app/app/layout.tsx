import { Shell } from "@/components/Shell";
import { saldo } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await exigirUsuario();
  return (
    <Shell area="cliente" user={{ nome: u.nome, perfil: u.perfil }} saldo={saldo(u.id)} podeAdmin={["admin", "qualidade"].includes(u.perfil)} real={!!process.env.NEXT_PUBLIC_SUPABASE_URL} modoDemo={{ ia: !!process.env.ANTHROPIC_API_KEY, asaas: !!process.env.ASAAS_API_KEY }}>
      {children}
    </Shell>
  );
}
