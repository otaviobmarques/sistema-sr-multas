import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import type { Citacao, ConteudoPeca, Usuario } from "./types";

/** M6 · Saída da peça em DOCX, fonte Verdana (padrão de entrega, cap. 1.1). */
export function textoLimpo(p: string, citacoes: Citacao[]) {
  return p
    .replace(/\[\[fato:([^\]]+)\]\]/g, "$1")
    .replace(/\[\[fonte:([^|\]]+)\|([^\]]+)\]\]/g, (_, id, t) => {
      const i = citacoes.filter((c) => c.status_trava === "confirmada").findIndex((c) => c.fonte_id === id);
      return `${t} (Fonte ${i + 1})`;
    });
}

export async function gerarDocx(peca: ConteudoPeca, citacoes: Citacao[], cliente: Usuario, assinadaEm?: string | null) {
  const F = "Verdana";
  const run = (text: string, o: { bold?: boolean; size?: number } = {}) => new TextRun({ text, font: F, size: o.size ?? 20, bold: o.bold });
  const par = (children: TextRun[], o: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number } = {}) =>
    new Paragraph({ children, alignment: o.align ?? AlignmentType.JUSTIFIED, spacing: { after: o.after ?? 200, line: 320 } });

  const confirmadas = citacoes.filter((c) => c.status_trava === "confirmada");
  const children: Paragraph[] = [
    par([run(peca.titulo, { bold: true, size: 24 })], { align: AlignmentType.CENTER, after: 400 }),
    par([run(peca.enderecamento)], { after: 300 }),
    par([run(`${cliente.nome}, CPF/CNPJ ${cliente.cpf_cnpj}, vem, respeitosamente, apresentar a presente peça pelos fatos e fundamentos a seguir.`)]),
  ];
  for (const s of peca.secoes) {
    children.push(par([run(s.titulo, { bold: true })], { align: AlignmentType.LEFT }));
    for (const p of s.paragrafos) children.push(par([run(textoLimpo(p, citacoes))]));
  }
  children.push(par([run("DOS PEDIDOS", { bold: true })], { align: AlignmentType.LEFT }));
  peca.pedidos.forEach((p, i) => children.push(par([run(`${String.fromCharCode(97 + i)}) ${p}`)])));
  children.push(par([run(peca.fechamento)], { after: 400 }));
  children.push(par([run(assinadaEm ? `Assinado eletronicamente por ${cliente.nome} em ${new Date(assinadaEm).toLocaleString("pt-BR")}` : "____________________________________")], { align: AlignmentType.CENTER }));
  children.push(par([run(cliente.nome)], { align: AlignmentType.CENTER, after: 500 }));
  if (confirmadas.length) {
    children.push(par([run("FUNDAMENTOS CONFERIDOS NA FONTE OFICIAL", { bold: true, size: 16 })], { align: AlignmentType.LEFT }));
    confirmadas.forEach((c, i) => children.push(par([run(`Fonte ${i + 1}: ${c.rotulo}`, { size: 16 })], { after: 80 })));
  }

  const doc = new Document({ styles: { default: { document: { run: { font: F } } } }, sections: [{ children }] });
  return Packer.toBuffer(doc);
}
