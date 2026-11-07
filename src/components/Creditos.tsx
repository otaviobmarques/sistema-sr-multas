/* Assinaturas de autoria: Agência RedBOX (site) e Domma Tecnologia (sistema web e app). */
import clsx from "clsx";

const ROXO = "#6c5cfa";
const ESCURO = "#1d1238";

/** Logo Domma Tecnologia (vetor). `tema="escuro"`: texto e ponto brancos, para fundos escuros. */
export function LogoDomma({ className, tema = "escuro" }: { className?: string; tema?: "escuro" | "claro" }) {
  const cor = tema === "escuro" ? "#fff" : ESCURO;
  return (
    <svg viewBox="140 150 1730 360" className={className} role="img" aria-label="Domma Tecnologia">
      <path d="M185 385 L290 270 Q300 258 312 272 L440 455 Q458 478 476 455 L605 272 Q617 258 629 272 L725 385" fill="none" stroke={ROXO} strokeWidth="76" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="458" cy="205" r="47" fill={cor} />
      <text x="808" y="388" fontFamily="var(--font-geist-sans), Arial Black, Arial, sans-serif" fontWeight="900" fontSize="292" letterSpacing="-6" fill={cor}>Domma</text>
      <text x="822" y="497" fontFamily="var(--font-geist-sans), Arial, sans-serif" fontWeight="700" fontSize="84" letterSpacing="52" fill={ROXO}>TECNOLOGIA</text>
    </svg>
  );
}

/** "Desenvolvido por Domma Tecnologia" — sistema web, painel e app. */
export function AssinaturaDomma({ className, prefixo = "Desenvolvido por" }: { className?: string; prefixo?: string }) {
  return (
    <a href="mailto:contato@dommasistemas.com.br" title="Domma Tecnologia" className={clsx("group flex items-center gap-2 text-[10px] text-ink-400 transition hover:text-ink-200", className)}>
      <span className="whitespace-nowrap">{prefixo}</span>
      <LogoDomma className="h-4 w-auto opacity-80 transition group-hover:opacity-100" />
    </a>
  );
}

/** "Site desenvolvido pela Agência RedBOX" — site institucional. */
export function AssinaturaRedbox({ className }: { className?: string }) {
  return (
    <span className={clsx("flex items-center gap-2 text-xs text-ink-400", className)}>
      <span className="whitespace-nowrap">Site desenvolvido pela Agência</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/parceiros/redbox-escuro.png" alt="RedBOX" width={70} height={20} className="h-[18px] w-auto" />
    </span>
  );
}
