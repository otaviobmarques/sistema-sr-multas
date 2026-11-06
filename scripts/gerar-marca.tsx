// @ts-nocheck — script de build (tsx), fora do app
import React from "react";
(globalThis as any).React = React; // JSX clássico do tsx
/**
 * Gera os arquivos de marca em public/: favicons, ícones do app (PWA, Apple), e a imagem de compartilhamento (Open Graph).
 * Tudo é renderizado a partir dos SVGs de src/components/Marca.tsx, para ficar idêntico ao site.
 *
 *   npx tsx scripts/gerar-marca.tsx
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { IconeMulta, SenhorPlaca } from "../src/components/Marca";

const RAIZ = path.resolve(__dirname, "..");
const PUB = path.join(RAIZ, "public");
mkdirSync(path.join(PUB, "icons"), { recursive: true });

const fonte = (peso: string, arquivo: string) =>
  `@font-face{font-family:Geist;font-weight:${peso};src:url(data:font/woff2;base64,${readFileSync(path.join(RAIZ, "node_modules/geist/dist/fonts/geist-sans", arquivo)).toString("base64")}) format("woff2")}`;
const CSS = `${fonte("400", "Geist-Regular.woff2")}${fonte("600", "Geist-SemiBold.woff2")}${fonte("900", "Geist-Black.woff2")}
:root{--font-geist-sans:Geist}*{margin:0;box-sizing:border-box}html,body{background:transparent;font-family:Geist,sans-serif}`;
const html = (corpo: string) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${corpo}</body></html>`;

const CREME = "#f5f3ef";
const icone = renderToStaticMarkup(<IconeMulta style={{ width: "100%", height: "auto", display: "block" }} />);

/** Ícone quadrado: fundo creme, multa rasgada centralizada ocupando `escala` da largura. */
const quadro = (tam: number, escala: number, raio = 0) =>
  html(`<div style="width:${tam}px;height:${tam}px;background:${CREME};border-radius:${raio}px;display:flex;align-items:center;justify-content:center">
    <div style="width:${tam * escala}px;transform:translateY(${tam * 0.02}px)">${icone}</div></div>`);

const og = html(`
<div style="width:1200px;height:630px;position:relative;overflow:hidden;background:radial-gradient(900px 520px at 85% 30%,#1b3566 0%,#0b1430 45%,#05070f 100%);color:#fff">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse at 30% 40%,#000,transparent 75%)"></div>
  <div style="position:absolute;left:72px;top:58px;display:flex;align-items:center;gap:16px">
    <div style="width:96px">${icone}</div>
    <div style="font-weight:900;line-height:.9;letter-spacing:-.02em;font-size:38px"><div>Senhor</div><div style="color:#f2b705">Multas</div></div>
  </div>
  <div style="position:absolute;left:72px;top:182px;width:720px">
    <div style="font-size:62px;font-weight:900;line-height:1.04;letter-spacing:-.025em">Defesa de multas<br/>com <span style="color:#f2b705">inteligência artificial</span></div>
    <div style="margin-top:22px;font-size:26px;line-height:1.38;color:#c4cbd8;max-width:640px">Envie a foto da notificação e receba a Defesa Pronta em minutos, com lei e jurisprudência conferidas.</div>
    <div style="margin-top:28px;display:flex;gap:12px">
      ${["Defesa prévia", "JARI", "CETRAN"].map((t) => `<span style="padding:9px 18px;border-radius:999px;background:rgba(242,183,5,.12);border:1.5px solid rgba(242,183,5,.45);color:#f7cf4a;font-size:21px;font-weight:600">${t}</span>`).join("")}
    </div>
  </div>
  <div style="position:absolute;left:72px;bottom:46px;font-size:22px;font-weight:600;color:#8d97a8;letter-spacing:.01em">senhormultas.com.br</div>
  <div style="position:absolute;right:-10px;top:150px;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(242,183,5,.22) 0%,rgba(242,183,5,.06) 45%,transparent 70%)"></div>
  <div style="position:absolute;right:56px;bottom:-40px;width:380px">${renderToStaticMarkup(<SenhorPlaca className="" />)}</div>
</div>`);

/** ICO com imagens PNG embutidas (formato aceito por todos os navegadores). */
function ico(pngs: { tam: number; buf: Buffer }[]) {
  const cab = Buffer.alloc(6 + 16 * pngs.length);
  cab.writeUInt16LE(0, 0); cab.writeUInt16LE(1, 2); cab.writeUInt16LE(pngs.length, 4);
  let off = cab.length;
  pngs.forEach(({ tam, buf }, i) => {
    const e = 6 + 16 * i;
    cab.writeUInt8(tam >= 256 ? 0 : tam, e); cab.writeUInt8(tam >= 256 ? 0 : tam, e + 1);
    cab.writeUInt16LE(1, e + 4); cab.writeUInt16LE(32, e + 6);
    cab.writeUInt32LE(buf.length, e + 8); cab.writeUInt32LE(off, e + 12);
    off += buf.length;
  });
  return Buffer.concat([cab, ...pngs.map((p) => p.buf)]);
}

async function main() {
const navegador = await chromium.launch();
async function foto(conteudo: string, w: number, h: number, transparente = false) {
  const p = await navegador.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.setContent(conteudo);
  await p.evaluate(() => document.fonts.ready);
  const buf = await p.screenshot({ omitBackground: transparente, type: "png" });
  await p.close();
  return buf;
}

const saidas: [string, Buffer][] = [];
// App (PWA) e Apple: quadrado sem cantos (o sistema aplica a máscara)
saidas.push(["icons/icon-192.png", await foto(quadro(192, 0.74), 192, 192)]);
saidas.push(["icons/icon-512.png", await foto(quadro(512, 0.74), 512, 512)]);
saidas.push(["icons/maskable-192.png", await foto(quadro(192, 0.58), 192, 192)]);
saidas.push(["icons/maskable-512.png", await foto(quadro(512, 0.58), 512, 512)]);
saidas.push(["apple-touch-icon.png", await foto(quadro(180, 0.7), 180, 180)]);
// Favicons: cantos arredondados, fundo transparente
const f16 = await foto(quadro(16, 0.86, 3), 16, 16, true);
const f32 = await foto(quadro(32, 0.86, 6), 32, 32, true);
const f48 = await foto(quadro(48, 0.86, 10), 48, 48, true);
saidas.push(["icons/favicon-32.png", f32]);
saidas.push(["favicon.ico", ico([{ tam: 16, buf: f16 }, { tam: 32, buf: f32 }, { tam: 48, buf: f48 }])]);
// Compartilhamento (WhatsApp, Instagram, LinkedIn, X, Facebook…)
saidas.push(["og.png", await foto(og, 1200, 630)]);
await navegador.close();

for (const [nome, buf] of saidas) {
  writeFileSync(path.join(PUB, nome), buf);
  console.log(`${nome.padEnd(26)} ${(buf.length / 1024).toFixed(1)} KB`);
}
}
main();
