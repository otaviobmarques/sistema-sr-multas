import { WifiOff } from "lucide-react";
import { Logo } from "@/components/ui";

export const metadata = { title: "Sem conexão · Senhor Multas" };
export const dynamic = "force-static";

/** Exibida pelo service worker quando não há internet. */
export default function Offline() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo size={34} />
      <WifiOff className="mt-10 size-10 text-ink-400" />
      <h1 className="mt-4 text-xl font-semibold text-white">Sem conexão com a internet</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-300">Suas defesas ficam salvas com segurança. Assim que a conexão voltar, é só tentar de novo.</p>
      <a href="/app" className="btn btn-primary mt-6">Tentar novamente</a>
    </main>
  );
}
