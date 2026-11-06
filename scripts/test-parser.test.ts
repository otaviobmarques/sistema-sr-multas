// Leitor das normas do ctresb/leis
import { test } from "node:test";
import assert from "node:assert/strict";
import { lerNorma } from "../src/lib/leis/parser.ts";

const md = `---
titulo: "Lei nº 9.503 de 23/09/1997"
numero: "9503"
data: 1997-09-23
urn: "urn:lex:br:federal:lei:1997-09-23;9503"
fonte: "https://normas.leg.br/?urn=urn:lex:br:federal:lei:1997-09-23;9503"
---
# Lei
**Art. 281.** A autoridade de trânsito julgará a consistência do auto.

**§ 1º** O auto de infração será arquivado: *(Parágrafo único transformado em § 1º pela Lei nº 14.304, de 23/2/2022)*

I - se considerado inconsistente ou irregular;

II - se, no prazo máximo de trinta dias, não for expedida a notificação da autuação.

**Art. 281-A.** Prazo não inferior a 30 (trinta) dias.

**Art. 218.** Transitar em velocidade superior:

I - em até 20%:

Infração - média;

**Parágrafo único.** (VETADO)
`;

test("quebra artigo, parágrafo, inciso e separa notas", () => {
  const { norma, trechos } = lerNorma(md, { path: "federal/leis-ordinarias/1997/lei-9503-1997-09-23.md" });
  assert.equal(norma.id, "ctb");
  const t = (id: string) => trechos.find((x) => x.id === id);
  assert.equal(t("ctb-art281-par1-inc2")?.rotulo, "CTB (Lei 9.503/1997), art. 281, § 1º, II");
  assert.equal(t("ctb-art281-par1")?.nota, "Parágrafo único transformado em § 1º pela Lei nº 14.304, de 23/2/2022");
  assert.equal(t("ctb-art281-par1")?.texto, "O auto de infração será arquivado:");
  assert.equal(t("ctb-art281-par1-inc1")?.contexto, "O auto de infração será arquivado:");
  assert.ok(t("ctb-art281a-cpt"));
  assert.equal(t("ctb-art218-inc1")?.texto, "em até 20%: Infração - média;"); // linha de continuação agregada
  assert.equal(t("ctb-art218-par1u")?.revogado, true);
  assert.equal(t("ctb-art281-par1-inc2")?.urn, "urn:lex:br:federal:lei:1997-09-23;9503!art281_par1_inc2");
});
