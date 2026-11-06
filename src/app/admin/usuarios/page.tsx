import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/session";
import { db, saldo } from "@/lib/db";
import { emailAtivo } from "@/lib/email";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { NovoUsuario } from "./NovoUsuario";
import { AcoesUsuario } from "./AcoesUsuario";

export const dynamic = "force-dynamic";

const PERFIL: Record<string, string> = { cliente: "Cliente", cliente_empresa: "Empresa", qualidade: "Qualidade", admin: "Admin", parceiro: "Parceiro" };

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const eu = await exigirAdmin();
  if (eu.perfil !== "admin") redirect("/admin");
  const { q } = await searchParams;
  const d = db();
  const termo = q?.trim().toLowerCase();
  const lista = d.usuarios.filter((u) => !termo || `${u.nome} ${u.email} ${u.cpf_cnpj}`.toLowerCase().includes(termo));
  const cortesias = d.carteira.filter((c) => c.quantidade > 0 && !c.pedido_id).reduce((s, c) => s + c.quantidade, 0);
  return (
    <div>
      <PageHeader title="Usuários" subtitle="Crie contas para testadores e convidados, defina a senha e lance créditos de cortesia" actions={<NovoUsuario emailAtivo={emailAtivo()} />} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Contas" value={d.usuarios.length} />
        <Stat label="Criadas pelo admin" value={d.usuarios.filter((u) => u.criado_por).length} />
        <Stat label="Créditos de cortesia lançados" value={cortesias} tone="brand" hint="não entram na receita" />
        <Stat label="Créditos disponíveis (todos)" value={d.usuarios.reduce((s, u) => s + saldo(u.id), 0)} tone="ia" />
      </div>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} className="input" placeholder="Buscar por nome, e-mail ou CPF/CNPJ" />
        <button className="btn btn-ghost">Buscar</button>
      </form>
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead><tr className="border-b border-white/6 text-left">{["Usuário", "Perfil", "Créditos", "Defesas", "Criado em", ""].map((h, i) => <th key={i} className="label px-5 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {lista.map((u) => {
                const defesas = d.defesas.filter((x) => x.dono_id === u.id).length;
                const interna = u.email.endsWith("@senhormultas.interno");
                return (
                  <tr key={u.id} className="align-top hover:bg-white/[.02]">
                    <td className="px-5 py-3">
                      <div className="font-medium text-white">{u.nome}</div>
                      <div className="text-xs text-ink-400">{interna ? "login: admin" : u.email} · {u.cpf_cnpj}</div>
                      {u.criado_por && <div className="mt-0.5 text-[11px] text-brand">criada pelo admin</div>}
                    </td>
                    <td className="px-5 py-3"><Badge tone={u.perfil === "admin" ? "brand" : u.perfil === "qualidade" ? "ia" : "neutral"}>{PERFIL[u.perfil] ?? u.perfil}</Badge></td>
                    <td className="px-5 py-3 font-mono text-ink-200">{saldo(u.id)}</td>
                    <td className="px-5 py-3 font-mono text-ink-300">{defesas}</td>
                    <td className="px-5 py-3 text-ink-400">{new Date(u.criado_em).toLocaleDateString("pt-BR")}</td>
                    <td className="px-5 py-3 text-right"><AcoesUsuario id={u.id} nome={u.nome} saldo={saldo(u.id)} interna={interna} emailAtivo={emailAtivo()} /></td>
                  </tr>
                );
              })}
              {lista.length === 0 && <tr><td colSpan={6} className="px-5 py-6 text-center text-ink-400">Nenhum usuário encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
