"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Loader2, LogIn, UserPlus } from "lucide-react";

export function AuthForm() {
  const router = useRouter();
  const [modo, setModo] = useState<"entrar" | "cadastro">("entrar");
  const [f, setF] = useState({ nome: "", cpf_cnpj: "", telefone: "", email: "", senha: "", aceite: false });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const r = await fetch(modo === "entrar" ? "/api/auth/entrar" : "/api/auth/cadastro", { method: "POST", body: JSON.stringify(f) }).then((r) => r.json()).catch(() => ({ erro: "Falha de conexão" }));
    setCarregando(false);
    if (r.erro) return setErro(r.erro);
    router.push(r.destino ?? "/app");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="mt-6 text-left">
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-white/[.04] p-1 text-sm">
        {(["entrar", "cadastro"] as const).map((m) => (
          <button key={m} type="button" onClick={() => { setModo(m); setErro(null); }} className={clsx("rounded-lg py-2 font-medium transition", modo === m ? "bg-white/10 text-white" : "text-ink-400 hover:text-white")}>
            {m === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {modo === "cadastro" && (
          <>
            <Campo label="Nome completo"><input className="input" value={f.nome} onChange={set("nome")} autoComplete="name" required /></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="CPF ou CNPJ"><input className="input" value={f.cpf_cnpj} onChange={set("cpf_cnpj")} inputMode="numeric" required /></Campo>
              <Campo label="Celular (WhatsApp)"><input className="input" value={f.telefone} onChange={set("telefone")} inputMode="tel" autoComplete="tel" /></Campo>
            </div>
          </>
        )}
        <Campo label={modo === "entrar" ? "E-mail ou usuário" : "E-mail"}>
          <input className="input" value={f.email} onChange={set("email")} type={modo === "entrar" ? "text" : "email"} autoComplete={modo === "entrar" ? "username" : "email"} autoCapitalize="none" required />
        </Campo>
        <Campo label="Senha"><input className="input" type="password" value={f.senha} onChange={set("senha")} autoComplete={modo === "entrar" ? "current-password" : "new-password"} minLength={modo === "cadastro" ? 8 : undefined} required /></Campo>
        {modo === "cadastro" && (
          <label className="flex items-start gap-2.5 text-xs text-ink-400">
            <input type="checkbox" className="mt-0.5 size-4 accent-amber-400" checked={f.aceite} onChange={set("aceite")} />
            <span>Aceito os termos de uso e estou ciente de que a defesa é gerada por IA, validada e assinada por mim. Meus dados são tratados conforme a LGPD.</span>
          </label>
        )}
      </div>
      {erro && <p className="mt-4 rounded-lg border border-bad/30 bg-bad/10 p-2.5 text-sm text-bad">{erro}</p>}
      <button disabled={carregando} className="btn btn-primary mt-5 w-full !py-3">
        {carregando ? <Loader2 className="size-4 animate-spin" /> : modo === "entrar" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
        {modo === "entrar" ? "Entrar" : "Criar conta e começar"}
      </button>
    </form>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
