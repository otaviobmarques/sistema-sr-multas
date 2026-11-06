import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Renova a sessão do Supabase Auth e protege as áreas logadas. */
export async function middleware(req: NextRequest) {
  // app.senhormultas.com.br abre direto a área do cliente
  if (req.headers.get("host")?.startsWith("app.") && req.nextUrl.pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.next();
  let res = NextResponse.next({ request: req });
  const supa = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supa.auth.getUser();
  const p = req.nextUrl.pathname;
  if (!data.user && (p.startsWith("/app") || p.startsWith("/admin") || p.startsWith("/imprimir"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/", "/app/:path*", "/admin/:path*", "/imprimir/:path*", "/api/((?!webhooks).*)"],
};
