"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, Barcode, Check, CheckCircle2, Copy, CreditCard, FlaskConical, KeyRound, Loader2, PlugZap, QrCode, Rocket, Save, Wand2, XCircle } from "lucide-react";
import { Badge, Card, CardTitle } from "@/components/ui";

type G = "asaas" | "mercadopago" | "stripe";
type A = "teste" | "producao";
type Campo = { chave: string; rotulo: string; publico?: boolean; ajuda: string };

const NOMES: Record<G, string> = { asaas: "Asaas", mercadopago: "Mercado Pago", stripe: "Stripe" };
const DESC: Record<G, string> = {
  asaas: "Pix, boleto e cartão · split automático para parceiros · nota fiscal",
  mercadopago: "Pix com QR na tela · cartão e boleto pelo Checkout Pro",
  stripe: "Cartão (com parcelas no Brasil), Pix e boleto pelo Stripe Checkout",
};

const PASSOS: Record<G, { onde: string; passos: string[]; eventos: string[]; obs: string }> = {
  asaas: {
    onde: "Asaas → Integrações (menu do usuário) → Webhooks → Adicionar",
    passos: [
      "Nome: Senhor Multas · URL: a URL ao lado",
      "E-mail para avisos de falha: o seu e-mail",
      "Versão da API: v3 · Tipo de envio: sequencial",
      "Token de autenticação: cole o token do campo “Token do webhook” (use Gerar, salve aqui e cole lá)",
      "Ative o webhook e marque os eventos abaixo",
      "Repita na conta Sandbox (teste) e na conta de Produção — são contas separadas, cada uma com sua chave e token",
    ],
    eventos: ["PAYMENT_CREATED (cobrança criada)", "PAYMENT_CONFIRMED (pagamento confirmado)", "PAYMENT_RECEIVED (pagamento recebido)", "PAYMENT_OVERDUE (cobrança vencida)", "PAYMENT_REFUNDED (cobrança estornada)", "PAYMENT_CHARGEBACK_REQUESTED (chargeback solicitado)"],
    obs: "Os nomes dos menus podem variar conforme a versão do painel do Asaas.",
  },
  mercadopago: {
    onde: "Mercado Pago Developers → Suas integrações → sua aplicação → Webhooks → Configurar notificações",
    passos: [
      "Preencha a URL ao lado em “Modo de teste” e também em “Modo produção”",
      "Evento: Pagamentos",
      "Salve e copie a “Assinatura secreta” para o campo correspondente aqui (teste e produção)",
      "Credenciais: Suas integrações → Credenciais de teste (TEST-…) e de produção (APP_USR-…)",
    ],
    eventos: ["Pagamentos (payment)"],
    obs: "O sistema sempre consulta o pagamento na API do Mercado Pago antes de liberar créditos.",
  },
  stripe: {
    onde: "Stripe Dashboard → Developers → Webhooks → Add endpoint",
    passos: [
      "Endpoint URL: a URL ao lado",
      "Selecione os eventos abaixo e salve",
      "Copie o “Signing secret” (whsec_…) para o campo correspondente aqui",
      "Faça isso uma vez em Test mode e outra em Live mode (cada modo tem seu próprio secret)",
      "Pix e boleto precisam estar ativos em Settings → Payment methods (conta brasileira)",
    ],
    eventos: ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired", "charge.refunded", "charge.dispute.created"],
    obs: "Parcelamento no cartão depende da conta Stripe Brasil estar habilitada para installments.",
  },
};

export function ConfigPagamentosForm({
  inicial,
  campos,
  estado,
  prontos,
  base,
  atualizado,
}: {
  inicial: { gateway: G; ambiente: A; metodos: Record<"PIX" | "CREDIT_CARD" | "BOLETO", boolean>; parcelas_max: number; vencimento_dias: number };
  campos: Record<G, Campo[]>;
  estado: Record<G, Record<A, Record<string, string | null>>>;
  prontos: Record<G, Record<A, boolean>>;
  base: string;
  atualizado: string | null;
}) {
  const router = useRouter();
  const [f, setF] = useState(inicial);
  const [aba, setAba] = useState<G>(inicial.gateway);
  const [cred, setCred] = useState<Record<string, string>>({}); // chave: g/a/campo
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [teste, setTeste] = useState<Record<string, { carregando?: boolean; ok?: boolean; detalhe?: string }>>({});
  const [copiado, setCopiado] = useState<string | null>(null);

  const copiar = (t: string) => {
    navigator.clipboard.writeText(t);
    setCopiado(t);
    setTimeout(() => setCopiado(null), 1500);
  };
  const gerarToken = (g: G, a: A) => {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const tok = "sm_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    setCred({ ...cred, [`${g}/${a}/webhook_token`]: tok });
  };

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    const credenciais: Record<string, Record<string, Record<string, string>>> = {};
    for (const [k, v] of Object.entries(cred)) {
      if (!v) continue;
      const [g, a, c] = k.split("/");
      ((credenciais[g] ??= {})[a] ??= {})[c] = v;
    }
    const r = await fetch("/api/admin/pagamentos", { method: "POST", body: JSON.stringify({ acao: "salvar", ...f, credenciais }) }).then((r) => r.json()).catch(() => ({ erro: "Falha de conexão" }));
    setSalvando(false);
    if (r.erro) return setMsg({ ok: false, texto: r.erro });
    setCred({});
    setMsg({ ok: true, texto: "Configuração salva." });
    router.refresh();
  }
  async function testar(g: G, a: A) {
    const k = `${g}/${a}`;
    setTeste({ ...teste, [k]: { carregando: true } });
    const r = await fetch("/api/admin/pagamentos", { method: "POST", body: JSON.stringify({ acao: "testar", gateway: g, ambiente: a }) }).then((r) => r.json()).catch(() => ({ ok: false, detalhe: "Falha de conexão" }));
    setTeste((t) => ({ ...t, [k]: { ok: r.ok, detalhe: r.detalhe ?? r.erro } }));
  }

  const pendentes = Object.values(cred).filter(Boolean).length;
  const ativoPronto = prontos[f.gateway][f.ambiente];

  return (
    <div className="space-y-6">
      {/* Ambiente + gateway */}
      <Card>
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <div>
            <CardTitle>Ambiente</CardTitle>
            <div className="inline-grid grid-cols-2 rounded-xl bg-white/[.04] p-1">
              {(["teste", "producao"] as A[]).map((a) => (
                <button key={a} onClick={() => setF({ ...f, ambiente: a })} className={clsx("flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition", f.ambiente === a ? (a === "producao" ? "bg-ok/15 text-ok ring-1 ring-ok/40" : "bg-warn/15 text-warn ring-1 ring-warn/40") : "text-ink-400 hover:text-white")}>
                  {a === "teste" ? <FlaskConical className="size-4" /> : <Rocket className="size-4" />} {a === "teste" ? "Teste" : "Produção"}
                </button>
              ))}
            </div>
            <p className="mt-2 max-w-xs text-[11px] text-ink-400">{f.ambiente === "teste" ? "Cobranças de teste: nenhum dinheiro real é movimentado." : "Cobranças reais. Confira as credenciais de produção antes de salvar."}</p>
          </div>
          <div>
            <CardTitle>Gateway ativo</CardTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(NOMES) as G[]).map((g) => (
                <button key={g} onClick={() => { setF({ ...f, gateway: g }); setAba(g); }} className={clsx("rounded-xl border p-4 text-left transition", f.gateway === g ? "border-brand/60 bg-brand/5" : "border-white/8 hover:border-white/20")}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{NOMES[g]}</span>
                    {f.gateway === g && <Check className="size-4 text-brand" />}
                  </div>
                  <div className="mt-1 text-xs text-ink-400">{DESC[g]}</div>
                  <div className="mt-2 flex gap-1.5">
                    <Badge tone={prontos[g].teste ? "ok" : "neutral"}>teste {prontos[g].teste ? "✓" : "—"}</Badge>
                    <Badge tone={prontos[g].producao ? "ok" : "neutral"}>produção {prontos[g].producao ? "✓" : "—"}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        {!ativoPronto && (
          <div className="mt-4 flex gap-2 rounded-xl border border-warn/30 bg-warn/5 p-3 text-sm text-warn">
            <AlertTriangle className="size-4 shrink-0" /> {NOMES[f.gateway]} ainda sem credencial no ambiente de {f.ambiente === "teste" ? "teste" : "produção"}: o checkout fica em modo simulado (só administradores conseguem simular pagamentos).
          </div>
        )}
      </Card>

      {/* Formas de pagamento */}
      <Card>
        <CardTitle>Formas de pagamento oferecidas ao cliente</CardTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {([["PIX", "Pix", QrCode], ["CREDIT_CARD", "Cartão de crédito", CreditCard], ["BOLETO", "Boleto", Barcode]] as const).map(([k, rot, I]) => (
            <label key={k} className={clsx("flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition", f.metodos[k] ? "border-ok/40 bg-ok/5" : "border-white/8")}>
              <input type="checkbox" className="size-4 accent-emerald-400" checked={f.metodos[k]} onChange={(e) => setF({ ...f, metodos: { ...f.metodos, [k]: e.target.checked } })} />
              <I className="size-5 text-ink-300" />
              <span className="font-medium text-white">{rot}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label mb-1.5 block">Parcelas máximas no cartão (pacotes)</span>
            <select className="input" value={f.parcelas_max} onChange={(e) => setF({ ...f, parcelas_max: Number(e.target.value) })}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n} className="bg-ink-900">{n === 1 ? "À vista" : `Até ${n}x`}</option>)}
            </select>
            <span className="mt-1 block text-[11px] text-ink-400">O plano Avulso é sempre à vista.</span>
          </label>
          <label className="block">
            <span className="label mb-1.5 block">Vencimento do Pix / boleto (dias)</span>
            <input type="number" min={1} max={30} className="input" value={f.vencimento_dias} onChange={(e) => setF({ ...f, vencimento_dias: Number(e.target.value) })} />
          </label>
        </div>
      </Card>

      {/* Credenciais e webhooks */}
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(NOMES) as G[]).map((g) => (
            <button key={g} onClick={() => setAba(g)} className={clsx("btn !py-2", aba === g ? "bg-white/10 text-white ring-1 ring-white/20" : "btn-ghost")}>
              <KeyRound className="size-4" /> {NOMES[g]}
            </button>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {(["teste", "producao"] as A[]).map((a) => (
            <div key={a} className={clsx("rounded-xl border p-4", a === "producao" ? "border-ok/20" : "border-warn/20")}>
              <div className="mb-3 flex items-center justify-between">
                <span className={clsx("flex items-center gap-2 text-sm font-semibold", a === "producao" ? "text-ok" : "text-warn")}>{a === "teste" ? <FlaskConical className="size-4" /> : <Rocket className="size-4" />} {NOMES[aba]} · {a === "teste" ? "Teste" : "Produção"}</span>
                <button onClick={() => testar(aba, a)} className="btn btn-ghost !py-1.5 !text-xs" disabled={teste[`${aba}/${a}`]?.carregando}>
                  {teste[`${aba}/${a}`]?.carregando ? <Loader2 className="size-3.5 animate-spin" /> : <PlugZap className="size-3.5" />} Testar conexão
                </button>
              </div>
              {teste[`${aba}/${a}`]?.detalhe && (
                <div className={clsx("mb-3 flex gap-2 rounded-lg p-2 text-xs", teste[`${aba}/${a}`]?.ok ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad")}>
                  {teste[`${aba}/${a}`]?.ok ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />} {teste[`${aba}/${a}`]?.detalhe}
                </div>
              )}
              <div className="space-y-3">
                {campos[aba].map((c) => {
                  const k = `${aba}/${a}/${c.chave}`;
                  const atual = estado[aba][a][c.chave];
                  return (
                    <label key={k} className="block">
                      <span className="mb-1.5 flex items-center justify-between">
                        <span className="label">{c.rotulo}</span>
                        {atual && <span className="font-mono text-[10px] text-ok">configurado {c.publico ? "" : atual}</span>}
                      </span>
                      <div className="flex gap-2">
                        <input
                          className="input font-mono !text-xs"
                          type={c.publico || c.chave === "webhook_token" ? "text" : "password"}
                          autoComplete="off"
                          placeholder={atual ? (c.publico ? atual : "manter o atual — digite para substituir") : "não configurado"}
                          value={cred[k] ?? ""}
                          onChange={(e) => setCred({ ...cred, [k]: e.target.value })}
                        />
                        {c.chave === "webhook_token" && <button type="button" onClick={() => gerarToken(aba, a)} className="btn btn-ghost !px-2.5" title="Gerar token"><Wand2 className="size-4" /></button>}
                        {c.chave === "webhook_token" && cred[k] && <button type="button" onClick={() => copiar(cred[k])} className="btn btn-ghost !px-2.5" title="Copiar token">{copiado === cred[k] ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}</button>}
                      </div>
                      <span className="mt-1 block text-[11px] text-ink-400">{c.ajuda}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="label mb-1.5">URL do webhook (teste e produção)</div>
            <div className="flex gap-2">
              <input readOnly className="input font-mono !text-xs" value={`${base}/api/webhooks/${aba}`} />
              <button onClick={() => copiar(`${base}/api/webhooks/${aba}`)} className="btn btn-ghost">{copiado === `${base}/api/webhooks/${aba}` ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}</button>
            </div>
            <div className="label mb-1.5 mt-4">Eventos a marcar</div>
            <ul className="space-y-1 font-mono text-[11px] text-ink-300">{PASSOS[aba].eventos.map((e) => <li key={e}>• {e}</li>)}</ul>
          </div>
          <div className="rounded-xl bg-white/[.03] p-4 text-sm">
            <div className="font-medium text-white">Onde cadastrar: <span className="text-ink-300">{PASSOS[aba].onde}</span></div>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-300">{PASSOS[aba].passos.map((p) => <li key={p}>{p}</li>)}</ol>
            <p className="mt-2 text-[11px] text-ink-400">{PASSOS[aba].obs}</p>
          </div>
        </div>
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/95 p-4 backdrop-blur">
        <div className="text-xs text-ink-400">
          {pendentes ? <span className="text-warn">{pendentes} credencial(is) a salvar · </span> : null}
          As chaves ficam criptografadas no banco e nunca voltam para a tela.{atualizado && ` Última alteração: ${atualizado}.`}
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className={clsx("text-sm", msg.ok ? "text-ok" : "text-bad")}>{msg.texto}</span>}
          <button onClick={salvar} disabled={salvando} className="btn btn-primary">{salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar configuração</button>
        </div>
      </div>
    </div>
  );
}
