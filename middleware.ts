import { NextResponse, type NextRequest } from "next/server";
import { igualSeguro } from "@/lib/admin-auth";
import { SITE_URL } from "@/lib/site";

/**
 * O middleware faz duas coisas, nesta ordem:
 *
 * 1. **Canonicaliza o domínio.** O site responde em mais de um endereço
 *    (o domínio próprio e o `*.up.railway.app` que o Railway nunca desliga).
 *    Endereço secundário é armadilha silenciosa: a Better Auth compara a
 *    origem da requisição com `baseURL` e devolve **403** quando diverge —
 *    login simplesmente para de funcionar, sem dizer por quê. Custou uma
 *    hora em 06/08/2026. Também consolida sinal de SEO num endereço só.
 *
 * 2. **Basic Auth em /admin/*** (STORY-005): ferramenta interna, anterior ao
 *    auth completo. Credenciais só de env — sem elas, 503. NUNCA existe
 *    senha default.
 */
export const config = {
  // Tudo, menos o que não deve ser redirecionado nem protegido: assets do
  // Next, arquivos estáticos e o /api (redirecionar POST de API quebraria
  // o corpo da requisição em alguns clientes).
  matcher: ["/((?!_next/|api/|.*\\.[\\w]+$).*)"],
};

/** Host canônico, sem protocolo. Vazio = não canonicalizar. */
const HOST_CANONICO = (() => {
  try {
    return new URL(SITE_URL).host.toLowerCase();
  } catch {
    return "";
  }
})();

function canonicalizar(req: NextRequest): NextResponse | null {
  if (!HOST_CANONICO) return null;

  const host = req.headers.get("host")?.toLowerCase();
  if (!host || host === HOST_CANONICO) return null;

  // Nunca redireciona em desenvolvimento nem em preview local — senão
  // `npm run dev` manda todo mundo pra produção.
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return null;

  // Monta a partir do SITE_URL em vez de editar a URL recebida: protocolo,
  // host e porta vêm todos do canônico de uma vez. Mexer campo a campo tem
  // armadilha — o setter de `host` não limpa a porta anterior, e limpar a
  // porta na mão derruba a do próprio canônico (pego por teste).
  const destino = new URL(
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
    SITE_URL,
  );

  // 308 preserva método e corpo; 301 viraria GET e perderia POST de form.
  return NextResponse.redirect(destino, 308);
}

export function middleware(req: NextRequest) {
  const redirecionamento = canonicalizar(req);
  if (redirecionamento) return redirecionamento;

  if (!req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

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
