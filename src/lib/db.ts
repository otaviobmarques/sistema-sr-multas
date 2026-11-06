import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { DB, Defesa, Multa } from "./types";
import { fontesIniciais } from "./normas";
import { auditar, estimar } from "./rules";

/**
 * Persistência de desenvolvimento: arquivo JSON em .data/db.json.
 * Em produção, a mesma interface é implementada sobre Supabase/PostgreSQL com RLS
 * (schema em supabase/migrations/0001_schema.sql).
 */
const FILE = path.join(process.cwd(), ".data", "db.json");
const g = globalThis as unknown as { __smdb?: DB };

export const uid = (p: string) => `${p}_${randomUUID().slice(0, 8)}`;
export const DEMO_USER = "u_demo";

function iso(dOffset: number, h = 10, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function seed(): DB {
  const jurimetria = [
    { orgao: "DER-MG", argumento: "R01", uso: 182, exito: 142 },
    { orgao: "DER-MG", argumento: "R03", uso: 140, exito: 85 },
    { orgao: "DER-MG", argumento: "R05", uso: 96, exito: 42 },
    { orgao: "DER-MG", argumento: "R02", uso: 71, exito: 23 },
    { orgao: "PRF", argumento: "R01", uso: 64, exito: 31 },
    { orgao: "PRF", argumento: "R03", uso: 51, exito: 24 },
    { orgao: "PBH/BHTrans", argumento: "R02", uso: 48, exito: 19 },
    { orgao: "DETRAN-MG", argumento: "R01", uso: 39, exito: 20 },
  ];

  const base = (over: Partial<Multa>): Multa => ({
    id: uid("mul"),
    dono_id: DEMO_USER,
    placa: "ABC1D23",
    numero_auto: "AB12345678",
    orgao: "DER-MG",
    esfera: "estadual",
    tipo: "velocidade",
    enquadramento: "Transitar em velocidade superior à máxima permitida em até 20%",
    descricao: "Excesso de velocidade",
    local: "Av. Afonso Pena, 1500 — Belo Horizonte/MG",
    data_infracao: iso(-55, 14, 32),
    data_expedicao: iso(-17),
    prazo: iso(14).slice(0, 10),
    fase: "defesa_previa",
    agente_ou_equipamento: "Radar fixo nº 00872-MG",
    marca_especie: "VW/Polo — Automóvel",
    velocidade_medida: 71,
    velocidade_limite: 60,
    equipamento_afericao: null,
    origem: "upload",
    escopo: "automatizado",
    confianca: { placa: 0.98, orgao: 0.97, data_infracao: 0.95, enquadramento: 0.91 },
    arquivo_nome: "notificacao_autuacao.pdf",
    criado_em: iso(-3),
    ...over,
  });

  const multas: Multa[] = [
    base({ id: "mul_1" }),
    base({ id: "mul_2", orgao: "PBH/BHTrans", esfera: "municipal", tipo: "estacionamento", enquadramento: "Estacionar em local proibido", descricao: "Estacionamento", fase: "jari", velocidade_medida: null, velocidade_limite: null, agente_ou_equipamento: "Agente mat. 4471", data_infracao: iso(-90), data_expedicao: iso(-70) }),
    base({ id: "mul_3", placa: "QWE4R56", orgao: "PRF", esfera: "federal", tipo: "ultrapassagem", enquadramento: "Ultrapassar pela contramão em linha contínua", descricao: "Ultrapassagem", velocidade_medida: null, velocidade_limite: null, local: "BR-381, km 450", marca_especie: "Fiat/Toro — Caminhonete", data_infracao: iso(-40), data_expedicao: iso(-20), prazo: iso(5).slice(0, 10) }),
    base({ id: "mul_4", placa: "QWE4R56", orgao: "DETRAN-MG", tipo: "suspensao", enquadramento: "Suspensão do direito de dirigir", descricao: "Processo de suspensão", escopo: "sinalizado", velocidade_medida: null, velocidade_limite: null, fase: "defesa_previa", prazo: iso(7).slice(0, 10) }),
    base({ id: "mul_5", placa: "JKL7M89", fase: "jari", data_infracao: iso(-160), data_expedicao: iso(-120) }),
  ];

  const mkDefesa = (m: Multa, over: Partial<Defesa>): Defesa => {
    const checklist = auditar(m);
    return {
      id: uid("def"),
      multa_id: m.id,
      dono_id: DEMO_USER,
      fase: m.fase,
      status: "em_analise",
      checklist,
      estimativa: estimar(m, checklist, jurimetria),
      modo: null,
      versoes: [],
      credito_consumido: false,
      documentos_pendentes: [],
      validacao: null,
      criado_em: m.criado_em,
      ...over,
    };
  };

  const defesas: Defesa[] = [
    mkDefesa(multas[0], { id: "def_1", status: "em_analise" }),
    mkDefesa(multas[1], { id: "def_2", status: "protocolada", credito_consumido: true, modo: "completo", protocolo: "PBH-2026-118273", assinada_em: iso(-12) }),
    mkDefesa(multas[2], { id: "def_3", status: "aguardando_documentos", credito_consumido: true, documentos_pendentes: ["CRLV do veículo"] }),
    mkDefesa(multas[3], { id: "def_4", status: "fora_do_escopo" }),
    mkDefesa(multas[4], { id: "def_5", status: "deferida", credito_consumido: true, modo: "completo", resultado: "deferida", assinada_em: iso(-60), protocolo: "DER-2026-55120" }),
  ];

  return {
    usuarios: [
      { id: DEMO_USER, perfil: "cliente", nome: "Marina Souza", cpf_cnpj: "123.456.789-09", email: "marina@exemplo.com", telefone: "(31) 99999-0000", criado_em: iso(-200) },
      { id: "u_admin", perfil: "admin", nome: "Equipe Senhor Multas", cpf_cnpj: "00.000.000/0001-00", email: "admin@senhormultas.com.br", telefone: "", criado_em: iso(-400) },
    ],
    veiculos: [
      { id: "vei_1", dono_id: DEMO_USER, placa: "ABC1D23", renavam: "01234567890", modelo: "VW Polo 2022", condutor_principal: "Marina Souza" },
      { id: "vei_2", dono_id: DEMO_USER, placa: "QWE4R56", renavam: "09876543210", modelo: "Fiat Toro 2021", condutor_principal: "Marina Souza" },
      { id: "vei_3", dono_id: DEMO_USER, placa: "JKL7M89", renavam: "05555555555", modelo: "Honda Fit 2019", condutor_principal: "Pedro Souza" },
    ],
    multas,
    defesas,
    fontes: fontesIniciais(),
    planos: [
      { id: "avulso", nome: "Avulso", creditos: 1, preco: 79.9, validade_meses: 12, beneficios: ["Análise com IA", "Defesa Pronta validada", "Acompanhamento de prazos"], cobranca: "Pix, cartão ou boleto" },
      { id: "pack5", nome: "Até 5 defesas", creditos: 5, preco: 349, validade_meses: 12, destaque: true, beneficios: ["Tudo do Avulso", "Créditos válidos por 12 meses", "Vários veículos"], cobranca: "À vista ou parcelado no cartão" },
      { id: "pack20", nome: "20 defesas", creditos: 20, preco: 1190, validade_meses: 12, beneficios: ["Tudo do pacote 5", "Ideal para frotas", "Relatório de economia"], cobranca: "À vista ou parcelado no cartão" },
      { id: "personalizado", nome: "Personalizado", creditos: null, preco: null, validade_meses: null, beneficios: ["Volume e preço negociados", "Assinatura mensal", "White-label para parceiros"], cobranca: "Assinatura recorrente ou por uso" },
    ],
    pedidos: [
      { id: "ped_1", usuario_id: DEMO_USER, plano_id: "pack5", valor: 349, creditos: 5, metodo: "PIX", status: "pago", asaas_payment_id: "pay_demo_001", criado_em: iso(-30), pago_em: iso(-30) },
    ],
    carteira: [
      { id: "cart_1", usuario_id: DEMO_USER, pedido_id: "ped_1", quantidade: 5, descricao: "Pacote Até 5 defesas", validade: iso(335), data: iso(-30) },
      { id: "cart_2", usuario_id: DEMO_USER, defesa_id: "def_2", quantidade: -1, descricao: "Defesa PBH/BHTrans · ABC1D23", data: iso(-14) },
      { id: "cart_3", usuario_id: DEMO_USER, defesa_id: "def_3", quantidade: -1, descricao: "Defesa PRF · QWE4R56", data: iso(-2) },
    ],
    parceiros: [
      { id: "par_1", nome: "Loja Contagem", tipo: "ECV", comissao_pct: 20, slug_link: "loja-contagem", plano: "Personalizado", status: "ativo", white_label: true, asaas_wallet_id: "wal_demo_1" },
      { id: "par_2", nome: "Loja Betim", tipo: "ECV", comissao_pct: 20, slug_link: "loja-betim", plano: "Personalizado", status: "ativo", white_label: false, asaas_wallet_id: "wal_demo_2" },
      { id: "par_3", nome: "Despachante Centro BH", tipo: "despachante", comissao_pct: 15, slug_link: "despachante-centro-bh", plano: "20 defesas", status: "ativo", white_label: false, asaas_wallet_id: "wal_demo_3" },
      { id: "par_4", nome: "Frota Alfa Ltda", tipo: "frota", comissao_pct: 0, slug_link: "frota-alfa", plano: "Personalizado", status: "assinatura", white_label: false },
      { id: "par_5", nome: "Loja Sete Lagoas", tipo: "ECV", comissao_pct: 20, slug_link: "loja-sete-lagoas", plano: "Personalizado", status: "onboarding", white_label: false },
    ],
    eventos_asaas: [],
    auditoria: [],
    trava: [
      { id: "tr_1", defesa_id: "def_x", caso: "#2035", acao: "citacao_removida", motivo: "Precedente não localizado na fonte oficial", data: iso(-1) },
      { id: "tr_2", defesa_id: "def_x", caso: "#2041", acao: "modo_conservador", motivo: "Confiança baixa na pesquisa", data: iso(-1) },
      { id: "tr_3", defesa_id: "def_x", caso: "#2044", acao: "fora_do_escopo", motivo: "Cassação de CNH", data: iso(0) },
      { id: "tr_4", defesa_id: "def_x", caso: "#2047", acao: "anexo_sinalizado", motivo: "Texto oculto tratado como dado", data: iso(0) },
      { id: "tr_5", defesa_id: "def_x", caso: "#2049", acao: "liberada", motivo: "5/5 citações confirmadas", data: iso(0) },
    ],
    chat: [],
    jurimetria,
    resultados_orgao: [
      { orgao: "DER-MG", total: 250, deferidas: 160 },
      { orgao: "PRF", total: 115, deferidas: 55 },
      { orgao: "DETRAN-MG", total: 90, deferidas: 47 },
      { orgao: "PBH/BHTrans", total: 98, deferidas: 40 },
      { orgao: "Outros", total: 59, deferidas: 32 },
    ],
  };
}

// ------------------------------------------------------------------ Armazenamento
// Com NEXT_PUBLIC_SUPABASE_URL + SM_SERVER_SECRET: Supabase (tabela sm_registros, via funções protegidas).
// Sem elas: arquivo local .data/db.json (desenvolvimento).
export const supabaseAtivo = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SM_SERVER_SECRET);
const LISTAS_SEM_ID = ["jurimetria", "resultados_orgao"] as const;
type Linha = { colecao: string; id: string; dono_id?: string | null; data: unknown };
const gs = globalThis as unknown as { __smsnap?: Map<string, string>; __smload?: Promise<void> | null; __smloadedAt?: number };

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ p_segredo: process.env.SM_SERVER_SECRET, ...args }),
    cache: "no-store",
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Supabase ${fn}: ${res.status} ${txt.slice(0, 200)}`);
  return (txt ? JSON.parse(txt) : null) as T;
}
export const rpcServidor = rpc;

function paraLinhas(d: DB): Linha[] {
  const out: Linha[] = [];
  for (const [colecao, itens] of Object.entries(d) as [string, { id?: string; dono_id?: string; usuario_id?: string }[]][]) {
    if ((LISTAS_SEM_ID as readonly string[]).includes(colecao)) out.push({ colecao, id: "__lista", data: itens });
    else for (const it of itens) out.push({ colecao, id: it.id!, dono_id: it.dono_id ?? it.usuario_id ?? null, data: it });
  }
  return out;
}

function deLinhas(linhas: Linha[]): DB {
  const d = { usuarios: [], veiculos: [], multas: [], defesas: [], fontes: [], planos: [], pedidos: [], carteira: [], parceiros: [], eventos_asaas: [], auditoria: [], trava: [], chat: [], jurimetria: [], resultados_orgao: [] } as unknown as Record<string, unknown[]>;
  for (const l of linhas) {
    if ((LISTAS_SEM_ID as readonly string[]).includes(l.colecao)) d[l.colecao] = l.data as unknown[];
    else (d[l.colecao] ??= []).push(l.data);
  }
  // ordem: mais recentes primeiro (como no armazenamento local)
  for (const k of Object.keys(d)) if (!(LISTAS_SEM_ID as readonly string[]).includes(k as never))
    (d[k] as { criado_em?: string; data?: string; recebido_em?: string }[]).sort((a, b) => String(b.criado_em ?? b.data ?? b.recebido_em ?? "").localeCompare(String(a.criado_em ?? a.data ?? a.recebido_em ?? "")));
  (d.chat as { data: string }[]).reverse(); // chat em ordem cronológica
  (d.planos as { preco: number | null }[]).sort((a, b) => (a.preco ?? 1e9) - (b.preco ?? 1e9));
  return d as unknown as DB;
}

const chave = (l: Linha) => `${l.colecao}\u0000${l.id}`;
function fotografar(d: DB) {
  gs.__smsnap = new Map(paraLinhas(d).map((l) => [chave(l), JSON.stringify(l.data)]));
}

/** Carrega o estado. Chame (com await) no início de cada página, layout e rota.
 *  `fresco` força leitura do banco (use antes de alterações). */
export async function carregar(fresco = false): Promise<DB> {
  if (!supabaseAtivo()) return db();
  const recente = gs.__smloadedAt && Date.now() - gs.__smloadedAt < 1500;
  if (g.__smdb && recente && !fresco) return g.__smdb;
  if (gs.__smload && !fresco) {
    await gs.__smload;
    return g.__smdb!;
  }
  gs.__smload = (async () => {
    const linhas = await rpc<Linha[]>("sm_carregar", {});
    if (!linhas.length) {
      g.__smdb = seed();
      gs.__smsnap = new Map();
      await save();
    } else {
      g.__smdb = deLinhas(linhas);
      fotografar(g.__smdb);
    }
    gs.__smloadedAt = Date.now();
  })();
  try {
    await gs.__smload;
  } finally {
    gs.__smload = null;
  }
  return g.__smdb!;
}

export function db(): DB {
  if (g.__smdb) return g.__smdb;
  if (supabaseAtivo()) throw new Error("db() chamado antes de carregar()");
  try {
    g.__smdb = JSON.parse(fs.readFileSync(FILE, "utf8")) as DB;
  } catch {
    g.__smdb = seed();
    void save();
  }
  return g.__smdb!;
}

/** Persiste somente os registros alterados desde a última leitura. */
export async function save() {
  if (!supabaseAtivo()) {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(g.__smdb, null, 1));
    return;
  }
  const atuais = paraLinhas(g.__smdb!);
  const snap = gs.__smsnap ?? new Map();
  const mudaram = atuais.filter((l) => snap.get(chave(l)) !== JSON.stringify(l.data));
  const vivos = new Set(atuais.map(chave));
  const apagar = [...snap.keys()].filter((k) => !vivos.has(k)).map((k) => {
    const [colecao, id] = k.split("\u0000");
    return { colecao, id };
  });
  if (!mudaram.length && !apagar.length) return;
  for (let i = 0; i < Math.max(mudaram.length, 1); i += 400)
    await rpc("sm_gravar", { p_linhas: mudaram.slice(i, i + 400), p_apagar: i === 0 ? apagar : [] });
  fotografar(g.__smdb!);
  gs.__smloadedAt = Date.now();
}

export async function resetDb() {
  if (supabaseAtivo()) {
    // preserva as contas reais; restaura os dados de demonstração
    const reais = (g.__smdb?.usuarios ?? []).filter((u) => !["u_demo", "u_admin"].includes(u.id));
    await rpc("sm_apagar_tudo", {});
    g.__smdb = seed();
    g.__smdb.usuarios.push(...reais);
    gs.__smsnap = new Map();
  } else g.__smdb = seed();
  await save();
}

export function audit(usuario_id: string, acao: string, entidade: string, detalhe?: string) {
  db().auditoria.unshift({ id: uid("aud"), usuario_id, acao, entidade, detalhe, data: new Date().toISOString() });
}

export function saldo(usuario_id: string) {
  const now = Date.now();
  return db()
    .carteira.filter((c) => c.usuario_id === usuario_id)
    .filter((c) => c.quantidade < 0 || !c.validade || new Date(c.validade).getTime() > now)
    .reduce((s, c) => s + c.quantidade, 0);
}
