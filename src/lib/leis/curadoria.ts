/**
 * Curadoria própria (cap. 6): dispositivos que o ctresb/leis não traz de forma utilizável.
 * Entram com origem "curadoria" e NÃO podem ser citados até um especialista validar (tela Base de leis).
 *
 * Res. CONTRAN 798/2020 — no repositório só existe o Anexo II. Os dispositivos abaixo foram transcritos
 * da Res. CONTRAN 804/2020, art. 2º, que deu nova redação à 798. Conferir texto consolidado e vigência.
 */
import { hashTexto, type NormaLei, type TrechoLei } from "./parser.ts";

const URN_798 = "urn:lex:br:conselho.nacional.transito:resolucao:2020-09-02;798";
const NOTA_804 = "Redação dada pela Res. CONTRAN 804/2020 (art. 2º). Transcrito da norma alteradora — conferir texto consolidado e vigência.";

export const NORMAS_CURADORIA: { norma: NormaLei; trechos: TrechoLei[] }[] = [
  {
    norma: {
      id: "curadoria-contran-res-798-2020",
      urn: URN_798,
      sigla: "Res. CONTRAN 798/2020",
      titulo: "Resolução CONTRAN nº 798, de 2 de setembro de 2020 (requisitos mínimos para a fiscalização da velocidade)",
      tipo: "Resolução",
      numero: "798",
      data: "2020-09-02",
      ementa: "Dispõe sobre requisitos técnicos mínimos para a fiscalização da velocidade de veículos automotores, elétricos, reboques e semirreboques.",
      fonte_oficial_url: "https://www.in.gov.br/web/dou/-/resolucao-contran-n-798-de-2-de-setembro-de-2020-280802185",
      versao_texto: "curadoria pendente de validação (trechos com redação da Res. 804/2020)",
      origem: "curadoria",
      repo_path: "reguladores/contran/resolucoes/2020/resolucao-contran-n-804-de-16-de-novembro-de-2020-*.md",
      repo_commit: null,
      git_sha: null,
      baixado_em: null,
      trechos: 4,
      revogada: null,
    },
    trechos: [
      { id: "cur798-art4-inc1-ali2", artigo: "4º", nivel: "alinea", rotulo: "Res. CONTRAN 798/2020, art. 4º, I, b", urn: `${URN_798}!art4_inc1_ali2`, texto: "ser aprovado em verificação metrológica inicial pelo Inmetro ou entidade por ele delegada; e", contexto: "Requisitos do medidor de velocidade (art. 4º, I)" },
      { id: "cur798-art4-inc1-ali3", artigo: "4º", nivel: "alinea", rotulo: "Res. CONTRAN 798/2020, art. 4º, I, c", urn: `${URN_798}!art4_inc1_ali3`, texto: "ser aprovado pelo Inmetro ou entidade por ele delegada, em verificação metrológica periódica, de acordo com a regulamentação técnica metrológica vigente;", contexto: "Requisitos do medidor de velocidade (art. 4º, I)" },
      { id: "cur798-art9-cpt", artigo: "9º", nivel: "caput", rotulo: "Res. CONTRAN 798/2020, art. 9º", urn: `${URN_798}!art9_cpt`, texto: "Para sua consistência e regularidade, o auto de infração de trânsito (AIT) e a notificação de autuação (NA), além do disposto no CTB e na legislação complementar, devem conter a imagem com a placa do veículo.", contexto: null },
      { id: "cur798-art9-par1u", artigo: "9º", nivel: "paragrafo", rotulo: "Res. CONTRAN 798/2020, art. 9º, parágrafo único", urn: `${URN_798}!art9_par1u`, texto: "O órgão ou entidade com circunscrição sobre a via deve dar publicidade, por meio do seu site na rede mundial de computadores, antes do início de sua operação, da relação de todos os medidores de velocidade existentes em sua circunscrição, contendo o tipo, número de série e a identificação do equipamento estabelecida pelo órgão, e, no caso do tipo fixo, também o local de instalação do equipamento.", contexto: "Para sua consistência e regularidade, o auto de infração de trânsito (AIT) e a notificação de autuação (NA), além do disposto no CTB e na legislação complementar, devem conter a imagem com a placa do veículo." },
    ].map((t, ordem) => ({ ...t, norma_id: "curadoria-contran-res-798-2020", nota: NOTA_804, revogado: false, ordem, hash: hashTexto(t.texto) })) as TrechoLei[],
  },
];
