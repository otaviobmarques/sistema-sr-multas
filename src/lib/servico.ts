import { audit, db, saldo, save, uid, supabaseAtivo } from "./db";
import { auditar, classificarEscopo, estimar } from "./rules";
import { gerarDefesa } from "./ai/pipeline";
import { regrasAssinadas } from "./regras-validacao";
import { DOCS, faltantes } from "./documentos";
import { Emails } from "./email";
import type { Extracao } from "./ai/extractor";
import type { Defesa, Multa, Usuario } from "./types";

const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !["dos", "das", "de", "da", "do"].includes(w));

/** Reconhece QUEM enviou a notificação: o titular (proprietário) ou um terceiro. */
export function identificarRemetente(m: Pick<Multa, "placa" | "proprietario_nome" | "proprietario_documento">, u: Usuario): NonNullable<Multa["remetente"]> {
  const docU = u.cpf_cnpj.replace(/\D/g, "");
  const docN = (m.proprietario_documento ?? "").replace(/\D/g, "");
  if (docN.length >= 11 && docU === docN) return { situacao: "titular", detalhe: "CPF/CNPJ da notificação confere com o seu cadastro." };
  if (m.proprietario_nome) {
    const a = norm(m.proprietario_nome), b = norm(u.nome);
    const iguais = a.length && b.length && a[0] === b[0] && a.at(-1) === b.at(-1);
    if (iguais) return { situacao: "titular", detalhe: `Notificação em nome de ${m.proprietario_nome} — confere com o seu cadastro.` };
    return { situacao: "terceiro", detalhe: `A notificação está em nome de ${m.proprietario_nome}, não de ${u.nome}. A defesa deve sair em nome do titular: envie procuração/autorização do proprietário ou use a indicação de condutor, se era você dirigindo.` };
  }
  const veiculo = db().veiculos.find((v) => v.dono_id === u.id && v.placa === m.placa);
  if (veiculo) return { situacao: "titular", detalhe: `Placa ${m.placa} cadastrada nos seus veículos.` };
  return { situacao: "indefinido", detalhe: "Não foi possível identificar o proprietário na notificação. Confirme se o veículo é seu." };
}

export function multaDeExtracao(e: Extracao, dono_id: string, arquivo_nome: string, origem: Multa["origem"] = "upload"): Multa {
  const m = multaBase(e, dono_id, arquivo_nome, origem);
  const u = db().usuarios.find((x) => x.id === dono_id);
  if (u) m.remetente = identificarRemetente(m, u);
  return m;
}

function multaBase(e: Extracao, dono_id: string, arquivo_nome: string, origem: Multa["origem"]): Multa {
  const confianca: Record<string, number> = {};
  for (const [k, v] of Object.entries(e)) if (v && typeof v === "object" && "confianca" in v && !k.startsWith("proprietario")) confianca[k] = v.confianca;
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
    imagem_placa: e.imagem_placa.valor,
    origem,
    escopo: "automatizado",
    confianca,
    arquivo_nome,
    proprietario_nome: e.proprietario_nome.valor,
    proprietario_documento: e.proprietario_documento.valor,
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
  base.documentos_pendentes = m.remetente?.situacao === "terceiro" ? ["Procuração/autorização do proprietário"] : base.documentos_pendentes.filter((d) => !d.startsWith("Procuração"));
  if (escopo.escopo === "sinalizado") {
    base.status = "fora_do_escopo";
    d.trava.unshift({ id: uid("tr"), defesa_id: base.id, caso: `#${base.id.slice(-4)}`, acao: "fora_do_escopo", motivo: escopo.motivo ?? "Sinalizado", data: new Date().toISOString() });
  }
  return base;
}

export async function registrarMulta(m: Multa): Promise<Defesa> {
  const d = db();
  const defesa = analisar(m);
  d.multas.unshift(m);
  d.defesas.unshift(defesa);
  audit(m.dono_id, "multa_enviada", `multa:${m.id}`, `${m.placa} · ${m.orgao}`);
  await save();
  return defesa;
}

/** Etapas 6–10: consome crédito (somente quando o cliente confirma) e roda pesquisa -> redação -> trava. */
export async function gerar(defesaId: string, usuarioId: string, ajuste?: string) {
  const d = db();
  const defesa = d.defesas.find((x) => x.id === defesaId && x.dono_id === usuarioId);
  if (!defesa) throw new Error("Defesa não encontrada");
  const multa = d.multas.find((m) => m.id === defesa.multa_id)!;
  if (defesa.status === "fora_do_escopo") throw new Error("Caso fora do escopo automatizado");

  // Etapa 7: documentos obrigatórios antes de pesquisar/redigir (e antes de consumir crédito)
  if (supabaseAtivo()) {
    const faltam = await faltantes(d, defesa, multa);
    defesa.documentos_pendentes = faltam.map((t) => DOCS[t].rotulo);
    if (faltam.length) {
      defesa.status = "aguardando_documentos";
      await save();
      return { precisaPagar: false as const, precisaDocumentos: true as const, faltam, defesa };
    }
  }
  if (!defesa.credito_consumido) {
    if (saldo(usuarioId) < 1) {
      defesa.status = "aguardando_pagamento";
      await save();
      return { precisaPagar: true as const, defesa };
    }
    d.carteira.unshift({ id: uid("cart"), usuario_id: usuarioId, defesa_id: defesa.id, quantidade: -1, descricao: `Defesa ${multa.orgao} · ${multa.placa}`, data: new Date().toISOString() });
    defesa.credito_consumido = true;
    audit(usuarioId, "credito_consumido", `defesa:${defesa.id}`);
  }

  defesa.status = "em_preparacao";
  const t0 = Date.now();
  const regrasValidas = process.env.SM_EXIGIR_REGRAS_ASSINADAS === "1" ? await regrasAssinadas() : null;
  const r = await gerarDefesa(defesa, multa, { ajuste, regrasValidas });
  defesa.versoes.push(r.versao);
  defesa.modo = r.modo;
  defesa.status = "aguardando_validacao";
  defesa.tempo_geracao_s = Math.max(1, Math.round((Date.now() - t0) / 1000));
  defesa.validacao = null;
  defesa.assinada_em = null;
  const caso = `#${defesa.id.slice(-4)}`;
  for (const e of r.eventos) d.trava.unshift({ id: uid("tr"), defesa_id: defesa.id, caso, acao: e.acao, motivo: e.motivo, data: new Date().toISOString() });
  audit(usuarioId, ajuste ? "ajuste_ia" : "defesa_gerada", `defesa:${defesa.id}`, `v${r.versao.versao} · ${r.modo}`);
  const dono = d.usuarios.find((x) => x.id === usuarioId);
  if (dono && !ajuste && r.versao.versao === 1) await Emails.defesaPronta(dono, defesa.id, multa.placa, multa.orgao, new Date(multa.prazo + "T12:00:00").toLocaleDateString("pt-BR")).catch(() => null);
  await save();
  return { precisaPagar: false as const, defesa };
}
