"use client";
import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
export function RecuperarForm() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<{ c?: boolean; msg?: string; erro?: string }>({});
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado({ c: true });
    const r = await fetch("/api/auth/recuperar", { method: "POST", body: JSON.stringify({ email }) }).then((r) => r.json()).catch(() => ({ erro: "Falha de conexão" }));
    setEstado(r.erro ? { erro: r.erro } : { msg: r.mensagem });
  }
  if (estado.msg) return <p className="mt-6 rounded-xl border border-ok/30 bg-ok/5 p-4 text-left text-sm text-ok">{estado.msg}</p>;
  return (
    <form onSubmit={enviar} className="mt-6 space-y-3 text-left">
      <input className="input" type="email" placeholder="seu@email.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      {estado.erro && <p className="text-sm text-bad">{estado.erro}</p>}
      <button disabled={estado.c} className="btn btn-primary w-full !py-3">{estado.c ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Enviar link</button>
    </form>
  );
}
