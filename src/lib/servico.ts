import { audit, db, saldo, save, uid } from "./db";
import { auditar, classificarEscopo, estimar } from "./rules";
import { gerarDefesa } from "./ai/pipeline";
import type { Extracao } from "./ai/extractor";
import type { Defesa, Multa } from "./types";

export function multaDeExtracao(e: Extracao, dono_id: string, arquivo_nome: string, origem: Multa["origem"] = "upload"): Multa {
  const confianca: Record<string, number> = {};
  for (const [k, v] of Object.entries(e)) if (v && typeof v === "object" && "confianca" in v) confianca[k] = v.confianca;
  const veiculo = db().veiculos.find((v) => v.dono_id === dono_id && v.placa === e.placa.valor);
  return {
    id: uid("mul"),
    dono_id,
    veiculo_id: veiculo?.id ?? null,
    placa: e.placa.valor,
    numero_auto: e.numero_auto.valor,
    orgao: e.orgao.valor,
    esfera: e.esfera.valor,
    tipo: e.tipo.valor,
    enquadramento: e.enquadramento.valor,
    descricao: e.descricao.valor,
    local: e.local.valor,
    data_infracao: e.data_infracao.valor,
    data_expedicao: e.data_expedicao.valor,
    prazo: e.prazo.valor,
    fase: e.fase.valor,
    agente_ou_equipamento: e.agente_ou_equipamento.valor,
    marca_especie: e.marca_especie.valor,
    velocidade_medida: e.velocidade_medida.valor,
    velocidade_limite: e.velocidade_limite.valor,
    equipamento_afericao: e.equipamento_afericao.valor,
    origem,
    escopo: "automatizado",
    confianca,
    arquivo_nome,
    criado_em: new Date().toISOString(),
  };
}

/** Etapas 3–5 da jornada: escopo, auditoria por regras e estimativa. */
export function analisar(m: Multa, defesa?: Defesa): Defesa {
  const d = db();
  const escopo = classificarEscopo(m);
  m.escopo = escopo.escopo;
  const checklist = auditar(m);
  const estimativa = estimar(m, checklist, d.jurimetria);
  const base: Defesa = defesa ?? {
    id: uid("def"),
    multa_id: m.id,
    dono_id: m.dono_id,
    fase: m.fase,
    status: "em_analise",
    checklist: [],
    estimativa,
    modo: null,
    versoes: [],
    credito_consumido: false,
    documentos_pendentes: [],
    criado_em: new Date().toISOString(),
  };
  base.fase = m.fase;
  base.checklist = checklist;
  base.estimativa = estimativa;
  if (escopo.escopo === "sinalizado") {
    base.status = "fora_do_escopo";
    d.trava.unshift({ id: uid("tr"), defesa_id: base.id, caso: `#${base.id.slice(-4)}`, acao: "fora_do_escopo", motivo: escopo.motivo ?? "Sinalizado", data: new Date().toISOString() });
  }
  return base;
}

export function registrarMulta(m: Multa): Defesa {
  const d = db();
  const defesa = analisar(m);
  d.multas.unshift(m);
  d.defesas.unshift(defesa);
  audit(m.dono_id, "multa_enviada", `multa:${m.id}`, `${m.placa} · ${m.orgao}`);
  save();
  return defesa;
}

/** Etapas 6–10: consome crédito (somente quando o cliente confirma) e roda pesquisa -> redação -> trava. */
export async function gerar(defesaId: string, usuarioId: string, ajuste?: string) {
  const d = db();
  const defesa = d.defesas.find((x) => x.id === defesaId && x.dono_id === usuarioId);
  if (!defesa) throw new Error("Defesa não encontrada");
  const multa = d.multas.find((m) => m.id === defesa.multa_id)!;
  if (defesa.status === "fora_do_escopo") throw new Error("Caso fora do escopo automatizado");

  if (!defesa.credito_consumido) {
    if (saldo(usuarioId) < 1) {
      defesa.status = "aguardando_pagamento";
      save();
      return { precisaPagar: true as const, defesa };
    }
    d.carteira.unshift({ id: uid("cart"), usuario_id: usuarioId, defesa_id: defesa.id, quantidade: -1, descricao: `Defesa ${multa.orgao} · ${multa.placa}`, data: new Date().toISOString() });
    defesa.credito_consumido = true;
    audit(usuarioId, "credito_consumido", `defesa:${defesa.id}`);
  }

  defesa.status = "em_preparacao";
  const t0 = Date.now();
  const r = await gerarDefesa(defesa, multa, d.fontes, { ajuste });
  defesa.versoes.push(r.versao);
  defesa.modo = r.modo;
  defesa.status = "aguardando_validacao";
  defesa.tempo_geracao_s = Math.max(1, Math.round((Date.now() - t0) / 1000));
  defesa.validacao = null;
  defesa.assinada_em = null;
  const caso = `#${defesa.id.slice(-4)}`;
  for (const e of r.eventos) d.trava.unshift({ id: uid("tr"), defesa_id: defesa.id, caso, acao: e.acao, motivo: e.motivo, data: new Date().toISOString() });
  audit(usuarioId, ajuste ? "ajuste_ia" : "defesa_gerada", `defesa:${defesa.id}`, `v${r.versao.versao} · ${r.modo}`);
  save();
  return { precisaPagar: false as const, defesa };
}
