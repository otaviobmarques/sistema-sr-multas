"use client";
import { useState } from "react";
import { Dices } from "lucide-react";

export function Amostra({ candidatas }: { candidatas: { id: string; caso: string; orgao: string; modo: string | null }[] }) {
  const [sel, setSel] = useState<typeof candidatas | null>(null);
  function sortear() {
    const n = Math.min(candidatas.length, 5 + Math.floor(Math.random() * 6)); // 5 a 10 por semana
    setSel([...candidatas].sort(() => Math.random() - 0.5).slice(0, n));
  }
  return (
    <div className="relative">
      <button onClick={sortear} className="btn btn-ghost"><Dices className="size-4" /> Sortear amostra da semana</button>
      {sel && (
        <div className="panel absolute right-0 z-10 mt-2 w-72 bg-ink-900 p-4 text-sm">
          <div className="label mb-2">Amostra ({sel.length})</div>
          {sel.length === 0 && <p className="text-ink-400">Nenhuma peça gerada ainda.</p>}
          {sel.map((s) => <div key={s.id} className="flex justify-between py-1"><span className="font-mono text-white">{s.caso}</span><span className="text-ink-400">{s.orgao} · {s.modo}</span></div>)}
        </div>
      )}
    </div>
  );
}
