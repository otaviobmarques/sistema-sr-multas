import Link from "next/link";
import { Logo } from "@/components/ui";
import { RedefinirForm } from "./RedefinirForm";

export default async function Redefinir({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="panel relative w-full max-w-md p-7 text-center sm:p-8">
        <Link href="/" className="flex justify-center"><Logo size={36} /></Link>
        <h1 className="mt-6 text-xl font-semibold text-white">Criar nova senha</h1>
        {token ? <RedefinirForm token={token} /> : <p className="mt-3 text-sm text-bad">Link incompleto. <Link href="/recuperar" className="underline">Peça um novo</Link>.</p>}
      </div>
    </div>
  );
}
