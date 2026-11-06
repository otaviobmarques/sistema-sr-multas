import { NextResponse } from "next/server";
import { audit, db, save, uid } from "@/lib/db";
import { analisar } from "@/lib/servico";
import { naoAutorizado, usuarioAtual } from "@/lib/session";
import type { Fase } from "@/lib/types";

const PROXIMA: Partial<Record<Fase, Fase>> = { defesa_previa: "jari", jari: "cetran" };

/** Indeferida → abre a fase seguinte da MESMA multa, sem consumir novo crédito (cap. 3, etapa 14). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  const d = db();
  const anterior = d.defesas.find((x) => x.id === id && x.dono_id === u.id);
  if (!anterior) return NextResponse.json({ erro: "Defesa não encontrada" }, { status: 404 });
  if (anterior.status !== "indeferida") return NextResponse.json({ erro: "A fase seguinte só abre quando a anterior foi indeferida" }, { status: 400 });
  if (anterior.proxima_fase_id) return NextResponse.json({ ok: true, defesa_id: anterior.proxima_fase_id });
  const fase = PROXIMA[anterior.fase];
  if (!fase) return NextResponse.json({ erro: "Não há fase administrativa seguinte (CETRAN é a última)" }, { status: 400 });
  const { prazo, data_expedicao } = (await req.json().catch(() => ({}))) as { prazo?: string; data_expedicao?: string };
  if (!prazo || !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) return NextResponse.json({ erro: "Informe o prazo para o recurso (consta na notificação da penalidade/decisão)" }, { status: 400 });

  const multa = d.multas.find((m) => m.id === anterior.multa_id)!;
  multa.fase = fase;
  multa.prazo = prazo;
  if (data_expedicao && /^\d{4}-\d{2}-\d{2}$/.test(data_expedicao)) multa.data_expedicao = data_expedicao;
  const nova = analisar(multa);
  nova.id = uid("def");
  nova.credito_consumido = true; // mesmo crédito da multa
  nova.fase_anterior_id = anterior.id;
  nova.relato = anterior.relato ?? null;
  anterior.proxima_fase_id = nova.id;
  d.defesas.unshift(nova);
  audit(u.id, "proxima_fase_aberta", `defesa:${nova.id}`, `${anterior.fase} → ${fase} · sem novo crédito`);
  await save();
  return NextResponse.json({ ok: true, defesa_id: nova.id });
}
