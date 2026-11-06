import { db } from "@/lib/db";
import { gerarDocx } from "@/lib/docx";
import { naoAutorizado, usuarioAtual } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  const d = db();
  const defesa = d.defesas.find((x) => x.id === id && x.dono_id === u.id);
  const v = defesa?.versoes.at(-1);
  if (!defesa || !v) return new Response("Não encontrada", { status: 404 });
  const multa = d.multas.find((m) => m.id === defesa.multa_id)!;
  const buf = await gerarDocx(v.conteudo, v.citacoes, u, defesa.assinada_em);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="defesa-${multa.placa}-${multa.orgao.replace(/\W/g, "")}-v${v.versao}.docx"`,
    },
  });
}
