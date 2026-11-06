import Link from "next/link";
import { Logo } from "@/components/ui";
import { EntrarBotoes } from "../EntrarBotoes";
import { AuthForm } from "./AuthForm";

export const dynamic = "force-dynamic";

export default function Entrar() {
  const real = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[700px] -translate-x-1/2 rounded-full bg-brand/10 blur-[100px]" />
      <div className="panel relative w-full max-w-md p-7 text-center sm:p-8">
        <Link href="/" className="flex justify-center"><Logo size={40} /></Link>
        {real ? (
          <>
            <h1 className="mt-6 text-xl font-semibold text-white">Acesse sua conta</h1>
            <p className="mt-1 text-sm text-ink-400">Análise da multa grátis. Você só paga se gerar a defesa.</p>
            <AuthForm />
          </>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-semibold text-white">Acesso de demonstração</h1>
            <p className="mt-2 text-sm text-ink-400">Configure o Supabase para ativar o login real.</p>
            <div className="mt-7 flex flex-col gap-3"><EntrarBotoes /></div>
          </>
        )}
      </div>
    </div>
  );
}
