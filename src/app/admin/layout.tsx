import { Shell } from "@/components/Shell";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = db().usuarios.find((x) => x.perfil === "admin")!;
  return (
    <Shell area="admin" user={{ nome: u.nome, perfil: u.perfil }} modoDemo={{ ia: !!process.env.ANTHROPIC_API_KEY, asaas: !!process.env.ASAAS_API_KEY }}>
      {children}
    </Shell>
  );
}
