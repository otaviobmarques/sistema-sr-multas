"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Loader2 } from "lucide-react";

export function AssinarRegra({ codigo, versao }: { codigo: string; versao: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ especialista: "", oab: "", observacoes: "", declaracao: false });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function assinar() {
    setErro(null);
    setCarregando(true);
    const r = await fetch("/api/admin/regras", { method: "POST", body: JSON.stringify({ codigo, ...f }) }).then((r) => r.json());
    setCarregando(false);
    if (r.erro) return setErro(r.erro);
    router.refresh();
  }
  if (!aberto) return <button onClick={() => setAberto(true)} className="btn btn-ghost mt-4"><FileSignature className="size-4" /> Revisar e assinar {codigo}</button>;
  return (
    <div className="mt-4 rounded-xl border border-brand/30 bg-brand/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Nome completo do especialista" value={f.especialista} onChange={(e) => setF({ ...f, especialista: e.target.value })} />
        <input className="input" placeholder="OAB (ex.: MG 123456)" value={f.oab} onChange={(e) => setF({ ...f, oab: e.target.value })} />
        <textarea className="input sm:col-span-2" placeholder="Observações (opcional)" value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} />
      </div>
      <label className="mt-3 flex items-start gap-2 text-xs text-ink-300">
        <input type="checkbox" className="mt-0.5 size-4 accent-amber-400" checked={f.declaracao} onChange={(e) => setF({ ...f, declaracao: e.target.checked })} />
        Declaro que revisei a regra {codigo} (v{versao}), a lógica de verificação e os dispositivos legais acima, e que estão corretos e vigentes.
      </label>
      {erro && <p className="mt-2 text-sm text-bad">{erro}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={() => setAberto(false)} className="btn btn-ghost">Cancelar</button>
        <button onClick={assinar} disabled={carregando} className="btn btn-primary">{carregando ? <Loader2 className="size-4 animate-spin" /> : <FileSignature className="size-4" />} Assinar regra</button>
      </div>
    </div>
  );
}
