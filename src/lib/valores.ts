import type { Multa, TipoInfracao } from "./types";

/** Tabela de gravidade usada para economia/pontos e para a comparação "recorrer x pagar com desconto".
 *  Valores de referência — manter atualizados pela equipe de qualidade. */
export const GRAVIDADE = {
  leve: { valor: 88.38, pontos: 3 },
  media: { valor: 130.16, pontos: 4 },
  grave: { valor: 195.23, pontos: 5 },
  gravissima: { valor: 293.47, pontos: 7 },
} as const;

const POR_TIPO: Record<TipoInfracao, keyof typeof GRAVIDADE> = {
  velocidade: "media",
  estacionamento: "media",
  avanco_sinal: "gravissima",
  celular: "gravissima",
  cinto: "grave",
  ultrapassagem: "gravissima",
  suspensao: "gravissima",
  cassacao: "gravissima",
  outra: "media",
};

export function gravidade(m: Pick<Multa, "tipo" | "velocidade_medida" | "velocidade_limite">) {
  let g = POR_TIPO[m.tipo];
  if (m.tipo === "velocidade" && m.velocidade_medida && m.velocidade_limite) {
    const exc = (m.velocidade_medida - m.velocidade_limite) / m.velocidade_limite;
    g = exc <= 0.2 ? "media" : exc <= 0.5 ? "grave" : "gravissima";
  }
  return { nivel: g, ...GRAVIDADE[g] };
}
