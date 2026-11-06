// Modelo de dados do Senhor Multas (espelha supabase/migrations/0001_schema.sql)

export type Perfil = "cliente" | "cliente_empresa" | "parceiro" | "qualidade" | "admin";

export type Fase = "defesa_previa" | "jari" | "cetran" | "indicacao_condutor";

export type StatusDefesa =
  | "em_analise"
  | "fora_do_escopo"
  | "aguardando_pagamento"
  | "aguardando_documentos"
  | "em_preparacao"
  | "aguardando_validacao"
  | "pronta_para_protocolar"
  | "protocolada"
  | "deferida"
  | "indeferida";

export type TipoInfracao =
  | "velocidade"
  | "estacionamento"
  | "avanco_sinal"
  | "celular"
  | "cinto"
  | "ultrapassagem"
  | "suspensao"
  | "cassacao"
  | "outra";

export interface Usuario {
  id: string;
  perfil: Perfil;
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  parceiro_id?: string | null;
  asaas_customer_id?: string | null;
  criado_em: string;
}

export interface Veiculo {
  id: string;
  dono_id: string;
  placa: string;
  renavam: string;
  modelo: string;
  condutor_principal: string;
}

export interface Multa {
  id: string;
  dono_id: string;
  veiculo_id?: string | null;
  placa: string;
  numero_auto: string;
  orgao: string;
  esfera: "municipal" | "estadual" | "federal";
  tipo: TipoInfracao;
  enquadramento: string;
  descricao: string;
  local: string;
  data_infracao: string; // ISO datetime
  data_expedicao?: string | null; // data de expedição da notificação
  prazo: string; // prazo da fase atual (ISO date)
  fase: Fase;
  agente_ou_equipamento?: string | null;
  marca_especie?: string | null;
  velocidade_medida?: number | null;
  velocidade_limite?: number | null;
  equipamento_afericao?: string | null; // data da última aferição
  imagem_placa?: boolean | null; // notificação traz a imagem do veículo com a placa (medidor de velocidade)
  origem: "upload" | "monitoramento" | "whatsapp";
  escopo: "automatizado" | "sinalizado";
  confianca: Record<string, number>; // confiança por campo da extração (0..1)
  arquivo_nome?: string | null;
  proprietario_nome?: string | null;
  proprietario_documento?: string | null;
  /** Reconhecimento de quem enviou a foto/notificação em relação ao titular */
  remetente?: { situacao: "titular" | "terceiro" | "indefinido"; detalhe: string } | null;
  criado_em: string;
}

export type ResultadoRegra = "possivel_nulidade" | "ok" | "nao_informado" | "atencao";

export interface ChecagemRegra {
  regra: string; // código da regra
  titulo: string;
  resultado: ResultadoRegra;
  detalhe: string;
  normas_ids: string[];
  versao: string;
}

export interface Estimativa {
  faixa: "baixa" | "moderada" | "alta" | "indisponivel";
  percentual?: number;
  amostra: number;
  base: string;
}

export interface Citacao {
  id: string;
  fonte_id: string;
  rotulo: string;
  status_trava: "confirmada" | "removida";
  motivo?: string;
  verificada_em: string;
}

/** Peça: parágrafos com marcações inline
 *  [[fato:texto]] -> fato para o cliente confirmar (amarelo)
 *  [[fonte:ID|texto]] -> trecho fundamentado em fonte verificada (verde) */
export interface ConteudoPeca {
  titulo: string;
  enderecamento: string;
  secoes: { titulo: string; paragrafos: string[] }[];
  pedidos: string[];
  fechamento: string;
}

export interface DefesaVersao {
  id: string;
  versao: number;
  conteudo: ConteudoPeca;
  modelo_ia: string;
  versao_prompt: string;
  versao_regras: string;
  gerada_em: string;
  citacoes: Citacao[];
  motivo?: string;
}

export interface Defesa {
  id: string;
  multa_id: string;
  dono_id: string;
  fase: Fase;
  status: StatusDefesa;
  checklist: ChecagemRegra[];
  estimativa: Estimativa;
  modo: "completo" | "conservador" | null;
  versoes: DefesaVersao[];
  credito_consumido: boolean;
  documentos_pendentes: string[];
  validacao?: {
    fatos_confirmados: string[];
    declaracoes: string[];
    ip: string;
    data: string;
  } | null;
  assinada_em?: string | null;
  protocolo?: string | null;
  resultado?: "deferida" | "indeferida" | null;
  tempo_geracao_s?: number;
  criado_em: string;
}

export interface Fonte {
  id: string;
  tipo: "norma" | "jurisprudencia" | "decisao_propria";
  urn: string;
  rotulo: string; // ex.: "CTB, art. 281, parágrafo único, II"
  texto: string;
  fonte_oficial_url: string;
  origem: string; // ctresb/leis, curadoria, base própria...
  repo_commit?: string;
  hash: string;
  coletada_em: string;
  demonstracao: boolean;
}

export interface Plano {
  id: string;
  nome: string;
  creditos: number | null;
  preco: number | null;
  validade_meses: number | null;
  destaque?: boolean;
  beneficios: string[];
  cobranca: string;
}

export interface Pedido {
  id: string;
  usuario_id: string;
  plano_id: string;
  valor: number;
  creditos: number;
  metodo: "PIX" | "CREDIT_CARD" | "BOLETO";
  parcelas?: number;
  parceiro_id?: string | null;
  status: "aguardando_pagamento" | "pago" | "vencido" | "estornado" | "em_analise";
  asaas_payment_id: string; // id da cobrança no gateway (nome mantido por compatibilidade)
  gateway?: "asaas" | "mercadopago" | "stripe" | "simulado";
  ambiente?: "teste" | "producao";
  gateway_aux?: string | null; // ex.: payment_intent da Stripe
  invoice_url?: string | null;
  pix_payload?: string | null;
  pix_qrcode_base64?: string | null;
  criado_em: string;
  pago_em?: string | null;
}

export interface CarteiraLancamento {
  id: string;
  usuario_id: string;
  pedido_id?: string | null;
  defesa_id?: string | null;
  quantidade: number; // + crédito, - consumo
  descricao: string;
  validade?: string | null;
  data: string;
}

export interface Parceiro {
  id: string;
  nome: string;
  tipo: "ECV" | "despachante" | "frota" | "loja";
  comissao_pct: number;
  asaas_wallet_id?: string | null;
  slug_link: string;
  plano: string;
  status: "ativo" | "onboarding" | "assinatura";
  white_label: boolean;
}

export interface EventoAsaas {
  id: string;
  evento: string;
  payload: unknown;
  recebido_em: string;
  processado: boolean;
}

export interface Auditoria {
  id: string;
  usuario_id: string;
  acao: string;
  entidade: string;
  detalhe?: string;
  data: string;
}

export interface AcaoTrava {
  id: string;
  defesa_id: string;
  caso: string;
  acao: "citacao_removida" | "modo_conservador" | "fora_do_escopo" | "anexo_sinalizado" | "liberada";
  motivo: string;
  data: string;
}

export interface MensagemChat {
  id: string;
  usuario_id: string;
  papel: "user" | "assistant";
  texto: string;
  anexo?: string | null;
  cartao?: {
    tipo: "resumo_multa";
    multa_id: string;
  } | null;
  acoes?: { rotulo: string; href: string }[];
  data: string;
}

/** Assinatura do especialista em direito de trânsito sobre uma regra do motor (cap. 6.2 / 15). */
export interface ValidacaoRegra {
  id: string; // codigo@versao
  codigo: string;
  versao: string;
  especialista: string;
  oab: string;
  usuario_id: string;
  hash_fontes: string; // hash dos dispositivos legais no momento da assinatura
  observacoes?: string | null;
  data: string;
}

/** Alerta da sincronização diária: dispositivo usado por regra mudou na base. */
export interface AlertaLei {
  id: string;
  data: string;
  commit: string;
  norma_id: string;
  trechos_alterados: string[];
  regras_afetadas: string[];
  resolvido: boolean;
}

/** Pedido do titular (LGPD, art. 18): exclusão, correção etc. */
export interface SolicitacaoLGPD {
  id: string;
  usuario_id: string;
  nome: string;
  email: string;
  tipo: "exclusao" | "correcao" | "outro";
  detalhe?: string | null;
  status: "aberta" | "concluida";
  data: string;
  concluida_em?: string | null;
}

export interface DB {
  config: Record<string, unknown>[];
  solicitacoes_lgpd: SolicitacaoLGPD[];
  validacoes_regras: ValidacaoRegra[];
  alertas_leis: AlertaLei[];
  usuarios: Usuario[];
  veiculos: Veiculo[];
  multas: Multa[];
  defesas: Defesa[];
  fontes: Fonte[];
  planos: Plano[];
  pedidos: Pedido[];
  carteira: CarteiraLancamento[];
  parceiros: Parceiro[];
  eventos_asaas: EventoAsaas[];
  auditoria: Auditoria[];
  trava: AcaoTrava[];
  chat: MensagemChat[];
  jurimetria: { orgao: string; argumento: string; uso: number; exito: number }[];
  resultados_orgao: { orgao: string; total: number; deferidas: number }[];
}
