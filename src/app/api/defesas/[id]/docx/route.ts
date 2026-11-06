import { audit, db, save } from "@/lib/db";
import { gerarDocx } from "@/lib/docx";
import { dadosDocumento } from "@/lib/comprovante";
import { usuarioAtual } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioAtual();
  if (!u) return new Response("Faça login", { status: 401 });
  const d = db();
  const defesa = d.defesas.find((x) => x.id === id && (x.dono_id === u.id || u.perfil === "admin"));
  if (!defesa?.versoes.length) return new Response("Não encontrada", { status: 404 });
  const multa = d.multas.find((m) => m.id === defesa.multa_id)!;
  const cliente = d.usuarios.find((x) => x.id === defesa.dono_id) ?? u;
  const { blocos, comprovante, versao } = await dadosDocumento(defesa, multa, cliente);
  if (defesa.dono_id !== u.id) {
    audit(u.id, "defesa_baixada_admin", `defesa:${defesa.id}`, "docx");
    await save();
  }
  const buf = await gerarDocx(blocos, versao.citacoes, comprovante);
  const nome = `${blocos.titulo.toLowerCase().replace(/[^a-z0-9à-ú]+/gi, "-")}-${multa.placa}${defesa.protocolo_sm ? `-${defesa.protocolo_sm}` : `-v${versao.versao}`}.docx`;
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="${nome}"` },
  });
}
