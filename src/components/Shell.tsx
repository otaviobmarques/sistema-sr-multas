"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  BadgeCheck, Bot, Car, CreditCard, FileStack, Gauge, Handshake, LayoutDashboard, Layers, LogOut, Menu, Scale, ShieldCheck, Upload, Wallet, X, Library, RotateCcw,
} from "lucide-react";
import { Logo } from "./ui";

const NAV = {
  cliente: [
    { href: "/app", label: "Início", icon: LayoutDashboard },
    { href: "/app/defesas", label: "Minhas defesas", icon: FileStack },
    { href: "/app/nova", label: "Enviar multa", icon: Upload },
    { href: "/app/veiculos", label: "Meus veículos", icon: Car },
    { href: "/app/planos", label: "Planos e créditos", icon: Layers },
    { href: "/app/pagamentos", label: "Pagamentos", icon: Wallet },
    { href: "/app/assistente", label: "Falar com o Sr. Multas", icon: Bot },
  ],
  admin: [
    { href: "/admin", label: "Visão geral", icon: Gauge },
    { href: "/admin/jurimetria", label: "Jurimetria", icon: Scale },
    { href: "/admin/parceiros", label: "Parceiros (lojas)", icon: Handshake },
    { href: "/admin/financeiro", label: "Financeiro (Asaas)", icon: CreditCard },
    { href: "/admin/qualidade", label: "Auditoria IA", icon: ShieldCheck },
    { href: "/admin/fontes", label: "Base de leis", icon: Library },
  ],
};

export function Shell({ area, user, saldo, modoDemo, podeAdmin = false, real = false, children }: { area: "cliente" | "admin"; user: { nome: string; perfil: string }; saldo?: number; modoDemo: { ia: boolean; asaas: boolean }; podeAdmin?: boolean; real?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = NAV[area];
  const active = (href: string) => (href === "/app" || href === "/admin" ? path === href : path.startsWith(href));

  async function sair() {
    await fetch("/api/auth/sair", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  async function trocar(perfil: "cliente" | "admin") {
    if (real) {
      router.push(perfil === "admin" ? "/admin" : "/app");
      return;
    }
    const r = await fetch("/api/sessao", { method: "POST", body: JSON.stringify({ perfil }) }).then((r) => r.json());
    router.push(r.destino);
    router.refresh();
  }
  async function reset() {
    if (!confirm("Restaurar os dados de demonstração?")) return;
    await fetch("/api/demo/reset", { method: "POST" });
    router.refresh();
  }

  const side = (
    <aside className="flex h-full w-64 flex-col border-r border-white/6 bg-ink-900/80 px-4 py-5 backdrop-blur-xl">
      <Link href={area === "admin" ? "/admin" : "/app"} className="px-2">
        <Logo />
      </Link>
      <div className="mt-2 px-2 text-[10px] uppercase tracking-[0.2em] text-ink-400">{area === "admin" ? "Administração" : "Portal do cliente"}</div>
      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={clsx(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active(href) ? "bg-white/[.06] text-white" : "text-ink-300 hover:bg-white/[.03] hover:text-white",
            )}
          >
            {active(href) && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand shadow-[0_0_12px_var(--color-brand)]" />}
            <Icon className={clsx("size-[18px]", active(href) ? "text-brand" : "text-ink-400 group-hover:text-ink-200")} />
            {label}
          </Link>
        ))}
      </nav>

      {area === "cliente" && saldo !== undefined && (
        <Link href="/app/planos" className="panel panel-hover mb-3 block p-4">
          <div className="label">Saldo</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-white tabular-nums">{saldo}</span>
            <span className="text-xs text-ink-400">crédito(s)</span>
          </div>
          <div className="mt-1 text-[11px] text-ink-400">1 crédito = 1 multa, todas as fases</div>
        </Link>
      )}

      <div className="rounded-xl border border-white/6 p-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-ink-600 to-ink-700 text-[11px] font-semibold text-white">
            {user.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-white">{user.nome}</div>
            <div className="text-ink-400">{user.perfil === "admin" ? "Administrador" : user.perfil === "qualidade" ? "Qualidade" : "Cliente"}</div>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          {(podeAdmin || !real) && (
            <button onClick={() => trocar(area === "admin" ? "cliente" : "admin")} className="btn btn-ghost flex-1 !px-2 !py-1.5 !text-[11px]">
              <BadgeCheck className="size-3.5" /> {area === "admin" ? "Ver como cliente" : "Ver como admin"}
            </button>
          )}
          {(user.perfil === "admin" || !real) && (
            <button onClick={reset} title="Restaurar dados de demonstração" className="btn btn-ghost !px-2 !py-1.5">
              <RotateCcw className="size-3.5" />
            </button>
          )}
          <button onClick={sair} title="Sair" className={clsx("btn btn-ghost !px-2 !py-1.5", real && !podeAdmin && "flex-1")}>
            <LogOut className="size-3.5" />{real && !podeAdmin && <span className="!text-[11px]">Sair</span>}
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
      <div className="pointer-events-none fixed inset-0 glow-ia" />
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{side}</div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative h-full">{side}</div>
        </div>
      )}
      <div className="relative lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/6 bg-ink-950/70 px-4 py-3 backdrop-blur-xl lg:px-8">
          <button className="btn btn-ghost !p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <div className="lg:hidden">
            <Logo size={26} />
          </div>
          <div className="ml-auto flex items-center gap-2 text-[11px]">
            <span className={clsx("flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ring-inset", modoDemo.ia ? "bg-ia/10 text-ia ring-ia/25" : "bg-white/5 text-ink-300 ring-white/10")}>
              <span className="size-1.5 rounded-full bg-current pulse-dot" /> IA {modoDemo.ia ? "Claude ativa" : "modo demonstração"}
            </span>
            <span className={clsx("hidden items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ring-inset sm:flex", modoDemo.asaas ? "bg-ok/10 text-ok ring-ok/25" : "bg-white/5 text-ink-300 ring-white/10")}>
              Asaas {modoDemo.asaas ? (process.env.NEXT_PUBLIC_ASAAS_ENV ?? "conectado") : "simulado"}
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
