import { NextResponse } from "next/server";
import { supabaseAtivo } from "@/lib/db";
import { supabaseServidor } from "@/lib/session";

export async function POST() {
  if (supabaseAtivo()) await (await supabaseServidor()).auth.signOut();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("sm_user");
  return res;
}
