"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ConcluirLGPD({ id }: { id: string }) {
  const router = useRouter();
  const [c, setC] = useState(false);
  return (
    <button disabled={c} onClick={async () => { setC(true); await fetch("/api/conta/lgpd", { method: "POST", body: JSON.stringify({ concluir: id }) }); router.refresh(); }} className="btn btn-ghost !py-1 !text-xs">
      Concluir
    </button>
  );
}
