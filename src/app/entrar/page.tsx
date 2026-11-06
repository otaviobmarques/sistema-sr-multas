import { Logo } from "@/components/ui";
import { EntrarBotoes } from "../EntrarBotoes";

export default function Entrar() {
  return (
    <div className="relative grid min-h-screen place-items-center px-5">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="panel relative w-full max-w-md p-8 text-center">
        <div className="flex justify-center"><Logo size={40} /></div>
        <h1 className="mt-6 text-xl font-semibold text-white">Acesso de demonstração</h1>
        <p className="mt-2 text-sm text-ink-400">Em produção o acesso usa Supabase Auth com verificação em duas etapas para parceiros, qualidade e administradores.</p>
        <div className="mt-7 flex flex-col gap-3"><EntrarBotoes /></div>
      </div>
    </div>
  );
}
