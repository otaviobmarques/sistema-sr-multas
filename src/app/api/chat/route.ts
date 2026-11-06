import { NextResponse } from "next/server";
import { db, save, uid } from "@/lib/db";
import { usuarioAtual } from "@/lib/session";
import { responder } from "@/lib/ai/assistant";
import { extrair } from "@/lib/ai/extractor";
import { multaDeExtracao, registrarMulta } from "@/lib/servico";
import type { MensagemChat } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const FASES: Record<string, string> = { defesa_previa: "Defesa Prévia", jari: "JARI", cetran: "CETRAN", indicacao_condutor: "Indicação de condutor" };

export async function GET() {
  const u = await usuarioAtual();
  return NextResponse.json({ mensagens: db().chat.filter((m) => m.usuario_id === u.id) });
}

export async function POST(req: Request) {
  const u = await usuarioAtual();
  const d = db();
  const form = await req.formData();
  const texto = String(form.get("texto") ?? "").slice(0, 2000);
  const file = form.get("arquivo");
  const agora = () => new Date().toISOString();
  const add = (m: Omit<MensagemChat, "id" | "usuario_id" | "data">) => {
    const msg = { id: uid("msg"), usuario_id: u.id, data: agora(), ...m };
    d.chat.push(msg);
    return msg;
  };

  try {
    if (file instanceof File && file.size) {
      add({ papel: "user", texto: texto || "Enviei a notificação.", anexo: file.name });
      const { dados } = await extrair({ base64: Buffer.from(await file.arrayBuffer()).toString("base64"), mime: file.type, nome: file.name });
      const multa = multaDeExtracao(dados, u.id, file.name, "whatsapp");
      const defesa = registrarMulta(multa);
      const pontos = defesa.checklist.filter((c) => c.resultado === "possivel_nulidade" || c.resultado === "nao_informado").length;
      const dias = Math.ceil((new Date(multa.prazo).getTime() - Date.now()) / 86_400_000);
      const est = defesa.estimativa.faixa === "indisponivel" ? "ainda sem amostra suficiente" : defesa.estimativa.faixa;
      const resposta =
        defesa.status === "fora_do_escopo"
          ? `Li sua notificação: **${multa.placa}** · ${multa.orgao} · ${multa.descricao}. Este caso (${multa.descricao.toLowerCase()}) precisa de análise especial e foi sinalizado — ele não consome crédito.`
          : `Li sua notificação:\n**Placa:** ${multa.placa} · **Órgão:** ${multa.orgao}\n**Infração:** ${multa.descricao}\n**Fase:** ${FASES[multa.fase]} · **prazo:** ${dias} dias\n\nEncontrei **${pontos} ponto(s) de atenção** que podem sustentar uma defesa. Estimativa de êxito: **${est}**.`;
      add({
        papel: "assistant",
        texto: resposta,
        cartao: { tipo: "resumo_multa", multa_id: multa.id },
        acoes: defesa.status === "fora_do_escopo" ? [{ rotulo: "Ver detalhes", href: `/app/defesas/${defesa.id}` }] : [
          { rotulo: "Quero a defesa", href: `/app/nova?defesa=${defesa.id}` },
          { rotulo: "Comparar com desconto", href: `/app/nova?defesa=${defesa.id}#comparar` },
        ],
      });
    } else {
      if (!texto.trim()) return NextResponse.json({ erro: "Mensagem vazia" }, { status: 400 });
      add({ papel: "user", texto });
      const hist = d.chat.filter((m) => m.usuario_id === u.id).map((m) => ({ papel: m.papel, texto: m.texto }));
      const r = await responder(u.id, hist);
      add({ papel: "assistant", texto: r, acoes: /checkout|plano/i.test(r) ? [{ rotulo: "Ver planos", href: "/app/planos" }] : undefined });
    }
    save();
    return NextResponse.json({ mensagens: d.chat.filter((m) => m.usuario_id === u.id) });
  } catch (e) {
    add({ papel: "assistant", texto: `Não consegui concluir agora (${(e as Error).message}). Tente novamente em instantes.` });
    save();
    return NextResponse.json({ mensagens: d.chat.filter((m) => m.usuario_id === u.id) });
  }
}
