import Link from "next/link";
import { Logo } from "./ui";

/** Layout das páginas institucionais (termos, privacidade). */
export function Documento({ titulo, versao, children }: { titulo: string; versao: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Link href="/"><Logo size={28} /></Link>
        <Link href="/entrar" className="btn btn-ghost !py-1.5 !text-xs">Entrar</Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20">
        <div className="mb-8 rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm text-warn">
          <b>MINUTA pendente de revisão jurídica.</b> Este texto foi preparado como ponto de partida e deve ser revisado e aprovado por advogado antes do lançamento. Campos entre colchetes [ ] precisam ser preenchidos.
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">{titulo}</h1>
        <p className="mt-2 text-sm text-ink-400">{versao}</p>
        <article className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink-300 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_li]:mt-1.5 [&_strong]:text-ink-200">
          {children}
        </article>
      </main>
    </div>
  );
}
