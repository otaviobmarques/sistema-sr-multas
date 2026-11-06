import {
  AlignmentType, BorderStyle, Document, Footer, ImageRun, Packer, PageBreak, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType, convertMillimetersToTwip,
} from "docx";
import type { Citacao } from "./types";
import type { BlocosPeca } from "./peca-formato";
import type { DadosComprovante } from "@/components/Peca";
import { qrPng } from "./protocolo";

/** Peça + Comprovante de Protocolo em DOCX — Verdana, A4, margens ABNT (3 cm sup./esq., 2 cm inf./dir.). */
const F = "Verdana";
const run = (text: string, o: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}) => new TextRun({ text, font: F, size: o.size ?? 22, bold: o.bold, color: o.color, italics: o.italics });

/** Texto com marcações → texto limpo; citação confirmada recebe "(n)". */
export function textoLimpo(p: string, citacoes: Citacao[]) {
  const confirmadas = citacoes.filter((c) => c.status_trava === "confirmada");
  return p.replace(/\[\[fato:([^\]]+)\]\]/g, "$1").replace(/\[\[fonte:([^|\]]+)\|([^\]]+)\]\]/g, (_, id, t) => `${t} (${confirmadas.findIndex((c) => c.fonte_id === id) + 1})`);
}

const par = (children: TextRun[], o: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; before?: number; recuo?: boolean; line?: number } = {}) =>
  new Paragraph({
    children,
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: o.after ?? 160, before: o.before ?? 0, line: o.line ?? 360 },
    indent: o.recuo ? { firstLine: convertMillimetersToTwip(12.5) } : undefined,
  });

const borda = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const celula = (texto: string, o: { bold?: boolean; fundo?: boolean; largura: number; size?: number; mono?: boolean }) =>
  new TableCell({
    width: { size: o.largura, type: WidthType.PERCENTAGE },
    shading: o.fundo ? { type: ShadingType.CLEAR, color: "auto", fill: "F1F1F1" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    borders: { top: borda, bottom: borda, left: borda, right: borda },
    children: [new Paragraph({ children: [new TextRun({ text: texto, font: o.mono ? "Courier New" : F, size: o.size ?? 19, bold: o.bold })] })],
  });

function rodape(texto: string) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `${texto} · Página `, font: F, size: 14, color: "777777" }),
          new TextRun({ children: [PageNumber.CURRENT], font: F, size: 14, color: "777777" }),
          new TextRun({ text: " de ", font: F, size: 14, color: "777777" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: F, size: 14, color: "777777" }),
        ],
      }),
    ],
  });
}

export async function gerarDocx(b: BlocosPeca, citacoes: Citacao[], comprovante: DadosComprovante | null) {
  const filhos: (Paragraph | Table)[] = [];
  b.enderecamento.forEach((l, i) => filhos.push(par([run(l, { bold: true })], { align: AlignmentType.LEFT, after: i === b.enderecamento.length - 1 ? 360 : 0, line: 300 })));
  filhos.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: b.referencias.map(([k, v]) => new TableRow({ children: [celula(k, { bold: true, fundo: true, largura: 34 }), celula(v, { largura: 66 })] })) }));
  filhos.push(par([], { after: 240 }));
  filhos.push(par([run(textoLimpo(b.qualificacao, citacoes))], { recuo: true }));
  filhos.push(par([run(b.titulo, { bold: true, size: 26 })], { align: AlignmentType.CENTER, before: 200, after: 200 }));
  filhos.push(par([run(b.abertura)], { after: 280 }));
  for (const s of b.secoes) {
    filhos.push(par([run(s.titulo, { bold: true })], { align: AlignmentType.LEFT, before: 200, after: 120 }));
    if (s.titulo.endsWith("DOS PEDIDOS")) {
      filhos.push(par([run("Diante do exposto, requer:")], { recuo: true }));
      b.pedidos.forEach((p, i) => filhos.push(new Paragraph({ children: [run(`${String.fromCharCode(97 + i)}) `, { bold: true }), run(p)], alignment: AlignmentType.JUSTIFIED, spacing: { after: 100, line: 360 }, indent: { left: convertMillimetersToTwip(12.5) } })));
    } else for (const p of s.paragrafos) filhos.push(par([run(textoLimpo(p, citacoes))], { recuo: true }));
  }
  filhos.push(par([run(b.fechamento)], { recuo: true, before: 240 }));
  filhos.push(par([run(b.localData)], { align: AlignmentType.RIGHT, before: 200, after: 720 }));
  filhos.push(par([run("_______________________________________________")], { align: AlignmentType.CENTER, after: 0 }));
  filhos.push(par([run(b.assinatura.nome, { bold: true })], { align: AlignmentType.CENTER, after: 0 }));
  filhos.push(par([run(b.assinatura.documento, { size: 19 })], { align: AlignmentType.CENTER, after: 60 }));
  if (b.assinatura.carimbo) filhos.push(par([run(b.assinatura.carimbo, { size: 15, color: "666666" })], { align: AlignmentType.CENTER }));
  filhos.push(par([run("DOCUMENTOS ANEXOS", { bold: true, size: 19 })], { align: AlignmentType.LEFT, before: 360, after: 80 }));
  b.anexos.forEach((a, i) => filhos.push(par([run(`${i + 1}. ${a}`, { size: 19 })], { align: AlignmentType.LEFT, after: 40, line: 280 })));
  if (b.fundamentos.length) {
    filhos.push(par([run("FUNDAMENTOS CONFERIDOS NA BASE (LEGISLAÇÃO VIGENTE E JURISPRUDÊNCIA)", { bold: true, size: 16, color: "555555" })], { align: AlignmentType.LEFT, before: 280, after: 60 }));
    b.fundamentos.forEach((f) => filhos.push(par([run(f, { size: 16, color: "555555" })], { align: AlignmentType.LEFT, after: 20, line: 260 })));
  }

  if (comprovante) {
    const c = comprovante;
    filhos.push(new Paragraph({ children: [new PageBreak()] }));
    filhos.push(new Paragraph({ children: [run("Senhor ", { bold: true, size: 36, color: "13294B" }), run("Multas", { bold: true, size: 36, color: "C99700" })] }));
    filhos.push(par([run("COMPROVANTE DE PROTOCOLO", { bold: true, size: 26, color: "13294B" })], { align: AlignmentType.LEFT, before: 120, after: 0 }));
    filhos.push(par([new TextRun({ text: c.protocolo, font: "Courier New", size: 32, bold: true, color: "13294B" })], { align: AlignmentType.LEFT, after: 200 }));
    filhos.push(new Paragraph({ children: [new ImageRun({ type: "png", data: await qrPng(c.protocolo), transformation: { width: 110, height: 110 } })], spacing: { after: 60 } }));
    filhos.push(par([run(`Verifique a autenticidade: ${c.url}`, { size: 15, color: "666666" })], { align: AlignmentType.LEFT, after: 240 }));
    const fmt = (s: string) => new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" });
    const linhas: [string, string][] = [
      ["Protocolo", c.protocolo],
      ["Peça", `${c.titulo} · versão ${c.versao}`],
      ["Requerente", `${c.requerente} · ${c.documento}`],
      ["Multa", `Auto ${c.auto} · Placa ${c.placa} · ${c.orgao}`],
      ["Gerada em", fmt(c.geradaEm)],
      ["Assinada eletronicamente em", `${fmt(c.assinadaEm)} (horário de Brasília)`],
      ["IP da assinatura", c.ip],
      ["Rastreabilidade", `modelo ${c.modelo} · ${c.regras}`],
    ];
    filhos.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: linhas.map(([k, v]) => new TableRow({ children: [celula(k, { bold: true, fundo: true, largura: 34, size: 18 }), celula(v, { largura: 66, size: 18 })] })) }));
    filhos.push(par([run("Impressão digital da peça (SHA-256)", { bold: true, size: 19 })], { align: AlignmentType.LEFT, before: 240, after: 60 }));
    filhos.push(par([new TextRun({ text: c.hash, font: "Courier New", size: 16 })], { align: AlignmentType.LEFT }));
    filhos.push(par([run("Declarações confirmadas pelo requerente", { bold: true, size: 19 })], { align: AlignmentType.LEFT, before: 120, after: 60 }));
    c.declaracoes.forEach((d) => filhos.push(par([run(`• ${d}`, { size: 18 })], { align: AlignmentType.LEFT, after: 20, line: 280 })));
    if (c.anexos.length) {
      filhos.push(par([run("Documentos enviados", { bold: true, size: 19 })], { align: AlignmentType.LEFT, before: 160, after: 60 }));
      c.anexos.forEach((a) => filhos.push(par([run(`• ${a.nome} — sha256 ${a.sha256.slice(0, 24)}…`, { size: 16 })], { align: AlignmentType.LEFT, after: 20, line: 260 })));
    }
    if (c.fontes.length) {
      filhos.push(par([run("Fundamentos conferidos na base de leis", { bold: true, size: 19 })], { align: AlignmentType.LEFT, before: 160, after: 60 }));
      c.fontes.forEach((f) => filhos.push(par([run(`• ${f}`, { size: 17 })], { align: AlignmentType.LEFT, after: 20, line: 260 })));
    }
    filhos.push(par([run("Peça elaborada com auxílio de inteligência artificial, com citações conferidas automaticamente no texto vigente da legislação, e conferida e assinada eletronicamente pelo próprio requerente. Este comprovante registra a geração e a assinatura no Senhor Multas; ele não substitui o protocolo no órgão de trânsito.", { size: 15, color: "666666", italics: true })], { before: 300 }));
  }

  const doc = new Document({
    creator: "Senhor Multas",
    title: `${b.titulo}${comprovante ? ` · ${comprovante.protocolo}` : ""}`,
    styles: { default: { document: { run: { font: F, size: 22 } } } },
    sections: [
      {
        properties: { page: { size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) }, margin: { top: convertMillimetersToTwip(30), left: convertMillimetersToTwip(30), bottom: convertMillimetersToTwip(20), right: convertMillimetersToTwip(20) } } },
        footers: { default: rodape(b.rodape) },
        children: filhos,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
