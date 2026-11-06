"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
export function RedefinirForm({ token }: { token: string }) {
  const [f, setF] = useState({ senha: "", confirmacao: "" });
  const [estado, setEstado] = useState<{ c?: boolean; ok?: boolean; erro?: string }>({});
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado({ c: true });
    const r = await fetch("/api/auth/redefinir", { method: "POST", body: JSON.stringify({ token, ...f }) }).then((r) => r.json()).catch(() => ({ erro: "Falha de conexão" }));
    setEstado(r.erro ? { erro: r.erro } : { ok: true });
  }
  if (estado.ok)
    return (
      <div className="mt-6 space-y-4">
        <p className="flex items-center justify-center gap-2 text-sm text-ok"><CheckCircle2 className="size-4" /> Senha alterada. Por segurança, as sessões abertas foram encerradas.</p>
        <Link href="/entrar" className="btn btn-primary w-full">Entrar com a nova senha</Link>
      </div>
    );
  return (
    <form onSubmit={enviar} className="mt-6 space-y-3 text-left">
      <input className="input" type="password" placeholder="Nova senha (10+ caracteres, letras e números)" autoComplete="new-password" minLength={10} value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} required />
      <input className="input" type="password" placeholder="Confirme a nova senha" autoComplete="new-password" value={f.confirmacao} onChange={(e) => setF({ ...f, confirmacao: e.target.value })} required />
      {estado.erro && <p className="text-sm text-bad">{estado.erro} {estado.erro.includes("expirado") && <Link href="/recuperar" className="underline">Pedir novo link</Link>}</p>}
      <button disabled={estado.c} className="btn btn-primary w-full !py-3">{estado.c ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Salvar nova senha</button>
    </form>
  );
}
