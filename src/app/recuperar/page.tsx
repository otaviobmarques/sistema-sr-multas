import Link from "next/link";
import { Logo } from "@/components/ui";
import { RecuperarForm } from "./RecuperarForm";

export default function Recuperar() {
  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="panel relative w-full max-w-md p-7 text-center sm:p-8">
        <Link href="/" className="flex justify-center"><Logo size={36} /></Link>
        <h1 className="mt-6 text-xl font-semibold text-white">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-ink-400">Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.</p>
        <RecuperarForm />
        <Link href="/entrar" className="mt-5 inline-block text-xs text-brand hover:underline">Voltar para o login</Link>
      </div>
    </div>
  );
}
