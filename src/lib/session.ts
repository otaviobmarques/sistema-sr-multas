import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { carregar, db, DEMO_USER, supabaseAtivo } from "./db";
import type { Usuario } from "./types";

/** Cliente Supabase (Auth) no servidor, com sessão em cookies. */
export async function supabaseServidor() {
  const c = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => c.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => c.set(name, value, options));
        } catch {
          /* chamado de Server Component: o middleware renova os cookies */
        }
      },
    },
  });
}

export const emailsAdmin = () => (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/**
 * Usuário logado (ou null). Também carrega o estado do banco.
 * `fresco`: força leitura do banco — use em rotas que alteram dados.
 * Sem Supabase configurado, usa a sessão de demonstração por cookie.
 */
export async function usuarioAtual(fresco = false): Promise<Usuario | null> {
  await carregar(fresco);
  if (!supabaseAtivo()) {
    const id = (await cookies()).get("sm_user")?.value ?? DEMO_USER;
    return db().usuarios.find((u) => u.id === id) ?? db().usuarios[0];
  }
  const { data } = await (await supabaseServidor()).auth.getUser();
  if (!data.user) return null;
  return db().usuarios.find((u) => u.id === data.user!.id) ?? null;
}

/** Para páginas: exige login (redireciona para /entrar). */
export async function exigirUsuario(): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar");
  return u;
}

/** Para páginas administrativas: exige perfil admin ou qualidade. */
export async function exigirAdmin(): Promise<Usuario> {
  const u = await exigirUsuario();
  if (!["admin", "qualidade"].includes(u.perfil)) redirect("/app");
  return u;
}

export const naoAutorizado = () => Response.json({ erro: "Faça login para continuar" }, { status: 401 });
