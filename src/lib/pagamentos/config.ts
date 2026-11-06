/**
 * Configuração de pagamentos (Admin → Pagamentos): gateway ativo, ambiente (teste/produção),
 * formas de pagamento e credenciais por gateway e ambiente (criptografadas).
 * Guardada no registro "config/pagamentos". Variáveis de ambiente (ASAAS_API_KEY etc.) valem como alternativa.
 */
import { db } from "../db";
import { decifrar } from "../cripto";

export type GatewayId = "asaas" | "mercadopago" | "stripe";
export type Ambiente = "teste" | "producao";
export type Metodo = "PIX" | "CREDIT_CARD" | "BOLETO";

/** Campos de credencial de cada gateway (todos secretos, exceto os marcados como públicos). */
export const CAMPOS: Record<GatewayId, { chave: string; rotulo: string; publico?: boolean; ajuda: string }[]> = {
  asaas: [
    { chave: "api_key", rotulo: "Chave de API (access_token)", ajuda: "Asaas → Integrações → Chaves de API. Sandbox começa com $aact_hmlg…; produção com $aact_prod…" },
    { chave: "webhook_token", rotulo: "Token do webhook", ajuda: "Você escolhe (use “Gerar”) e cola o mesmo valor no Asaas ao criar o webhook." },
  ],
  mercadopago: [
    { chave: "access_token", rotulo: "Access Token", ajuda: "Mercado Pago → Suas integrações → Credenciais. Teste: TEST-…; produção: APP_USR-…" },
    { chave: "public_key", rotulo: "Public Key", publico: true, ajuda: "Usada só se houver checkout transparente no futuro." },
    { chave: "webhook_secret", rotulo: "Assinatura secreta do webhook", ajuda: "Gerada pelo Mercado Pago em Webhooks → Configurar notificações." },
  ],
  stripe: [
    { chave: "secret_key", rotulo: "Secret key", ajuda: "Stripe → Developers → API keys. Teste: sk_test_…; produção: sk_live_…" },
    { chave: "publishable_key", rotulo: "Publishable key", publico: true, ajuda: "pk_test_… / pk_live_…" },
    { chave: "webhook_secret", rotulo: "Signing secret do webhook", ajuda: "Stripe → Developers → Webhooks → seu endpoint → Signing secret (whsec_…)." },
  ],
};

export type ConfigPagamentos = {
  id: "pagamentos";
  gateway: GatewayId;
  ambiente: Ambiente;
  metodos: Record<Metodo, boolean>;
  parcelas_max: number; // cartão (pacotes; avulso é sempre à vista)
  vencimento_dias: number; // boleto/pix
  credenciais: Partial<Record<GatewayId, Partial<Record<Ambiente, Record<string, string>>>>>; // valores cifrados (ou públicos em texto)
  atualizado_em?: string;
  atualizado_por?: string;
};

export const PADRAO: ConfigPagamentos = {
  id: "pagamentos",
  gateway: "asaas",
  ambiente: "teste",
  metodos: { PIX: true, CREDIT_CARD: true, BOLETO: true },
  parcelas_max: 6,
  vencimento_dias: 3,
  credenciais: {},
};

const ENV: Record<GatewayId, Record<string, string | undefined>> = {
  asaas: { api_key: process.env.ASAAS_API_KEY, webhook_token: process.env.ASAAS_WEBHOOK_TOKEN },
  mercadopago: { access_token: process.env.MP_ACCESS_TOKEN, webhook_secret: process.env.MP_WEBHOOK_SECRET },
  stripe: { secret_key: process.env.STRIPE_SECRET_KEY, webhook_secret: process.env.STRIPE_WEBHOOK_SECRET },
};

export function lerConfig(): ConfigPagamentos {
  const c = (db().config as unknown as ConfigPagamentos[] | undefined)?.find((x) => x.id === "pagamentos");
  if (!c) {
    // sem configuração salva: respeita ASAAS_ENV das variáveis de ambiente
    return { ...PADRAO, ambiente: process.env.ASAAS_ENV === "production" ? "producao" : "teste" };
  }
  return { ...PADRAO, ...c, metodos: { ...PADRAO.metodos, ...c.metodos } };
}

/** Credencial em texto (decifrada). Ordem: tela de configuração → variável de ambiente (só no ambiente de produção da env ou se não houver tela). */
export function credencial(g: GatewayId, amb: Ambiente, campo: string): string | null {
  const c = lerConfig();
  const salvo = c.credenciais[g]?.[amb]?.[campo];
  if (salvo) {
    const publico = CAMPOS[g].find((x) => x.chave === campo)?.publico;
    return publico ? salvo : decifrar(salvo);
  }
  const envAmb = g === "asaas" ? (process.env.ASAAS_ENV === "production" ? "producao" : "teste") : "teste";
  return amb === envAmb ? ENV[g][campo] ?? null : null;
}

export const principal: Record<GatewayId, string> = { asaas: "api_key", mercadopago: "access_token", stripe: "secret_key" };

/** O gateway ativo tem credencial no ambiente ativo? Sem ela, o sistema opera em modo simulado. */
export function gatewayConfigurado(g = lerConfig().gateway, amb = lerConfig().ambiente) {
  return Boolean(credencial(g, amb, principal[g]));
}

export const metodosAtivos = (): Metodo[] => {
  const c = lerConfig();
  return (Object.keys(c.metodos) as Metodo[]).filter((m) => c.metodos[m]);
};

const NOMES: Record<GatewayId, string> = { asaas: "Asaas", mercadopago: "Mercado Pago", stripe: "Stripe" };
export const nomeGateway = (g: GatewayId) => NOMES[g];
/** Selo do topo: "Asaas · teste", "Stripe · produção" ou "Pagamento simulado". */
export function rotuloPagamento() {
  const c = lerConfig();
  const real = gatewayConfigurado(c.gateway, c.ambiente);
  return { pagamento: real ? `${NOMES[c.gateway]} · ${c.ambiente === "producao" ? "produção" : "teste"}` : "Pagamento simulado", pagamentoReal: real };
}
