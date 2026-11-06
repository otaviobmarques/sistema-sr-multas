import { NextResponse } from "next/server";
import { audit, db, save } from "@/lib/db";
import { cifrar } from "@/lib/cripto";
import { CAMPOS, credencial, lerConfig, principal, type Ambiente, type ConfigPagamentos, type GatewayId, type Metodo } from "@/lib/pagamentos/config";
import { GATEWAYS } from "@/lib/pagamentos/gateways";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

const G: GatewayId[] = ["asaas", "mercadopago", "stripe"];
const A: Ambiente[] = ["teste", "producao"];

/** Salva a configuração de pagamentos (somente administradores). Valores vazios mantêm a credencial atual. */
export async function POST(req: Request) {
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  if (u.perfil !== "admin") return NextResponse.json({ erro: "Somente administradores" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as {
    acao?: "salvar" | "testar";
    gateway?: GatewayId;
    ambiente?: Ambiente;
    metodos?: Partial<Record<Metodo, boolean>>;
    parcelas_max?: number;
    vencimento_dias?: number;
    credenciais?: Partial<Record<GatewayId, Partial<Record<Ambiente, Record<string, string>>>>>;
  };

  if (b.acao === "testar") {
    if (!b.gateway || !G.includes(b.gateway) || !b.ambiente || !A.includes(b.ambiente)) return NextResponse.json({ erro: "Gateway/ambiente inválido" }, { status: 400 });
    if (!credencial(b.gateway, b.ambiente, principal[b.gateway])) return NextResponse.json({ ok: false, detalhe: "Salve a chave principal deste ambiente antes de testar." });
    return NextResponse.json(await GATEWAYS[b.gateway].testar(b.ambiente));
  }

  const atual = lerConfig();
  const novo: ConfigPagamentos = { ...atual, credenciais: structuredClone(atual.credenciais) };
  if (b.gateway && G.includes(b.gateway)) novo.gateway = b.gateway;
  if (b.ambiente && A.includes(b.ambiente)) novo.ambiente = b.ambiente;
  if (b.metodos) novo.metodos = { PIX: !!b.metodos.PIX, CREDIT_CARD: !!b.metodos.CREDIT_CARD, BOLETO: !!b.metodos.BOLETO };
  if (b.parcelas_max) novo.parcelas_max = Math.min(12, Math.max(1, Math.round(b.parcelas_max)));
  if (b.vencimento_dias) novo.vencimento_dias = Math.min(30, Math.max(1, Math.round(b.vencimento_dias)));
  if (!Object.values(novo.metodos).some(Boolean)) return NextResponse.json({ erro: "Ative ao menos uma forma de pagamento" }, { status: 400 });

  const alterados: string[] = [];
  for (const g of G)
    for (const a of A) {
      const vindos = b.credenciais?.[g]?.[a];
      if (!vindos) continue;
      for (const campo of CAMPOS[g]) {
        const v = vindos[campo.chave];
        if (v === undefined || v === "") continue; // mantém
        novo.credenciais[g] ??= {};
        novo.credenciais[g]![a] ??= {};
        if (v === "__remover__") delete novo.credenciais[g]![a]![campo.chave];
        else novo.credenciais[g]![a]![campo.chave] = campo.publico ? v.trim() : cifrar(v.trim());
        alterados.push(`${g}/${a}/${campo.chave}${v === "__remover__" ? " (removida)" : ""}`);
      }
    }

  if (novo.ambiente === "producao" && !credencial(novo.gateway, "producao", principal[novo.gateway]) && !novo.credenciais[novo.gateway]?.producao?.[principal[novo.gateway]])
    return NextResponse.json({ erro: `Cadastre a chave de produção do ${GATEWAYS[novo.gateway].nome} antes de ativar Produção` }, { status: 400 });

  novo.atualizado_em = new Date().toISOString();
  novo.atualizado_por = u.nome;
  const lista = db().config as unknown as ConfigPagamentos[];
  const i = lista.findIndex((c) => c.id === "pagamentos");
  if (i >= 0) lista[i] = novo;
  else lista.push(novo);
  audit(u.id, "config_pagamentos", "config:pagamentos", `${novo.gateway}/${novo.ambiente} · métodos ${Object.entries(novo.metodos).filter(([, v]) => v).map(([k]) => k).join(",")}${alterados.length ? ` · credenciais: ${alterados.join(", ")}` : ""}`);
  await save();
  return NextResponse.json({ ok: true });
}
