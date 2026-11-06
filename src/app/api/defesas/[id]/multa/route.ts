import { NextResponse } from "next/server";
import { db, save, audit } from "@/lib/db";
import { analisar, identificarRemetente } from "@/lib/servico";
import { usuarioAtual } from "@/lib/session";
import type { Multa } from "@/lib/types";

const EDITAVEIS: (keyof Multa)[] = ["placa", "numero_auto", "orgao", "esfera", "tipo", "enquadramento", "descricao", "local", "data_infracao", "data_expedicao", "prazo", "fase", "agente_ou_equipamento", "marca_especie", "velocidade_medida", "velocidade_limite", "equipamento_afericao"];

/** Cliente confirma/corrige os campos extraídos -> reauditoria determinística. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioAtual();
  const d = db();
  const defesa = d.defesas.find((x) => x.id === id && x.dono_id === u.id);
  if (!defesa) return NextResponse.json({ erro: "Não encontrada" }, { status: 404 });
  const multa = d.multas.find((m) => m.id === defesa.multa_id)!;
  const body = (await req.json()) as Partial<Multa>;
  for (const k of EDITAVEIS) {
    if (k in body) {
      (multa as unknown as Record<string, unknown>)[k] = body[k] === "" ? null : body[k];
      multa.confianca[k] = 1; // confirmado pelo cliente
    }
  }
  const EDIT_PROP = ["proprietario_nome"] as const;
  for (const k of EDIT_PROP) if (k in body) multa[k] = (body[k] as string) || null;
  multa.remetente = identificarRemetente(multa, u);
  if (defesa.status === "fora_do_escopo") defesa.status = "em_analise";
  analisar(multa, defesa);
  audit(u.id, "campos_confirmados", `multa:${multa.id}`);
  save();
  return NextResponse.json({ ok: true, defesa, multa });
}
