import { audit, db, save } from "@/lib/db";
import { naoAutorizado, usuarioAtual } from "@/lib/session";
import { listarArquivos } from "@/lib/documentos";

/** LGPD (art. 18, II e V): exporta todos os dados do titular em JSON. */
export async function GET() {
  const u = await usuarioAtual(true);
  if (!u) return naoAutorizado();
  const d = db();
  const multas = d.multas.filter((m) => m.dono_id === u.id);
  const dados = {
    gerado_em: new Date().toISOString(),
    controlador: "Senhor Multas",
    titular: u,
    veiculos: d.veiculos.filter((v) => v.dono_id === u.id),
    multas,
    defesas: d.defesas.filter((x) => x.dono_id === u.id),
    pedidos: d.pedidos.filter((p) => p.usuario_id === u.id),
    creditos: d.carteira.filter((c) => c.usuario_id === u.id),
    conversas: d.chat.filter((c) => c.usuario_id === u.id),
    solicitacoes_lgpd: d.solicitacoes_lgpd.filter((s) => s.usuario_id === u.id),
    registro_de_atividades: d.auditoria.filter((a) => a.usuario_id === u.id),
    documentos_enviados: (await listarArquivos(d.defesas.filter((x) => x.dono_id === u.id).map((x) => x.id))).map(({ id, tipo, nome, mime, tamanho, sha256, criado_em }) => ({ id, tipo, nome, mime, tamanho, sha256, criado_em, download: `/api/documentos/${id}` })),
    observacao: "A imagem da notificação não é armazenada: é lida pela IA no envio e descartada. Os documentos enviados (CNH, CRLV etc.) ficam guardados criptografados e podem ser baixados pelos links acima.",
  };
  audit(u.id, "lgpd_exportacao", `usuario:${u.id}`);
  await save();
  return new Response(JSON.stringify(dados, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="meus-dados-senhor-multas.json"` },
  });
}
