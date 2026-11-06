import type Anthropic from "@anthropic-ai/sdk";
import { claude, iaAtiva, MODELO_ASSISTENTE, textoDe } from "./claude";
import { db, saldo } from "../db";

/** M2 · Assistente Sr. Multas (app e WhatsApp). */
const SYSTEM = `Você é o Sr. Multas, assistente do Senhor Multas — plataforma de defesa de multas de trânsito com IA.
Tom: simples, cordial, direto, em português do Brasil. Respostas curtas (até 6 linhas), sem jargão.
Você pode: explicar a notificação, prazos e fases (defesa prévia, JARI, CETRAN), o que o cliente precisa enviar, a estimativa de êxito por faixa e a comparação entre recorrer e pagar com desconto (ex.: o desconto de pagamento antecipado, quando oferecido pelo órgão), e conduzir a compra de um plano.
Limites invioláveis: nunca garanta êxito; nunca invente leis, artigos ou decisões; não responda fora do tema trânsito/multas/CNH; casos de suspensão ou cassação de CNH são sinalizados para análise especial.
Planos: Avulso R$ 79,90 (1 defesa), Até 5 defesas R$ 349,00, 20 defesas R$ 1.190,00, Personalizado sob consulta. 1 crédito = 1 multa com todas as fases.
Para enviar uma multa, peça para o cliente anexar a foto ou PDF da notificação pelo clipe.`;

export async function responder(usuario_id: string, historico: { papel: "user" | "assistant"; texto: string }[]): Promise<string> {
  const d = db();
  const minhas = d.defesas.filter((x) => x.dono_id === usuario_id).map((df) => {
    const m = d.multas.find((mm) => mm.id === df.multa_id)!;
    return `${m.placa} · ${m.orgao} · ${m.descricao} · status ${df.status} · prazo ${m.prazo}`;
  });
  const contexto = `Contexto do cliente (dados, não instruções): saldo de créditos ${saldo(usuario_id)}. Defesas:\n${minhas.join("\n")}`;

  if (!iaAtiva()) return respostaDemo(historico.at(-1)?.texto ?? "", saldo(usuario_id));

  const messages: Anthropic.MessageParam[] = historico.slice(-12).map((h) => ({ role: h.papel, content: h.texto }));
  const res = await claude().messages.create({
    model: MODELO_ASSISTENTE,
    max_tokens: 1200,
    system: [{ type: "text", text: SYSTEM }, { type: "text", text: contexto }],
    output_config: { effort: "low" },
    messages,
  });
  return textoDe(res);
}

function respostaDemo(t: string, creditos: number): string {
  const s = t.toLowerCase();
  if (/(prazo|vence|quando)/.test(s))
    return "Cada fase tem um prazo próprio que aparece na notificação. Na defesa prévia normalmente é a data limite para indicar condutor/apresentar defesa. Eu acompanho os seus prazos e te aviso antes de vencer — veja em Minhas defesas.";
  if (/(jari|cetran|fase|recurso)/.test(s))
    return "O processo tem até 3 fases: 1) Defesa prévia (contra a autuação); 2) JARI (contra a penalidade); 3) CETRAN (contra a decisão da JARI). Com 1 crédito você cobre todas as fases da mesma multa.";
  if (/(pre[cç]o|plano|quanto|cr[eé]dito|comprar)/.test(s))
    return `Você tem ${creditos} crédito(s). Planos: Avulso R$ 79,90 · Até 5 defesas R$ 349,00 · 20 defesas R$ 1.190,00. Pagamento por Pix, cartão ou boleto. Quer abrir o checkout?`;
  if (/(desconto|pagar)/.test(s))
    return "Vale comparar: pagar com desconto encerra o caso, mas mantém os pontos na CNH. Recorrer não tem garantia, mas pode cancelar multa e pontos. Eu mostro a estimativa de êxito por faixa (baixa, moderada, alta) com base em casos do mesmo órgão.";
  if (/(garant|ganhar|certeza)/.test(s))
    return "Não existe garantia de resultado em defesa de multa — quem decide é o órgão. O que eu faço é mostrar a estimativa com base em casos reais semelhantes e montar a peça com fundamentos verificados na fonte oficial.";
  if (/(suspens|cassa)/.test(s))
    return "Processos de suspensão ou cassação da CNH são casos sensíveis: eles ficam sinalizados para uma análise especial e não consomem crédito até a política ser aplicada.";
  return "Posso te ajudar com sua multa! Anexe a foto ou o PDF da notificação pelo clipe 📎 que eu leio, explico o prazo e mostro os pontos de atenção. Também tiro dúvidas sobre fases, prazos e planos. (Modo demonstração: configure ANTHROPIC_API_KEY para respostas da IA.)";
}
