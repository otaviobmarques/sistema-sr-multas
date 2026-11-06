import { NextResponse } from "next/server";
import { audit, db, save } from "@/lib/db";
import { naoAutorizado, usuarioAtual } from "@/lib/session";
import { hashTexto, proximoProtocolo, textoCanonico } from "@/lib/protocolo";
import { Emails } from "@/lib/email";
import { DOCS, faltantes } from "@/lib/documentos";
import { supabaseAtivo } from "@/lib/db";

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
  const multa = d.multas.find((m) => m.id === defesa.multa_id)!;
  if (supabaseAtivo()) {
    const faltam = await faltantes(d, defesa, multa);
    if (faltam.length) return NextResponse.json({ erro: `Antes de assinar, envie: ${faltam.map((t) => DOCS[t].rotulo).join(", ")}.`, faltam }, { status: 400 });
  }
  defesa.validacao = { fatos_confirmados: declaracoes, declaracoes, ip: (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim(), data: agora };
  defesa.hash_peca = hashTexto(textoCanonico(defesa, multa, u));
  defesa.protocolo_sm = proximoProtocolo();
  defesa.assinada_em = agora;
  defesa.status = "pronta_para_protocolar";
  await Emails.defesaAssinada(u, defesa.id, defesa.protocolo_sm, multa.placa, multa.orgao).catch(() => null);
  audit(u.id, "defesa_assinada", `defesa:${defesa.id}`, `v${defesa.versoes.at(-1)!.versao} · ${defesa.protocolo_sm} · sha256 ${defesa.hash_peca?.slice(0, 16)}`);
  await save();
  return NextResponse.json({ ok: true, defesa });
}
