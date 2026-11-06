import type { ChecagemRegra, Estimativa, Multa, TipoInfracao } from "./types";

/**
 * M4 · Motor de nulidades — checklist DETERMINÍSTICO (sem IA).
 * Cada regra é versionada, ligada a normas da base (normas_ids) e coberta por casos de teste
 * (ver scripts/test-rules.ts). As regras abaixo são a versão inicial e devem ser revisadas
 * e assinadas por especialista em direito de trânsito antes da produção.
 */
export const VERSAO_REGRAS = "regras-2026.11.0";

const DIA = 86_400_000;
const dias = (a: string, b: string) => Math.floor((new Date(b).getTime() - new Date(a).getTime()) / DIA);

export const TIPOS_FORA_ESCOPO: TipoInfracao[] = ["suspensao", "cassacao"];

type Regra = {
  codigo: string;
  titulo: string;
  versao: string;
  normas: string[];
  aplica: (m: Multa) => boolean;
  checar: (m: Multa, hoje: string) => Pick<ChecagemRegra, "resultado" | "detalhe">;
};

export const REGRAS: Regra[] = [
  {
    codigo: "R01",
    titulo: "Prazo de expedição da notificação",
    versao: "1.0",
    normas: ["ctb-281-pu-ii"],
    aplica: (m) => m.fase === "defesa_previa" || m.fase === "jari",
    checar: (m) => {
      if (!m.data_expedicao) return { resultado: "nao_informado", detalhe: "Data de expedição da notificação não identificada no documento." };
      const d = dias(m.data_infracao, m.data_expedicao);
      if (d > 30) return { resultado: "possivel_nulidade", detalhe: `Notificação expedida ${d} dias após a infração (limite de 30 dias).` };
      return { resultado: "ok", detalhe: `Expedida em ${d} dias, dentro do prazo.` };
    },
  },
  {
    codigo: "R02",
    titulo: "Campos obrigatórios do auto",
    versao: "1.0",
    normas: ["ctb-280", "ctb-281-pu-i"],
    aplica: () => true,
    checar: (m) => {
      const faltando: string[] = [];
      if (!m.enquadramento) faltando.push("tipificação");
      if (!m.local) faltando.push("local");
      if (!m.data_infracao) faltando.push("data/hora");
      if (!m.placa) faltando.push("placa");
      if (!m.marca_especie) faltando.push("marca/espécie do veículo");
      if (!m.agente_ou_equipamento) faltando.push("identificação do agente ou equipamento");
      if (faltando.length) return { resultado: "possivel_nulidade", detalhe: `Ausente(s): ${faltando.join(", ")}.` };
      return { resultado: "ok", detalhe: "Todos os campos obrigatórios presentes." };
    },
  },
  {
    codigo: "R03",
    titulo: "Aferição do equipamento",
    versao: "1.0",
    normas: ["contran-798-2020", "dec-jari-mg-0412"],
    aplica: (m) => m.tipo === "velocidade",
    checar: (m) => {
      if (!m.equipamento_afericao) return { resultado: "nao_informado", detalhe: "Data da verificação metrológica do equipamento não consta na notificação." };
      const d = dias(m.equipamento_afericao, m.data_infracao);
      if (d > 365) return { resultado: "possivel_nulidade", detalhe: `Última verificação ${d} dias antes da infração (validade de 12 meses).` };
      return { resultado: "ok", detalhe: "Verificação metrológica dentro da validade." };
    },
  },
  {
    codigo: "R04",
    titulo: "Competência do órgão",
    versao: "1.0",
    normas: ["ctb-281-pu-i"],
    aplica: () => true,
    checar: (m) => {
      const municipais: TipoInfracao[] = ["estacionamento"];
      if (municipais.includes(m.tipo) && m.esfera === "federal")
        return { resultado: "atencao", detalhe: "Infração de estacionamento autuada por órgão federal: verificar circunscrição." };
      if (m.orgao.toUpperCase().includes("PRF") && m.esfera !== "federal")
        return { resultado: "atencao", detalhe: "Esfera do órgão divergente da PRF." };
      return { resultado: "ok", detalhe: "Órgão compatível com a infração e a via." };
    },
  },
  {
    codigo: "R05",
    titulo: "Descrição x enquadramento",
    versao: "1.0",
    normas: ["ctb-281-pu-i"],
    aplica: (m) => m.tipo === "velocidade",
    checar: (m) => {
      if (!m.velocidade_medida || !m.velocidade_limite) return { resultado: "nao_informado", detalhe: "Velocidades medida/permitida não informadas." };
      const exc = ((m.velocidade_medida - m.velocidade_limite) / m.velocidade_limite) * 100;
      const faixa = exc <= 20 ? "até 20%" : exc <= 50 ? "20% a 50%" : "acima de 50%";
      const desc = (m.enquadramento + " " + m.descricao).toLowerCase();
      const declarada = desc.includes("acima de 50") ? "acima de 50%" : desc.includes("20% até 50") || desc.includes("20% a 50") ? "20% a 50%" : desc.includes("até 20") ? "até 20%" : null;
      if (declarada && declarada !== faixa)
        return { resultado: "possivel_nulidade", detalhe: `Excesso calculado de ${exc.toFixed(1)}% (${faixa}) não corresponde ao enquadramento (${declarada}).` };
      return { resultado: "ok", detalhe: `Excesso de ${exc.toFixed(1)}% coerente com o enquadramento.` };
    },
  },
  {
    codigo: "R06",
    titulo: "Tempestividade da defesa",
    versao: "1.0",
    normas: [],
    aplica: () => true,
    checar: (m, hoje) => {
      const d = dias(hoje, m.prazo);
      if (d < 0) return { resultado: "atencao", detalhe: "Prazo da fase vencido: verificar possibilidade de recurso na fase seguinte." };
      if (d <= 5) return { resultado: "atencao", detalhe: `Faltam ${d} dia(s) para o prazo.` };
      return { resultado: "ok", detalhe: `${d} dias até o prazo.` };
    },
  },
];

export function auditar(m: Multa, hoje = new Date().toISOString()): ChecagemRegra[] {
  return REGRAS.filter((r) => r.aplica(m)).map((r) => ({
    regra: r.codigo,
    titulo: r.titulo,
    versao: `${VERSAO_REGRAS}/${r.codigo}@${r.versao}`,
    normas_ids: r.normas,
    ...r.checar(m, hoje),
  }));
}

export function classificarEscopo(m: Pick<Multa, "tipo" | "confianca">): { escopo: "automatizado" | "sinalizado"; motivo?: string } {
  if (TIPOS_FORA_ESCOPO.includes(m.tipo)) return { escopo: "sinalizado", motivo: "Suspensão/cassação de CNH: caso sensível" };
  // Só campos essenciais contam: campo ausente na notificação (confiança 0) não é ilegibilidade.
  const essenciais = ["placa", "orgao", "tipo", "enquadramento", "data_infracao", "fase", "prazo", "legibilidade"];
  const conf = essenciais.map((k) => m.confianca[k]).filter((v): v is number => v !== undefined);
  if (conf.length && Math.min(...conf) < 0.5) return { escopo: "sinalizado", motivo: "Documento ilegível em campos essenciais" };
  return { escopo: "automatizado" };
}

/** Estimador: só exibe com amostra mínima de casos (jurimetria própria por órgão e argumento). */
export const AMOSTRA_MINIMA = 30;
export function estimar(
  m: Multa,
  checklist: ChecagemRegra[],
  jurimetria: { orgao: string; argumento: string; uso: number; exito: number }[],
): Estimativa {
  const argumentos = checklist.filter((c) => c.resultado === "possivel_nulidade" || c.resultado === "nao_informado").map((c) => c.regra);
  const linhas = jurimetria.filter((j) => j.orgao === m.orgao && argumentos.includes(j.argumento));
  const amostra = linhas.reduce((s, l) => s + l.uso, 0);
  if (amostra < AMOSTRA_MINIMA) return { faixa: "indisponivel", amostra, base: `Menos de ${AMOSTRA_MINIMA} casos semelhantes no ${m.orgao}` };
  const taxa = linhas.reduce((s, l) => s + l.exito, 0) / amostra;
  const faixa = taxa >= 0.6 ? "alta" : taxa >= 0.35 ? "moderada" : "baixa";
  return { faixa, percentual: Math.round(taxa * 100), amostra, base: `${amostra} casos semelhantes no ${m.orgao}` };
}
