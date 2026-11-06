"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Barcode, Check, CheckCircle2, Copy, CreditCard, ExternalLink, Loader2, Lock, QrCode, Zap } from "lucide-react";
import { brl } from "@/components/ui";
import type { Pedido, Plano } from "@/lib/types";

const METODOS = [
  { k: "PIX", t: "Pix (QR Code)", i: QrCode },
  { k: "CREDIT_CARD", t: "Cartão", i: CreditCard },
  { k: "BOLETO", t: "Boleto", i: Barcode },
] as const;

export function Checkout({ planos, defesaRetorno, demo, podeSimular = true, metodos = ["PIX", "CREDIT_CARD", "BOLETO"], parcelasMax = 6, gatewayNome = "Asaas" }: { planos: Plano[]; defesaRetorno: string | null; demo: boolean; podeSimular?: boolean; metodos?: string[]; parcelasMax?: number; gatewayNome?: string }) {
  const router = useRouter();
  const [sel, setSel] = useState("pack5");
  const disponiveis = METODOS.filter((m) => metodos.includes(m.k));
  const [metodo, setMetodo] = useState<(typeof METODOS)[number]["k"]>(disponiveis[0]?.k ?? "PIX");
  const [parcelas, setParcelas] = useState(3);
  const [carregando, setCarregando] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [pago, setPago] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const plano = planos.find((p) => p.id === sel)!;

  // Aguarda a confirmação do gateway (webhook) consultando o pedido
  useEffect(() => {
    if (!pedido || pago || demo) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/pedidos/${pedido.id}`).then((r) => r.json()).catch(() => null);
      if (r?.status === "pago") {
        setPago(true);
        router.refresh();
      }
    }, 4000);
    return () => clearInterval(t);
  }, [pedido, pago, demo, router]);

  async function pagar() {
    setErro(null);
    setCarregando(true);
    const r = await fetch("/api/checkout", { method: "POST", body: JSON.stringify({ plano_id: sel, metodo, parcelas }) }).then((r) => r.json());
    setCarregando(false);
    if (r.erro) return setErro(r.erro);
    setPedido(r.pedido);
  }
  async function simular() {
    if (!pedido) return;
    setCarregando(true);
    await fetch("/api/demo/simular-pagamento", { method: "POST", body: JSON.stringify({ pedido_id: pedido.id }) });
    setCarregando(false);
    setPago(true);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {planos.map((p) => (
          <button
            key={p.id}
            onClick={() => p.preco && (setSel(p.id), setPedido(null), setPago(false))}
            className={clsx(
              "panel relative flex flex-col p-6 text-left transition",
              sel === p.id ? "!border-brand/60 shadow-[0_0_50px_-18px_var(--color-brand)]" : "hover:!border-white/15",
              !p.preco && "cursor-default",
            )}
          >
            {p.destaque && <span className="absolute -top-2.5 left-6 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-[#1a1203]">Mais escolhido</span>}
            <div className="text-sm text-ink-300">{p.nome}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-white">{p.preco ? brl(p.preco) : "Sob consulta"}</div>
            <div className="mt-1 text-xs text-ink-400">{p.preco && p.creditos ? `${brl(p.preco / p.creditos)} por defesa · ${p.validade_meses} meses` : "Frotas, lojas e parceiros"}</div>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-300">
              {p.beneficios.map((b) => <li key={b} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{b}</li>)}
            </ul>
            {p.preco ? (
              <span className={clsx("btn mt-6", sel === p.id ? "btn-primary" : "btn-ghost")}>{sel === p.id ? "Selecionado" : "Escolher"}</span>
            ) : (
              <a href="mailto:comercial@senhormultas.com.br" className="btn btn-ghost mt-6">Falar com comercial</a>
            )}
          </button>
        ))}
      </div>

      <div className="panel p-6">
        {!pedido ? (
          <div className="flex flex-wrap items-center gap-5">
            <div className="mr-auto">
              <div className="flex items-center gap-1.5 text-xs text-ink-400"><Lock className="size-3.5" /> Pagamento seguro via {gatewayNome}{demo && " · modo demonstração"}</div>
              <div className="mt-1 font-semibold text-white">{plano.nome} · {brl(plano.preco ?? 0)}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {disponiveis.length === 0 && <span className="text-sm text-warn">Nenhuma forma de pagamento ativa.</span>}
              {disponiveis.map(({ k, t, i: I }) => (
                <button key={k} onClick={() => setMetodo(k)} className={clsx("btn !py-2", metodo === k ? "bg-ok/10 text-ok ring-1 ring-ok/40" : "btn-ghost")}>
                  <I className="size-4" /> {t}
                </button>
              ))}
              {metodo === "CREDIT_CARD" && plano.id !== "avulso" && (
                <select className="input !w-auto" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
                  {Array.from({ length: parcelasMax }, (_, i) => i + 1).map((n) => <option key={n} value={n} className="bg-ink-900">{n}x de {brl((plano.preco ?? 0) / n)}</option>)}
                </select>
              )}
            </div>
            <button onClick={pagar} disabled={carregando || !disponiveis.length} className="btn btn-primary !px-6 !py-3">{carregando ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Pagar agora</button>
          </div>
        ) : pago ? (
          <div className="flex flex-wrap items-center gap-4">
            <CheckCircle2 className="size-8 text-ok" />
            <div className="mr-auto">
              <div className="font-semibold text-white">Pagamento confirmado · {pedido.creditos} crédito(s) liberado(s)</div>
              <div className="text-xs text-ink-400">Webhook processado com idempotência (o reenvio do mesmo evento foi ignorado). Recibo enviado no app e WhatsApp.</div>
            </div>
            {defesaRetorno ? (
              <button onClick={() => router.push(`/app/nova?defesa=${defesaRetorno}`)} className="btn btn-primary">Voltar e gerar a defesa</button>
            ) : (
              <button onClick={() => router.push("/app/nova")} className="btn btn-primary">Enviar uma multa</button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            {pedido.metodo === "PIX" && (
              <div className="grid size-44 place-items-center rounded-2xl bg-white p-3">
                {pedido.pix_qrcode_base64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`data:image/png;base64,${pedido.pix_qrcode_base64}`} alt="QR Code Pix" className="size-full" />
                ) : (
                  <FakeQr seed={pedido.id} />
                )}
              </div>
            )}
            <div>
              <div className="text-xs text-ink-400">Pedido {pedido.id} · cobrança {pedido.asaas_payment_id}</div>
              <div className="mt-1 text-lg font-semibold text-white">Aguardando pagamento · {brl(pedido.valor)}</div>
              {pedido.pix_payload && (
                <div className="mt-4">
                  <div className="label mb-1.5">Pix copia e cola</div>
                  <div className="flex gap-2">
                    <input readOnly className="input font-mono !text-xs" value={pedido.pix_payload} />
                    <button onClick={() => { navigator.clipboard.writeText(pedido.pix_payload!); setCopiado(true); }} className="btn btn-ghost">{copiado ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}</button>
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {pedido.invoice_url && <a href={pedido.invoice_url} target="_blank" className={pedido.pix_payload ? "btn btn-ghost" : "btn btn-primary"}><ExternalLink className="size-4" /> {pedido.pix_payload ? "Abrir fatura" : pedido.metodo === "BOLETO" ? "Abrir boleto" : "Ir para o pagamento"}</a>}
                {demo && !podeSimular && <p className="text-xs text-warn">Pagamentos online serão ativados em breve. Fale com o atendimento para liberar créditos.</p>}
                {demo && podeSimular && <button onClick={simular} disabled={carregando} className="btn btn-ok">{carregando ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Simular pagamento (webhook)</button>}
              </div>
              <p className="mt-3 flex items-center gap-2 text-[11px] text-ink-400">{!demo && <Loader2 className="size-3 animate-spin" />} Os créditos são liberados automaticamente quando o {gatewayNome} confirma o pagamento — esta tela atualiza sozinha.</p>
            </div>
          </div>
        )}
        {erro && <p className="mt-3 text-sm text-bad">{erro}</p>}
      </div>
      <p className="text-[11px] text-ink-400">Políticas de reembolso, cancelamento e validade devem ser aprovadas pelo jurídico e exibidas aqui antes do lançamento.</p>
    </div>
  );
}

function FakeQr({ seed }: { seed: string }) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const n = 25;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push((h >> 16) % 2 === 0);
  }
  const finder = (x: number, y: number) => [[0, 0], [n - 7, 0], [0, n - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
  const finderOn = (x: number, y: number) => {
    for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      const dx = x - fx, dy = y - fy;
      if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
    }
    return false;
  };
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="size-full" shapeRendering="crispEdges">
      {cells.map((on, i) => {
        const x = i % n, y = Math.floor(i / n);
        const fill = finder(x, y) ? finderOn(x, y) : on;
        return fill ? <rect key={i} x={x} y={y} width={1} height={1} fill="#05070f" /> : null;
      })}
    </svg>
  );
}
