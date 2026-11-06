import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Link de venda do parceiro: registra a origem para o split e leva aos planos. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parceiro = db().parceiros.find((p) => p.slug_link === slug);
  const res = NextResponse.redirect(new URL(parceiro ? "/app/planos?ref=1" : "/", req.url));
  if (parceiro) res.cookies.set("sm_ref", slug, { maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}
