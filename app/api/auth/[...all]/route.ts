import { toNextJsHandler } from "better-auth/next-js";
import { auth, authDisponivel } from "@/lib/auth";

/** Rotas do Better Auth (STORY-007). Tudo passa por aqui: pedir link, consumir token, sair. */
const handlers = toNextJsHandler(auth.handler);

/**
 * Sem BETTER_AUTH_SECRET a auth não atende — mesmo princípio do /admin sem
 * ADMIN_PASSWORD: 503 com mensagem clara, jamais um default. Sem esta
 * barreira, a lib assinaria sessões com um segredo público e qualquer um
 * poderia forjar login.
 */
function indisponivel() {
  return Response.json(
    {
      error:
        "Acesso por link não está configurado neste ambiente. Defina BETTER_AUTH_SECRET.",
    },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  return authDisponivel() ? handlers.GET(request) : indisponivel();
}

export async function POST(request: Request) {
  return authDisponivel() ? handlers.POST(request) : indisponivel();
}
