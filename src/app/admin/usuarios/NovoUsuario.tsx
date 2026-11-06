"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw, UserPlus, X } from "lucide-react";

export function gerarSenha() {
  const l = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ", n = "23456789";
  const r = crypto.getRandomValues(new Uint8Array(12));
  const s = [...r].map((x, i) => (i % 4 === 3 ? n[x % n.length] : l[x % l.length])).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

export function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn btn-ghost !px-2 !py-1 !text-xs" onClick={() => { navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1500); }}>
      {ok ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />} {ok ? "Copiado" : "Copiar"}
    </button>
  );
}

export function NovoUsuario({ emailAtivo }: { emailAtivo: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [acesso, setAcesso] = useState<"senha" | "convite">("senha");
  const [senha, setSenha] = useState(gerarSenha());
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [criado, setCriado] = useState<{ email: string; senha?: string; convite?: string } | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const r = await fetch("/api/admin/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, acesso, senha: acesso === "senha" ? senha : undefined, creditos: Number(f.creditos || 0) }) });
    const j = await r.json();
    setEnviando(false);
    if (!r.ok) return setErro(j.erro ?? "Não foi possível criar");
    setCriado({ email: f.email.trim().toLowerCase(), senha: j.senha, convite: j.convite });
    router.refresh();
  }
  function fechar() {
    setAberto(false);
    setCriado(null);
    setErro("");
    setSenha(gerarSenha());
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setAberto(true)}><UserPlus className="size-4" /> Novo usuário</button>
      {aberto && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={fechar}>
          <div className="panel w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{criado ? "Conta criada" : "Novo usuário"}</h2>
              <button onClick={fechar} aria-label="Fechar" className="text-ink-400 hover:text-white"><X className="size-5" /></button>
            </div>
            {criado ? (
              <div className="space-y-3 text-sm">
                {criado.senha ? (
                  <>
                    <p className="text-ink-300">Envie estes dados para a pessoa. <b className="text-warn">A senha não fica visível depois que você fechar esta janela.</b></p>
                    <div className="rounded-xl border border-white/10 bg-white/[.03] p-4 font-mono text-[13px]">
                      <div className="flex items-center justify-between gap-2"><span>Site: senhormultas.com.br/entrar</span></div>
                      <div className="mt-1.5 flex items-center justify-between gap-2"><span>E-mail: {criado.email}</span></div>
                      <div className="mt-1.5 flex items-center justify-between gap-2"><span>Senha: <b className="text-white">{criado.senha}</b></span></div>
                    </div>
                    <Copiar texto={`Seu acesso ao Senhor Multas\nSite: https://senhormultas.com.br/entrar\nE-mail: ${criado.email}\nSenha: ${criado.senha}\n\nDepois de entrar, você pode trocar a senha em Minha conta.`} />
                  </>
                ) : (
                  <p className="text-ink-300">Enviamos para <b className="text-white">{criado.convite}</b> um convite com o link para a pessoa criar a própria senha (válido por 7 dias).</p>
                )}
                <button className="btn btn-ghost w-full" onClick={fechar}>Concluir</button>
              </div>
            ) : (
              <form onSubmit={enviar} className="space-y-3">
                <div><label className="label mb-1 block">Nome completo</label><input name="nome" required className="input" placeholder="Nome e sobrenome" /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="label mb-1 block">E-mail (login)</label><input name="email" type="email" required className="input" /></div>
                  <div><label className="label mb-1 block">CPF ou CNPJ</label><input name="cpf_cnpj" required className="input" placeholder="Vai na qualificação da peça" /></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div><label className="label mb-1 block">Celular</label><input name="telefone" className="input" placeholder="Opcional" /></div>
                  <div><label className="label mb-1 block">Perfil</label>
                    <select name="perfil" className="input" defaultValue="cliente">
                      <option value="cliente">Cliente</option><option value="cliente_empresa">Empresa</option><option value="qualidade">Qualidade (equipe)</option><option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div><label className="label mb-1 block">Créditos</label><input name="creditos" type="number" min={0} max={100} defaultValue={3} className="input" /></div>
                </div>
                <div>
                  <label className="label mb-1.5 block">Acesso</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button type="button" onClick={() => setAcesso("senha")} className={`rounded-lg border px-3 py-2 text-left ${acesso === "senha" ? "border-brand bg-brand/10 text-white" : "border-white/10 text-ink-300"}`}>Eu defino a senha</button>
                    <button type="button" disabled={!emailAtivo} onClick={() => setAcesso("convite")} className={`rounded-lg border px-3 py-2 text-left disabled:opacity-40 ${acesso === "convite" ? "border-brand bg-brand/10 text-white" : "border-white/10 text-ink-300"}`}>Convite por e-mail (a pessoa cria)</button>
                  </div>
                  {acesso === "senha" && (
                    <div className="mt-2 flex gap-2">
                      <input value={senha} onChange={(e) => setSenha(e.target.value)} className="input font-mono" aria-label="Senha" />
                      <button type="button" className="btn btn-ghost !px-3" title="Gerar outra" onClick={() => setSenha(gerarSenha())}><RefreshCw className="size-4" /></button>
                    </div>
                  )}
                  <p className="mt-1.5 text-[11px] text-ink-400">{acesso === "senha" ? "Mínimo de 10 caracteres, com letras e números. A pessoa pode trocar depois em Minha conta." : "A pessoa recebe um link válido por 7 dias para criar a senha."}</p>
                </div>
                {erro && <p className="text-sm text-bad">{erro}</p>}
                <button disabled={enviando} className="btn btn-primary w-full">{enviando ? "Criando…" : "Criar conta"}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
