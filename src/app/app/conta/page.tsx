import Link from "next/link";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";
import { Badge, Card, CardTitle, PageHeader, dataBR } from "@/components/ui";
import { TrocarSenha, PedidoLGPD } from "./Formularios";

export default async function Conta() {
  const u = await exigirUsuario();
  const pedidos = db().solicitacoes_lgpd.filter((s) => s.usuario_id === u.id);
  const linhas: [string, string][] = [
    ["Nome", u.nome],
    ["E-mail / usuário", u.email.endsWith("@senhormultas.interno") ? u.email.split("@")[0] : `${u.email}${u.email_confirmado === false ? " (não confirmado)" : " ✓"}`],
    ["CPF / CNPJ", u.cpf_cnpj],
    ["Celular", u.telefone || "—"],
    ["Perfil", u.perfil === "admin" ? "Administrador" : u.perfil === "cliente_empresa" ? "Empresa" : "Cliente"],
    ["Cliente desde", dataBR(u.criado_em)],
  ];
  return (
    <div>
      <PageHeader title="Minha conta" subtitle="Seus dados, sua senha e seus direitos de privacidade (LGPD)" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Dados cadastrais</CardTitle>
          <dl className="divide-y divide-white/5 text-sm">
            {linhas.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-ink-400">{k}</dt><dd className="text-right text-white">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] text-ink-400">Para corrigir algum dado, use o pedido de correção ao lado.</p>
        </Card>
        <Card>
          <CardTitle>Trocar senha</CardTitle>
          <TrocarSenha />
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle extra={<Link href="/privacidade" className="text-xs text-brand hover:underline">Política de privacidade</Link>}>Privacidade e seus dados (LGPD)</CardTitle>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="font-medium text-white">Baixar meus dados</div>
              <p className="mt-1 text-sm text-ink-400">Arquivo com tudo o que temos sobre você: cadastro, veículos, multas, defesas, pagamentos, conversas e registro de atividades.</p>
              <a href="/api/conta/dados" className="btn btn-ghost mt-3">Baixar (JSON)</a>
            </div>
            <PedidoLGPD />
          </div>
          {pedidos.length > 0 && (
            <div className="mt-5 border-t border-white/5 pt-4 text-sm">
              <div className="label mb-2">Seus pedidos</div>
              {pedidos.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <span className="text-ink-300">{p.tipo === "exclusao" ? "Exclusão da conta e dos dados" : p.tipo === "correcao" ? "Correção de dados" : "Outro pedido"} · {dataBR(p.data)}</span>
                  <Badge tone={p.status === "concluida" ? "ok" : "warn"}>{p.status === "concluida" ? "Concluído" : "Em andamento"}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
