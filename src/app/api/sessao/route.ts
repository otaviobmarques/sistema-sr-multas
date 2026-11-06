import { NextResponse } from "next/server";
import { supabaseAtivo } from "@/lib/db";

/** Login de demonstração (somente sem Supabase). Com Supabase, leva para a tela de login real. */
export async function POST(req: Request) {
  const { perfil } = (await req.json()) as { perfil: "cliente" | "admin" };
  if (supabaseAtivo()) return NextResponse.json({ ok: true, destino: "/entrar" });
  const res = NextResponse.json({ ok: true, destino: perfil === "admin" ? "/admin" : "/app" });
  res.cookies.set("sm_user", perfil === "admin" ? "u_admin" : "u_demo", { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
