import { randomBytes } from "crypto";
import { audit, db, uid } from "./db";

export const formatarDoc = (doc: string) =>
  doc.length === 11 ? doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");

/** Regra de senha do sistema (mesma do cadastro). */
export const senhaValida = (s: string) => s.length >= 10 && /[A-Za-z]/.test(s) && /\d/.test(s);
export const MSG_SENHA = "A senha precisa ter ao menos 10 caracteres, com letras e números";

/** Senha temporária legível (sem caracteres ambíguos), 12 caracteres com letras e números. */
export function senhaTemporaria() {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const nums = "23456789";
  const b = randomBytes(12);
  const s = [...b].map((x, i) => (i % 4 === 3 ? nums[x % nums.length] : letras[x % letras.length])).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

/** Créditos de cortesia lançados pelo admin (não geram receita). Validade: 12 meses. */
export function lancarCortesia(usuarioId: string, quantidade: number, motivo: string, porId: string) {
  const validade = new Date();
  validade.setMonth(validade.getMonth() + 12);
  db().carteira.unshift({
    id: uid("cart"),
    usuario_id: usuarioId,
    quantidade,
    descricao: quantidade > 0 ? `Cortesia${motivo ? `: ${motivo}` : ""}` : `Ajuste do administrador${motivo ? `: ${motivo}` : ""}`,
    validade: quantidade > 0 ? validade.toISOString() : null,
    data: new Date().toISOString(),
  });
  audit(porId, quantidade > 0 ? "creditos_cortesia" : "creditos_ajuste", `usuario:${usuarioId}`, `${quantidade > 0 ? "+" : ""}${quantidade} crédito(s)${motivo ? ` · ${motivo}` : ""}`);
}
