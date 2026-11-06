import { NextResponse } from "next/server";
import { audit, db, save } from "@/lib/db";
import { REGRAS } from "@/lib/rules";
import { situacaoDasRegras } from "@/lib/regras-validacao";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

/** Especialista assina uma regra do motor (versão + hash dos dispositivos legais atuais). */
export async function POST(req: Request) {
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  if (!["admin", "qualidade"].includes(u.perfil)) return NextResponse.json({ erro: "Somente a equipe de qualidade" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { codigo?: string; especialista?: string; oab?: string; observacoes?: string; declaracao?: boolean };
  const regra = REGRAS.find((r) => r.codigo === b.codigo);
  if (!regra) return NextResponse.json({ erro: "Regra inexistente" }, { status: 400 });
  if (!b.especialista?.trim() || b.especialista.trim().split(" ").length < 2) return NextResponse.json({ erro: "Informe o nome completo do especialista" }, { status: 400 });
  if (!/^[A-Za-z]{2}\s?\d{3,7}/.test((b.oab ?? "").trim())) return NextResponse.json({ erro: "Informe a OAB no formato UF 123456" }, { status: 400 });
  if (!b.declaracao) return NextResponse.json({ erro: "Confirme a declaração de revisão" }, { status: 400 });
  const sit = (await situacaoDasRegras()).find((s) => s.codigo === regra.codigo)!;
  if (sit.trechos.length !== regra.normas.length) return NextResponse.json({ erro: "Há dispositivos desta regra ausentes na base — corrija antes de assinar" }, { status: 400 });
  const v = {
    id: `${regra.codigo}@${regra.versao}@${Date.now()}`,
    codigo: regra.codigo,
    versao: regra.versao,
    especialista: b.especialista.trim(),
    oab: b.oab!.trim().toUpperCase(),
    usuario_id: u.id,
    hash_fontes: sit.hash,
    observacoes: b.observacoes?.trim().slice(0, 1000) || null,
    data: new Date().toISOString(),
  };
  db().validacoes_regras.unshift(v);
  audit(u.id, "regra_assinada", `regra:${regra.codigo}@${regra.versao}`, `${v.especialista} (OAB ${v.oab}) · fontes ${v.hash_fontes}`);
  await save();
  return NextResponse.json({ ok: true });
}
