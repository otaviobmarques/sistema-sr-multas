import Anthropic from "@anthropic-ai/sdk";

/** Modelos conforme o descritivo (cap. 5.3): Sonnet 5.5 nos agentes, Haiku 5.5 no assistente. */
export const MODELO_AGENTES = "claude-sonnet-5-5";
export const MODELO_ASSISTENTE = "claude-haiku-5-5";

export const iaAtiva = () => Boolean(process.env.ANTHROPIC_API_KEY);

let _client: Anthropic | null = null;
export function claude() {
  if (!_client) _client = new Anthropic();
  return _client;
}

/** Retorna o texto de uma resposta, tratando recusa/limite de tokens. */
export function textoDe(msg: Anthropic.Message): string {
  if (msg.stop_reason === "refusal") throw new Error("A IA recusou a solicitação");
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
