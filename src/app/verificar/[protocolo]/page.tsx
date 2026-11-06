import Link from "next/link";
import { BadgeCheck, SearchX } from "lucide-react";
import { carregar, db } from "@/lib/db";
import { iniciais } from "@/lib/protocolo";
import { tipoPeca } from "@/lib/peca-formato";
import { Logo } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verificar protocolo · Senhor Multas", robots: { index: false } };

/** Verificação pública de autenticidade (sem dados pessoais). */
export default async function Verificar({ params }: { params: Promise<{ protocolo: string }> }) {
  const protocolo = decodeURIComponent((await params).protocolo).toUpperCase().trim();
  await carregar();
  const d = db();
  const defesa = /^SM-\d{4}-\d{6}$/.test(protocolo) ? d.defesas.find((x) => x.protocolo_sm === protocolo) : undefined;
  const multa = defesa ? d.multas.find((m) => m.id === defesa.multa_id) : undefined;
  const dono = defesa ? d.usuarios.find((u) => u.id === defesa.dono_id) : undefined;
  const placa = multa ? `${multa.placa.slice(0, 3)}•••${multa.placa.slice(-1)}` : "";
  const quando = (s: string) => new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" });
  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="panel relative w-full max-w-lg p-7 sm:p-8">
        <Link href="/" className="flex justify-center"><Logo size={34} /></Link>
        {defesa && multa && defesa.assinada_em ? (
          <>
            <div className="mt-6 flex items-center justify-center gap-2 text-ok"><BadgeCheck className="size-6" /><span className="text-lg font-semibold">Protocolo autêntico</span></div>
            <div className="mt-1 text-center font-mono text-xl font-bold text-white">{protocolo}</div>
            <dl className="mt-6 divide-y divide-white/5 text-sm">
              {([
                ["Peça", tipoPeca(multa).titulo],
                ["Órgão", multa.orgao],
                ["Placa", placa],
                ["Requerente", dono ? iniciais(dono.nome) : "—"],
                ["Assinada em", quando(defesa.assinada_em)],
                ["Situação", defesa.status === "deferida" ? "Deferida" : defesa.status === "indeferida" ? "Indeferida" : defesa.status === "protocolada" ? "Protocolada no órgão" : "Assinada"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-ink-400">{k}</dt><dd className="text-right text-white">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-4">
              <div className="label mb-1">Impressão digital da peça (SHA-256)</div>
              <div className="break-all rounded-lg bg-ink-950/60 p-2.5 font-mono text-[11px] text-ink-200">{defesa.hash_peca}</div>
              <p className="mt-2 text-[11px] text-ink-400">Confira se este código é igual ao impresso no comprovante. Se for, o documento é o mesmo que foi assinado no Senhor Multas.</p>
            </div>
          </>
        ) : (
          <div className="mt-6 text-center">
            <SearchX className="mx-auto size-10 text-bad" />
            <h1 className="mt-3 text-lg font-semibold text-white">Protocolo não encontrado</h1>
            <p className="mt-1 text-sm text-ink-400">Confira o número (formato SM-AAAA-000000). Documentos sem protocolo válido não foram assinados no Senhor Multas.</p>
          </div>
        )}
        <p className="mt-6 border-t border-white/5 pt-4 text-center text-[11px] text-ink-400">Por privacidade, esta página não mostra nomes nem documentos pessoais.</p>
      </div>
    </div>
  );
}
