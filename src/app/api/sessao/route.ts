import { NextResponse } from "next/server";

/** Login de demonstração: escolhe o perfil (cliente ou administrador). */
export async function POST(req: Request) {
  const { perfil } = (await req.json()) as { perfil: "cliente" | "admin" };
  const res = NextResponse.json({ ok: true, destino: perfil === "admin" ? "/admin" : "/app" });
  res.cookies.set("sm_user", perfil === "admin" ? "u_admin" : "u_demo", { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
