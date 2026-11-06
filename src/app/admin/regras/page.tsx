import { exigirAdmin } from "@/lib/session";
import { situacaoDasRegras } from "@/lib/regras-validacao";
import { VERSAO_REGRAS } from "@/lib/rules";
import { Badge, Card, PageHeader } from "@/components/ui";
import { AssinarRegra } from "./AssinarRegra";

export const dynamic = "force-dynamic";

export default async function Regras() {
  await exigirAdmin();
  const regras = await situacaoDasRegras();
  const assinadas = regras.filter((r) => r.status === "assinada").length;
  const exigir = process.env.SM_EXIGIR_REGRAS_ASSINADAS === "1";
  return (
    <div>
      <PageHeader title="Regras do motor de nulidades" subtitle={`${VERSAO_REGRAS} · checklist determinístico · cada regra ligada aos dispositivos da base de leis`} />
      <div className={`mb-6 rounded-xl border p-4 text-sm ${assinadas === regras.length ? "border-ok/30 bg-ok/5 text-ok" : "border-warn/30 bg-warn/5 text-warn"}`}>
        <b>{assinadas} de {regras.length} regras assinadas por especialista.</b>{" "}
        {exigir
          ? "Modo de produção: só regras assinadas viram argumento nas peças."
          : "Antes do lançamento, todas devem ser revisadas e assinadas por especialista em direito de trânsito (descritivo, cap. 6). Depois, ative SM_EXIGIR_REGRAS_ASSINADAS=1 na Vercel."}
      </div>
      <div className="space-y-4">
        {regras.map((r) => (
          <Card key={r.codigo}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><span className="font-mono text-sm text-brand">{r.codigo}</span><span className="font-semibold text-white">{r.titulo}</span><span className="font-mono text-[11px] text-ink-400">v{r.versao}</span></div>
                {r.assinatura && (
                  <div className="mt-1 text-xs text-ink-400">
                    {r.status === "assinada" ? "Assinada" : "Assinatura anterior"} por <b className="text-ink-200">{r.assinatura.especialista}</b> (OAB {r.assinatura.oab}) em {new Date(r.assinatura.data).toLocaleString("pt-BR")}
                    {r.status === "revisar" && " — os dispositivos legais ou a versão da regra mudaram depois da assinatura"}
                  </div>
                )}
              </div>
              <Badge tone={r.status === "assinada" ? "ok" : r.status === "revisar" ? "bad" : "warn"}>{r.status === "assinada" ? "Assinada" : r.status === "revisar" ? "Revisar (lei ou regra mudou)" : "Pendente de assinatura"}</Badge>
            </div>
            <p className="mt-3 rounded-xl bg-white/[.03] p-3 text-sm leading-relaxed text-ink-300"><span className="label mr-2">Lógica</span>{r.logica}</p>
            <div className="mt-3 space-y-2">
              {r.normas.map((id) => {
                const t = r.trechos.find((x) => x.id === id);
                return (
                  <div key={id} className="rounded-xl border border-white/6 bg-ink-950/40 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-ink-200">{t?.rotulo ?? id}</span>
                      {!t ? <Badge tone="bad">Ausente na base</Badge> : t.origem === "curadoria" ? <Badge tone={t.validada_em ? "ok" : "warn"}>{t.validada_em ? "Curadoria validada" : "Curadoria pendente"}</Badge> : <Badge tone="neutral">ctresb/leis · texto vigente</Badge>}
                    </div>
                    {t && <p className="mt-1.5 leading-relaxed text-ink-300">{t.contexto && t.nivel !== "caput" && <span className="text-ink-400">{t.contexto.slice(0, 160)}{t.contexto.length > 160 ? "…" : ""} → </span>}{t.texto}</p>}
                    {t?.nota && <p className="mt-1 text-[11px] text-ink-400">{t.nota}</p>}
                  </div>
                );
              })}
              {!r.normas.length && <p className="text-sm text-ink-400">Regra de controle de prazo (sem fundamento citado na peça).</p>}
            </div>
            {r.status !== "assinada" && <AssinarRegra codigo={r.codigo} versao={r.versao} />}
          </Card>
        ))}
      </div>
    </div>
  );
}
