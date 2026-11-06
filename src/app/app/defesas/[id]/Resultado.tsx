"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Gavel, Loader2, PartyPopper, XCircle } from "lucide-react";
import { Card } from "@/components/ui";
import type { Defesa } from "@/lib/types";

const PROXIMA: Record<string, { nome: string; onde: string } | undefined> = {
  defesa_previa: { nome: "Recurso à JARI", onde: "o prazo consta na notificação de penalidade (NP)" },
  jari: { nome: "Recurso ao CETRAN", onde: "o prazo consta na notificação da decisão da JARI" },
};

export function Resultado({ defesa }: { defesa: Defesa }) {
  const router = useRouter();
  const [estado, setEstado] = useState<{ c?: boolean; erro?: string }>({});
  const [prazo, setPrazo] = useState("");
  const [expedicao, setExpedicao] = useState("");
  const post = async (url: string, body: unknown) => {
    setEstado({ c: true });
    const r = await fetch(url, { method: "POST", body: JSON.stringify(body) }).then((r) => r.json()).catch(() => ({ erro: "Falha de conexão" }));
    if (r.erro) return setEstado({ erro: r.erro }), null;
    setEstado({});
    return r;
  };
  const proxima = PROXIMA[defesa.fase];

  if (defesa.status === "protocolada")
    return (
      <Card className="!border-info/30">
        <div className="flex gap-3">
          <Gavel className="size-5 shrink-0 text-info" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white">Protocolada · {defesa.protocolo}</div>
            <p className="mt-1 text-sm text-ink-400">Quando o órgão julgar, informe aqui o resultado. Se for indeferida, você abre a próxima fase sem novo crédito.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={estado.c} onClick={async () => { if (confirm("Confirmar: a defesa foi DEFERIDA (multa cancelada)?") && (await post(`/api/defesas/${defesa.id}/resultado`, { resultado: "deferida" }))) router.refresh(); }} className="btn btn-ok"><CheckCircle2 className="size-4" /> Foi deferida</button>
              <button disabled={estado.c} onClick={async () => { if (confirm("Confirmar: a defesa foi INDEFERIDA?") && (await post(`/api/defesas/${defesa.id}/resultado`, { resultado: "indeferida" }))) router.refresh(); }} className="btn btn-ghost"><XCircle className="size-4" /> Foi indeferida</button>
            </div>
            {estado.erro && <p className="mt-2 text-sm text-bad">{estado.erro}</p>}
          </div>
        </div>
      </Card>
    );

  if (defesa.status === "deferida")
    return (
      <Card className="!border-ok/40 bg-ok/5">
        <div className="flex gap-3"><PartyPopper className="size-6 shrink-0 text-ok" /><div><div className="font-semibold text-white">Defesa deferida! 🎉</div><p className="mt-1 text-sm text-ink-400">A multa foi cancelada e os pontos não entram na sua CNH. Guarde o comprovante da decisão.</p></div></div>
      </Card>
    );

  if (defesa.status === "indeferida")
    return (
      <Card className="!border-bad/30">
        <div className="flex gap-3">
          <XCircle className="size-5 shrink-0 text-bad" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white">Defesa indeferida</div>
            {defesa.proxima_fase_id ? (
              <Link href={`/app/nova?defesa=${defesa.proxima_fase_id}`} className="btn btn-primary mt-3">Abrir a próxima fase <ArrowRight className="size-4" /></Link>
            ) : proxima ? (
              <>
                <p className="mt-1 text-sm text-ink-400">Você ainda pode recorrer: <b className="text-ink-200">{proxima.nome}</b>, <b className="text-ok">sem novo crédito</b>. Informe as datas da nova notificação ({proxima.onde}).</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label><span className="label mb-1 block">Prazo para recorrer</span><input type="date" className="input" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></label>
                  <label><span className="label mb-1 block">Expedição da notificação (opcional)</span><input type="date" className="input" value={expedicao} onChange={(e) => setExpedicao(e.target.value)} /></label>
                </div>
                <button disabled={estado.c || !prazo} onClick={async () => { const r = await post(`/api/defesas/${defesa.id}/proxima-fase`, { prazo, data_expedicao: expedicao || undefined }); if (r?.defesa_id) router.push(`/app/nova?defesa=${r.defesa_id}`); }} className="btn btn-primary mt-3">
                  {estado.c ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} Abrir {proxima.nome}
                </button>
              </>
            ) : (
              <p className="mt-1 text-sm text-ink-400">O CETRAN é a última instância administrativa. A partir daqui, só cabe discussão judicial — fora do atendimento automatizado.</p>
            )}
            {estado.erro && <p className="mt-2 text-sm text-bad">{estado.erro}</p>}
          </div>
        </div>
      </Card>
    );
  return null;
}
