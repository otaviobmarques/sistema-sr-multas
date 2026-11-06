"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Shield } from "lucide-react";

export function EntrarBotoes({ compact }: { compact?: boolean }) {
  const router = useRouter();
  async function entrar(perfil: "cliente" | "admin") {
    const r = await fetch("/api/sessao", { method: "POST", body: JSON.stringify({ perfil }) }).then((r) => r.json());
    router.push(r.destino);
  }
  if (compact)
    return (
      <button onClick={() => entrar("cliente")} className="btn btn-ghost">
        Entrar
      </button>
    );
  return (
    <>
      <button onClick={() => entrar("cliente")} className="btn btn-primary !px-6 !py-3 !text-base">
        Analisar minha multa grátis <ArrowRight className="size-4" />
      </button>
      <button onClick={() => entrar("admin")} className="btn btn-ghost !px-5 !py-3">
        <Shield className="size-4" /> Painel administrativo
      </button>
    </>
  );
}
