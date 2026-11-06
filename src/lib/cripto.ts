/**
 * Criptografia das credenciais dos gateways (AES-256-GCM).
 * Chave: SM_CONFIG_KEY (recomendado) ou derivada de SM_SERVER_SECRET.
 * As chaves de API nunca são devolvidas ao navegador depois de salvas.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function chave() {
  const base = process.env.SM_CONFIG_KEY || process.env.SM_SERVER_SECRET;
  if (!base) throw new Error("Configure SM_CONFIG_KEY para guardar credenciais");
  return createHash("sha256").update(`senhor-multas:config:${base}`).digest();
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return `v1:${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${dados.toString("base64")}`;
}

export function decifrar(valor: string | null | undefined): string | null {
  if (!valor) return null;
  try {
    const [v, iv, tag, dados] = valor.split(":");
    if (v !== "v1") return null;
    const d = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(dados, "base64")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** "sk_test_…1234" → "••••1234" */
export const mascarar = (s: string | null) => (s ? `••••${s.slice(-4)}` : null);
