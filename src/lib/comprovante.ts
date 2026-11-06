import { listarArquivos, idsDaCadeia } from "./documentos";
import { qrSvg, urlVerificacao } from "./protocolo";
import { montarPeca, tipoPeca } from "./peca-formato";
import { db, supabaseAtivo } from "./db";
import type { DadosComprovante } from "@/components/Peca";
import type { Defesa, Multa, Usuario } from "./types";

const DECL: Record<string, string> = {
  data_hora: "Data e hora da infração estão corretas",
  local: "Local está correto",
  condutor: "Era o condutor do veículo, ou é o(a) proprietário(a) e responsável",
  documentos: "Os documentos enviados são verdadeiros",
};

/** Tudo o que a peça final + comprovante precisam (usado pelo PDF e pelo DOCX). */
export async function dadosDocumento(defesa: Defesa, multa: Multa, cliente: Usuario) {
  const v = defesa.versoes.at(-1)!;
  const arquivos = supabaseAtivo() ? await listarArquivos(idsDaCadeia(db(), defesa)) : [];
  const blocos = montarPeca({ conteudo: v.conteudo, citacoes: v.citacoes, multa, defesa, versao: v, cliente, anexos: arquivos });
  let comprovante: DadosComprovante | null = null;
  if (defesa.protocolo_sm && defesa.assinada_em) {
    comprovante = {
      protocolo: defesa.protocolo_sm,
      assinadaEm: defesa.assinada_em,
      geradaEm: v.gerada_em,
      titulo: tipoPeca(multa).titulo,
      orgao: multa.orgao,
      placa: multa.placa,
      auto: multa.numero_auto || "—",
      requerente: cliente.nome,
      documento: cliente.cpf_cnpj,
      versao: v.versao,
      modelo: v.modelo_ia,
      regras: v.versao_regras,
      ip: defesa.validacao?.ip ?? "—",
      hash: defesa.hash_peca ?? "—",
      declaracoes: (defesa.validacao?.declaracoes ?? []).map((d) => DECL[d] ?? d),
      fontes: v.citacoes.filter((c) => c.status_trava === "confirmada").map((c) => c.rotulo),
      anexos: arquivos.map((a) => ({ nome: a.nome, sha256: a.sha256 })),
      url: urlVerificacao(defesa.protocolo_sm),
      qrSvg: await qrSvg(defesa.protocolo_sm),
    };
  }
  return { blocos, comprovante, versao: v, arquivos };
}
