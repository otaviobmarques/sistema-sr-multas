// Tokens de uso único (redefinição de senha / confirmação de e-mail)
import { test } from "node:test";
import assert from "node:assert/strict";
import { criarToken, usarToken } from "../src/lib/email.ts";
import { db } from "../src/lib/db.ts";

test("token vale uma vez, só para o tipo certo, e o novo invalida o anterior", () => {
  const d = db();
  d.tokens = [];
  const t1 = criarToken("u_x", "senha", 60);
  assert.equal(usarToken(t1, "email"), null); // tipo errado
  assert.equal(usarToken("x".repeat(43), "senha"), null); // token inexistente
  const t2 = criarToken("u_x", "senha", 60); // invalida o t1
  assert.equal(usarToken(t1, "senha"), null);
  assert.equal(usarToken(t2, "senha"), "u_x");
  assert.equal(usarToken(t2, "senha"), null); // já usado
  assert.ok(d.tokens.every((t) => t.id !== t2)); // guarda só o hash
});

test("token expirado é recusado", () => {
  const t = criarToken("u_y", "email", -1);
  assert.equal(usarToken(t, "email"), null);
});
