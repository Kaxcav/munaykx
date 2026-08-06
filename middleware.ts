import { NextResponse, type NextRequest } from "next/server";
import { igualSeguro } from "@/lib/admin-auth";

/**
 * Basic Auth em /admin/* (STORY-005): ferramenta interna de operação,
 * ANTES do auth completo (Blueprint C2). Credenciais só de env —
 * sem ADMIN_USER/ADMIN_PASSWORD definidos, /admin responde 503.
 * NUNCA existe senha default.
 */
export const config = { matcher: ["/admin/:path*"] };

export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  if (!user || !password) {
    return new NextResponse(
      "Admin não configurado. Defina ADMIN_USER e ADMIN_PASSWORD no ambiente.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  }

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const sep = decoded.indexOf(":");
      const u = decoded.slice(0, sep);
      const p = decoded.slice(sep + 1);
      if (sep >= 0 && igualSeguro(u, user) && igualSeguro(p, password)) {
        const res = NextResponse.next();
        res.headers.set("X-Robots-Tag", "noindex, nofollow");
        return res;
      }
    } catch {
      // base64 inválido → cai no 401 abaixo
    }
  }

  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="MUNAY Admin", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
