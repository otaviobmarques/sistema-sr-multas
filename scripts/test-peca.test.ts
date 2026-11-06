// Formatação da peça: datas/horas e cabeçalhos por fase/órgão
import { test } from "node:test";
import assert from "node:assert/strict";
import { dataBR, enderecamento, horaBR, tipoPeca } from "../src/lib/peca-formato.ts";

test("horário da notificação (sem fuso) não é convertido", () => {
  assert.equal(horaBR("2026-09-02T08:47:00"), "08:47");
  assert.equal(dataBR("2026-09-02T23:30:00"), "02/09/2026");
  assert.equal(dataBR("2026-11-30"), "30/11/2026");
});
test("horário com fuso vira horário de Brasília", () => {
  assert.equal(horaBR("2026-09-02T11:47:00Z"), "08:47");
  assert.equal(dataBR("2026-09-03T02:30:00Z"), "02/09/2026");
});
test("cabeçalho e cabimento por fase e órgão (CTB arts. 281-A, 285, 288 e 289)", () => {
  const m = { orgao: "DER-MG", local: "Rodovia MG-050, km 32, Itaúna/MG", esfera: "estadual" as const };
  assert.equal(tipoPeca({ ...m, fase: "defesa_previa" }).titulo, "DEFESA PRÉVIA");
  assert.match(tipoPeca({ ...m, fase: "defesa_previa" }).base, /281-A/);
  assert.match(enderecamento({ ...m, fase: "jari" }).join(" "), /JARI – DER-MG/);
  assert.match(enderecamento({ ...m, fase: "cetran" }).join(" "), /CETRAN\/MG/);
  assert.match(enderecamento({ orgao: "PRF", local: "BR-381", esfera: "federal", fase: "cetran" }).join(" "), /COLEGIADO ESPECIAL/);
  assert.match(enderecamento({ orgao: "DETRAN-DF", local: "Brasília/DF", esfera: "estadual", fase: "cetran" }).join(" "), /CONTRANDIFE/);
});
