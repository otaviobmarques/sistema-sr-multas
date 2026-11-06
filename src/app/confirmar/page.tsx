import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { audit, carregar, db, save } from "@/lib/db";
import { usarToken } from "@/lib/email";
import { Logo } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Link de confirmação de e-mail (token de uso único, 48 horas). */
export default async function Confirmar({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  await carregar(true);
  const usuarioId = token ? usarToken(token, "email") : null;
  const u = usuarioId ? db().usuarios.find((x) => x.id === usuarioId) : undefined;
  if (u) {
    u.email_confirmado = true;
    audit(u.id, "email_confirmado", `usuario:${u.id}`, u.email);
    await save();
  }
  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      <div className="panel relative w-full max-w-md p-8 text-center">
        <Link href="/" className="flex justify-center"><Logo size={36} /></Link>
        {u ? (
          <>
            <CheckCircle2 className="mx-auto mt-6 size-10 text-ok" />
            <h1 className="mt-3 text-xl font-semibold text-white">E-mail confirmado!</h1>
            <p className="mt-1 text-sm text-ink-400">Tudo pronto, {u.nome.split(" ")[0]}. Agora você já pode gerar sua Defesa Pronta.</p>
            <Link href="/app/nova" className="btn btn-primary mt-6 w-full">Enviar minha multa</Link>
          </>
        ) : (
          <>
            <XCircle className="mx-auto mt-6 size-10 text-bad" />
            <h1 className="mt-3 text-xl font-semibold text-white">Link inválido ou expirado</h1>
            <p className="mt-1 text-sm text-ink-400">Entre na sua conta e peça um novo e-mail de confirmação no aviso do topo.</p>
            <Link href="/entrar" className="btn btn-ghost mt-6 w-full">Entrar</Link>
          </>
        )}
      </div>
    </div>
  );
}
