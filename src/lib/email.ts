/**
 * E-mails transacionais via Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Variáveis: RESEND_API_KEY e EMAIL_REMETENTE, ex.: "Senhor Multas <nao-responda@seudominio.com.br>"
 * (o domínio precisa estar verificado no Resend). Sem as duas, nada é enviado e a confirmação de e-mail não é exigida.
 */
import { createHash, randomBytes } from "crypto";
import { db, uid } from "./db";
import type { Usuario } from "./types";

/** Só envia com chave E remetente de domínio verificado (sem domínio, o Resend só entrega para o dono da conta). */
export const emailAtivo = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);
const remetente = () => process.env.EMAIL_REMETENTE!;
export const urlBase = () => (process.env.APP_URL && !process.env.APP_URL.includes("localhost") ? process.env.APP_URL : "https://senhormultas.com.br");

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Modelo HTML simples, compatível com os principais clientes de e-mail. */
function modelo(o: { titulo: string; paragrafos: string[]; botao?: { texto: string; url: string }; rodape?: string }) {
  const p = o.paragrafos.map((x) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155">${x}</p>`).join("");
  const botao = o.botao
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0"><tr><td style="background:#f2b705;border-radius:10px"><a href="${o.botao.url}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#13294b;text-decoration:none">${esc(o.botao.texto)}</a></td></tr></table>
       <p style="margin:0 0 14px;font-size:12px;color:#64748b">Se o botão não funcionar, copie e cole este endereço no navegador:<br><span style="word-break:break-all">${o.botao.url}</span></p>`
    : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f3ef;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f3ef;padding:28px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
    <tr><td style="background:#13294b;padding:20px 28px"><span style="font-size:20px;font-weight:900;color:#ffffff">Senhor</span> <span style="font-size:20px;font-weight:900;color:#f2b705">Multas</span></td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 16px;font-size:21px;color:#13294b">${esc(o.titulo)}</h1>
      ${p}${botao}
    </td></tr>
    <tr><td style="padding:16px 28px;background:#f8fafc;font-size:11px;line-height:1.5;color:#94a3b8">${o.rodape ?? "Você recebeu este e-mail porque tem uma conta no Senhor Multas. A defesa é gerada por IA e conferida e assinada por você; não há garantia de resultado."}</td></tr>
  </table></td></tr></table></body></html>`;
}

const texto = (o: { titulo: string; paragrafos: string[]; botao?: { texto: string; url: string } }) =>
  [o.titulo, "", ...o.paragrafos.map((p) => p.replace(/<[^>]+>/g, "")), ...(o.botao ? ["", `${o.botao.texto}: ${o.botao.url}`] : []), "", "— Senhor Multas"].join("\n");

export async function enviarEmail(u: Pick<Usuario, "id" | "email" | "nome">, tipo: string, assunto: string, corpo: Parameters<typeof modelo>[0], referencia?: string) {
  const registro = (status: "enviado" | "falhou" | "sem_configuracao", detalhe?: string) =>
    db().emails.unshift({ id: uid("eml"), usuario_id: u.id, tipo, referencia: referencia ?? null, status, detalhe: detalhe ?? null, data: new Date().toISOString() });
  if (u.email.endsWith("@senhormultas.interno")) return { ok: false, motivo: "conta interna sem e-mail" };
  if (!emailAtivo()) {
    registro("sem_configuracao", "RESEND_API_KEY ou EMAIL_REMETENTE (domínio verificado) ausente");
    return { ok: false, motivo: "envio de e-mail não configurado" };
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: remetente(), to: [u.email], subject: assunto, html: modelo(corpo), text: texto(corpo), tags: [{ name: "tipo", value: tipo }] }),
    });
    const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!r.ok) {
      registro("falhou", `${r.status} ${j.message ?? ""}`.slice(0, 200));
      return { ok: false, motivo: j.message ?? `erro ${r.status}` };
    }
    registro("enviado", j.id);
    return { ok: true };
  } catch (e) {
    registro("falhou", (e as Error).message.slice(0, 200));
    return { ok: false, motivo: "falha de conexão com o Resend" };
  }
}

// ---------------------------------------------------------------- Tokens de uso único
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export function criarToken(usuarioId: string, tipo: "senha" | "email", validadeMin: number) {
  const d = db();
  // invalida tokens anteriores do mesmo tipo
  for (const t of d.tokens) if (t.usuario_id === usuarioId && t.tipo === tipo && !t.usado_em) t.usado_em = new Date().toISOString();
  d.tokens = d.tokens.filter((t) => new Date(t.expira_em).getTime() > Date.now() - 7 * 86_400_000); // limpa antigos
  const token = randomBytes(32).toString("base64url");
  d.tokens.unshift({ id: hash(token), usuario_id: usuarioId, tipo, expira_em: new Date(Date.now() + validadeMin * 60_000).toISOString(), criado_em: new Date().toISOString() });
  return token;
}

/** Valida e consome o token. Retorna o id do usuário ou null. */
export function usarToken(token: string, tipo: "senha" | "email", consumir = true): string | null {
  if (!token || token.length < 20) return null;
  const t = db().tokens.find((x) => x.id === hash(token) && x.tipo === tipo);
  if (!t || t.usado_em || new Date(t.expira_em).getTime() < Date.now()) return null;
  if (consumir) t.usado_em = new Date().toISOString();
  return t.usuario_id;
}

// ---------------------------------------------------------------- Mensagens
export const Emails = {
  confirmar: (u: Usuario, token: string) =>
    enviarEmail(u, "confirmacao", "Confirme seu e-mail · Senhor Multas", {
      titulo: `Olá, ${esc(u.nome.split(" ")[0])}! Confirme seu e-mail`,
      paragrafos: ["Falta só um passo para você gerar sua Defesa Pronta. Clique no botão abaixo para confirmar que este e-mail é seu.", "O link vale por 48 horas."],
      botao: { texto: "Confirmar meu e-mail", url: `${urlBase()}/confirmar?token=${token}` },
    }),
  redefinir: (u: Usuario, token: string) =>
    enviarEmail(u, "redefinir_senha", "Redefinir sua senha · Senhor Multas", {
      titulo: "Redefinição de senha",
      paragrafos: ["Recebemos um pedido para redefinir a senha da sua conta. Se foi você, clique no botão abaixo e escolha uma nova senha.", "O link vale por <b>1 hora</b> e só pode ser usado uma vez. Se não foi você, ignore este e-mail: sua senha continua a mesma."],
      botao: { texto: "Criar nova senha", url: `${urlBase()}/redefinir?token=${token}` },
    }),
  convite: (u: Usuario, token: string, creditos: number) =>
    enviarEmail(u, "convite", "Seu acesso ao Senhor Multas", {
      titulo: `Olá, ${esc(u.nome.split(" ")[0])}! Seu acesso está pronto`,
      paragrafos: [
        "Você foi convidado(a) para usar o <b>Senhor Multas</b>: envie a foto da notificação e receba a Defesa Pronta em minutos, com lei e jurisprudência conferidas.",
        creditos > 0 ? `Sua conta já tem <b>${creditos === 1 ? "1 crédito" : `${creditos} créditos`}</b> de cortesia.` : "Depois de criar sua senha, é só enviar a primeira multa.",
        "Clique no botão para criar sua senha. O link vale por <b>7 dias</b> e só pode ser usado uma vez.",
      ],
      botao: { texto: "Criar minha senha", url: `${urlBase()}/redefinir?token=${token}` },
    }),
  pagamentoConfirmado: (u: Usuario, plano: string, creditos: number, pedidoId: string) =>
    enviarEmail(u, "pagamento_confirmado", "Pagamento confirmado · seus créditos já estão disponíveis", {
      titulo: "Pagamento confirmado ✅",
      paragrafos: [`Recebemos o pagamento do plano <b>${esc(plano)}</b>. ${creditos === 1 ? "1 crédito já está disponível" : `${creditos} créditos já estão disponíveis`} na sua conta.`, "Cada crédito cobre a defesa completa de uma multa, incluindo as fases seguintes (JARI e CETRAN)."],
      botao: { texto: "Enviar uma multa", url: `${urlBase()}/app/nova` },
    }, pedidoId),
  defesaPronta: (u: Usuario, defesaId: string, placa: string, orgao: string, prazo: string) =>
    enviarEmail(u, "defesa_pronta", `Sua Defesa Pronta está pronta para conferência · ${placa}`, {
      titulo: "Sua Defesa Pronta está pronta",
      paragrafos: [`A defesa da multa da placa <b>${esc(placa)}</b> (${esc(orgao)}) foi gerada e passou pela verificação automática das citações.`, `Agora é com você: <b>confira os fatos destacados</b>, peça ajustes se precisar e assine. Prazo para protocolar: <b>${esc(prazo)}</b>.`],
      botao: { texto: "Conferir e assinar", url: `${urlBase()}/app/defesas/${defesaId}` },
    }, defesaId),
  defesaAssinada: (u: Usuario, defesaId: string, protocolo: string, placa: string, orgao: string) =>
    enviarEmail(u, "defesa_assinada", `Defesa assinada · Protocolo ${protocolo}`, {
      titulo: "Defesa assinada ✅",
      paragrafos: [`Sua defesa da multa da placa <b>${esc(placa)}</b> (${esc(orgao)}) foi assinada eletronicamente e registrada com o protocolo <b>${esc(protocolo)}</b>.`, "Baixe a peça com o comprovante de protocolo (PDF ou DOCX) e protocole no órgão dentro do prazo. A página da defesa mostra o passo a passo."],
      botao: { texto: "Baixar peça e protocolo", url: `${urlBase()}/app/defesas/${defesaId}` },
    }, defesaId),
  prazo: (u: Usuario, defesaId: string, placa: string, orgao: string, prazo: string, dias: number, acao: string) =>
    enviarEmail(u, `prazo_${dias}d`, `${dias <= 1 ? "Último dia" : `Faltam ${dias} dias`}: prazo da sua defesa · ${placa}`, {
      titulo: dias <= 1 ? "Atenção: o prazo termina amanhã" : `Faltam ${dias} dias para o prazo`,
      paragrafos: [`O prazo da multa da placa <b>${esc(placa)}</b> (${esc(orgao)}) termina em <b>${esc(prazo)}</b>.`, `Próximo passo: <b>${esc(acao)}</b>. Depois do prazo, a defesa desta fase não poderá mais ser apresentada.`],
      botao: { texto: "Abrir minha defesa", url: `${urlBase()}/app/defesas/${defesaId}` },
    }, defesaId),
};
