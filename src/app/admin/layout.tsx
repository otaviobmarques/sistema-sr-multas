import { Shell } from "@/components/Shell";
import { exigirAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await exigirAdmin();
  return (
    <Shell area="admin" user={{ nome: u.nome, perfil: u.perfil }} podeAdmin real={!!process.env.NEXT_PUBLIC_SUPABASE_URL} modoDemo={{ ia: !!process.env.ANTHROPIC_API_KEY, asaas: !!process.env.ASAAS_API_KEY }}>
      {children}
    </Shell>
  );
}
