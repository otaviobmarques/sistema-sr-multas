import { NextResponse } from "next/server";
import { audit, db, save } from "@/lib/db";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

/** Cliente informa o resultado do julgamento. Alimenta a jurimetria própria (órgão × argumento). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  const d = db();
  const defesa = d.defesas.find((x) => x.id === id && x.dono_id === u.id);
  if (!defesa) return NextResponse.json({ erro: "Defesa não encontrada" }, { status: 404 });
  if (defesa.status !== "protocolada") return NextResponse.json({ erro: "Informe o resultado só depois de protocolar" }, { status: 400 });
  const { resultado } = (await req.json().catch(() => ({}))) as { resultado?: string };
  if (resultado !== "deferida" && resultado !== "indeferida") return NextResponse.json({ erro: "Resultado inválido" }, { status: 400 });
  const multa = d.multas.find((m) => m.id === defesa.multa_id)!;

  defesa.status = resultado;
  defesa.resultado = resultado;
  defesa.resultado_em = new Date().toISOString();

  // jurimetria: argumentos efetivamente usados = regras que apontaram nulidade/omissão
  const argumentos = defesa.checklist.filter((c) => c.resultado === "possivel_nulidade" || c.resultado === "nao_informado").map((c) => c.regra);
  for (const a of argumentos) {
    let linha = d.jurimetria.find((j) => j.orgao === multa.orgao && j.argumento === a);
    if (!linha) d.jurimetria.push((linha = { orgao: multa.orgao, argumento: a, uso: 0, exito: 0 }));
    linha.uso++;
    if (resultado === "deferida") linha.exito++;
  }
  let porOrgao = d.resultados_orgao.find((r) => r.orgao === multa.orgao);
  if (!porOrgao) d.resultados_orgao.push((porOrgao = { orgao: multa.orgao, total: 0, deferidas: 0 }));
  porOrgao.total++;
  if (resultado === "deferida") porOrgao.deferidas++;

  audit(u.id, `resultado_${resultado}`, `defesa:${defesa.id}`, `${multa.orgao} · ${defesa.fase} · argumentos ${argumentos.join(",") || "—"}`);
  await save();
  return NextResponse.json({ ok: true });
}
