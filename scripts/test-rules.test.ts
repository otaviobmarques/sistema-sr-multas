// Casos de teste do motor de nulidades (M4). Rode: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { auditar, classificarEscopo, estimar } from "../src/lib/rules.ts";
import type { Multa } from "../src/lib/types.ts";

const base: Multa = {
  id: "m", dono_id: "u", placa: "ABC1D23", numero_auto: "A1", orgao: "DER-MG", esfera: "estadual", tipo: "velocidade",
  enquadramento: "Transitar em velocidade superior à máxima permitida em até 20%", descricao: "Excesso de velocidade",
  local: "Av. X", data_infracao: "2026-09-01T10:00:00Z", data_expedicao: "2026-09-20", prazo: "2099-01-01", fase: "defesa_previa",
  agente_ou_equipamento: "Radar 1", marca_especie: "VW/Polo", velocidade_medida: 70, velocidade_limite: 60, equipamento_afericao: "2026-03-01",
  origem: "upload", escopo: "automatizado", confianca: { placa: 0.99 }, criado_em: "",
};
const r = (m: Partial<Multa>, cod: string) => auditar({ ...base, ...m }).find((c) => c.regra === cod)?.resultado;

test("R01 prazo de expedição", () => {
  assert.equal(r({}, "R01"), "ok");
  assert.equal(r({ data_expedicao: "2026-10-15" }, "R01"), "possivel_nulidade");
  assert.equal(r({ data_expedicao: null }, "R01"), "nao_informado");
});
test("R02 campos obrigatórios", () => {
  assert.equal(r({}, "R02"), "ok");
  assert.equal(r({ marca_especie: null }, "R02"), "possivel_nulidade");
});
test("R03 aferição", () => {
  assert.equal(r({}, "R03"), "ok");
  assert.equal(r({ equipamento_afericao: null }, "R03"), "nao_informado");
  assert.equal(r({ equipamento_afericao: "2025-01-01" }, "R03"), "possivel_nulidade");
  assert.equal(r({ tipo: "estacionamento" }, "R03"), undefined);
});
test("R05 descrição x enquadramento", () => {
  assert.equal(r({}, "R05"), "ok");
  assert.equal(r({ velocidade_medida: 85 }, "R05"), "possivel_nulidade");
});
test("escopo", () => {
  assert.equal(classificarEscopo({ tipo: "cassacao", confianca: {} }).escopo, "sinalizado");
  assert.equal(classificarEscopo({ tipo: "velocidade", confianca: { equipamento_afericao: 0 } }).escopo, "automatizado");
  assert.equal(classificarEscopo({ tipo: "velocidade", confianca: { placa: 0.2 } }).escopo, "sinalizado");
});
test("estimativa exige amostra mínima", () => {
  const ck = auditar({ ...base, data_expedicao: "2026-10-15" });
  assert.equal(estimar(base, ck, [{ orgao: "DER-MG", argumento: "R01", uso: 10, exito: 9 }]).faixa, "indisponivel");
  assert.equal(estimar(base, ck, [{ orgao: "DER-MG", argumento: "R01", uso: 100, exito: 70 }]).faixa, "alta");
});

// Reconhecimento de quem enviou a notificação — a regra de comparação é pura (sem banco)
test("identificação do titular por nome", () => {
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/\s+/);
  const mesmo = (a: string, b: string) => norm(a)[0] === norm(b)[0] && norm(a).at(-1) === norm(b).at(-1);
  assert.ok(mesmo("MARINA SOUZA", "Marina Souza"));
  assert.ok(mesmo("MARINA DE OLIVEIRA SOUZA", "Marina Souza"));
  assert.ok(!mesmo("JOÃO PEREIRA LIMA", "Marina Souza"));
});

test("R07 prazo mínimo da defesa prévia (CTB art. 281-A)", () => {
  assert.equal(r({ data_expedicao: "2026-09-20", prazo: "2026-10-25" }, "R07"), "ok");
  assert.equal(r({ data_expedicao: "2026-09-20", prazo: "2026-10-05" }, "R07"), "possivel_nulidade");
  assert.equal(r({ fase: "jari" }, "R07"), undefined);
});
test("R08 imagem com a placa (medidor de velocidade)", () => {
  assert.equal(r({ imagem_placa: true }, "R08"), "ok");
  assert.equal(r({ imagem_placa: false }, "R08"), "possivel_nulidade");
  assert.equal(r({ imagem_placa: null }, "R08"), "nao_informado");
  assert.equal(r({ tipo: "estacionamento" }, "R08"), undefined);
});
