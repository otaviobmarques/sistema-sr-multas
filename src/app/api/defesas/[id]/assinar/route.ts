import { NextResponse } from "next/server";
import { audit, db, save } from "@/lib/db";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

const DECLARACOES = ["data_hora", "local", "condutor", "documentos"];

/** Etapas 11–12: validação dos fatos pelo cliente + assinatura eletrônica. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  const d = db();
  const defesa = d.defesas.find((x) => x.id === id && x.dono_id === u.id);
  if (!defesa || !defesa.versoes.length) return NextResponse.json({ erro: "Defesa não encontrada" }, { status: 404 });
  const { declaracoes, nome } = (await req.json()) as { declaracoes: string[]; nome: string };
  if (!DECLARACOES.every((x) => declaracoes?.includes(x))) return NextResponse.json({ erro: "Confirme todos os fatos e declarações" }, { status: 400 });
  if (!nome || nome.trim().toLowerCase() !== u.nome.toLowerCase()) return NextResponse.json({ erro: "Digite seu nome completo exatamente como no cadastro para assinar" }, { status: 400 });
  const agora = new Date().toISOString();
  defesa.validacao = { fatos_confirmados: declaracoes, declaracoes, ip: req.headers.get("x-forwarded-for") ?? "local", data: agora };
  defesa.assinada_em = agora;
  defesa.status = "pronta_para_protocolar";
  audit(u.id, "defesa_assinada", `defesa:${defesa.id}`, `v${defesa.versoes.at(-1)!.versao}`);
  await save();
  return NextResponse.json({ ok: true, defesa });
}
