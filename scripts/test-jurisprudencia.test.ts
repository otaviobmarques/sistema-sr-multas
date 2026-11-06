import { test } from "node:test";
import assert from "node:assert/strict";
import { JURIS, jurisprudenciaDoCaso, lerPrecedente } from "../src/lib/leis/jurisprudencia.ts";
import { citavel } from "../src/lib/leis/base.ts";

const sumula = `---
titulo: "Súmula nº 312 do STJ"
tribunal: "STJ"
tipo: "Súmula"
numero: "312"
data: 2005-05-11
revogada: false
fonte: "https://www.stj.jus.br/docs_internet/SumulasSTJ.pdf"
---
# Súmula nº 312 do STJ

Enunciado
No processo administrativo para imposição de multa de trânsito, são necessárias as
notificações da autuação e da aplicação da pena decorrente da infração.

Órgão Julgador
PRIMEIRA SEÇÃO
`;

test("súmula: enunciado literal, rótulo e hash", () => {
  const p = lerPrecedente(sumula, { id: "juris-stj-sumula-312", arquivo: "stj/sumulas/sumula-312.md" }, { commit: "abc", gitSha: "def" });
  assert.equal(p.trecho.rotulo, "Súmula nº 312 do STJ");
  assert.equal(p.trecho.texto, "No processo administrativo para imposição de multa de trânsito, são necessárias as notificações da autuação e da aplicação da pena decorrente da infração.");
  assert.equal(p.vigente, true);
  assert.equal(p.norma.origem, "jurisprudencia");
  assert.ok(citavel({ ...p.trecho, origem: "jurisprudencia", validada_em: null }).ok);
});

test("súmula revogada não é citável", () => {
  const p = lerPrecedente(sumula.replace("revogada: false", "revogada: true"), { id: "x", arquivo: "x.md" }, { commit: null, gitSha: null });
  assert.equal(p.vigente, false);
  assert.equal(citavel({ ...p.trecho, origem: "jurisprudencia", validada_em: null }).ok, false);
});

test("tema repetitivo sem trânsito em julgado não é citável", () => {
  const md = `---\ntribunal: "STJ"\ntipo: "Tema repetitivo"\nnumero: "9"\nsituacao: "Afetado"\n---\n### teseFirmada\n\nAlguma tese.\n\n### orgaoJulgador\n\nS1\n`;
  const p = lerPrecedente(md, { id: "y", arquivo: "y.md" }, { commit: null, gitSha: null });
  assert.equal(p.vigente, false);
  assert.match(p.trecho.rotulo, /Tema Repetitivo nº 9 \(Primeira Seção\)/);
});

test("seleção por caso", () => {
  assert.deepEqual(jurisprudenciaDoCaso({ regrasRelevantes: ["R01"], fase: "defesa_previa" }).sort(), ["juris-stj-sumula-312", "juris-stj-tema-105"]);
  assert.deepEqual(jurisprudenciaDoCaso({ regrasRelevantes: ["R03"], fase: "defesa_previa" }), []);
  assert.deepEqual(jurisprudenciaDoCaso({ regrasRelevantes: [], fase: "jari" }), ["juris-stj-sumula-312"]);
  assert.ok(jurisprudenciaDoCaso({ regrasRelevantes: [], fase: "defesa_previa", enquadramento: "Art. 257, § 8º — não indicação do condutor" }).includes("juris-stj-tema-1097"));
  assert.ok(JURIS.every((j) => j.id.startsWith("juris-")));
});
