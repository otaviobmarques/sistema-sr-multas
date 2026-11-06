import { cookies } from "next/headers";
import { db, DEMO_USER } from "./db";

/**
 * Sessão de demonstração por cookie. Em produção: Supabase Auth
 * (com verificação em duas etapas para parceiros, qualidade e admin — cap. 13).
 */
export async function usuarioAtual() {
  const c = await cookies();
  const id = c.get("sm_user")?.value ?? DEMO_USER;
  return db().usuarios.find((u) => u.id === id) ?? db().usuarios[0];
}
