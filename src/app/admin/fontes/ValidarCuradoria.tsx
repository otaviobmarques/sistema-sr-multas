"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2 } from "lucide-react";

export function ValidarCuradoria({ normaId, validada }: { normaId: string; validada: boolean }) {
  const router = useRouter();
  const [por, setPor] = useState("");
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function enviar(retirar = false) {
    setCarregando(true);
    setErro(null);
    const r = await fetch("/api/admin/normas", { method: "POST", body: JSON.stringify({ norma_id: normaId, por, retirar }) }).then((r) => r.json());
    setCarregando(false);
    if (r.erro) return setErro(r.erro);
    setAberto(false);
    router.refresh();
  }
  if (validada) return <button onClick={() => enviar(true)} className="btn btn-ghost !py-1.5 !text-xs">Retirar validação</button>;
  if (!aberto) return <button onClick={() => setAberto(true)} className="btn btn-ghost !py-1.5 !text-xs"><BadgeCheck className="size-4" /> Validar</button>;
  return (
    <div className="flex flex-col gap-2 sm:w-80">
      <input className="input" placeholder="Nome e OAB de quem conferiu (ex.: Ana Lima, OAB MG 123456)" value={por} onChange={(e) => setPor(e.target.value)} />
      <p className="text-[11px] text-ink-400">Confirme que o texto confere com a publicação oficial e que a norma está vigente.</p>
      {erro && <p className="text-xs text-bad">{erro}</p>}
      <div className="flex gap-2"><button onClick={() => setAberto(false)} className="btn btn-ghost !py-1.5 !text-xs">Cancelar</button><button onClick={() => enviar()} disabled={carregando} className="btn btn-primary !py-1.5 !text-xs">{carregando && <Loader2 className="size-3 animate-spin" />} Confirmar validação</button></div>
    </div>
  );
}
