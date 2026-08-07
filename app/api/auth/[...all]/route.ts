import { toNextJsHandler } from "better-auth/next-js";
import { auth, authDisponivel } from "@/lib/auth";

/**
 * Rotas do Better Auth (STORY-007). Tudo passa por aqui: pedir link,
 * consumir token, sair.
 *
 * Montado sob demanda, e não no topo do módulo: com a auth desligada
 * ninguém precisa tocar no handler.
 *
 * O que isto NÃO resolve (medido, não suposto): sem `BETTER_AUTH_SECRET` a
 * lib reclama num `unhandledRejection` já no BOOT do servidor, com zero
 * requisições — ou seja, vem de construir o `betterAuth()` em `lib/auth.ts`,
 * não de ler o handler. O Next registra e segue servindo (a suíte inteira
 * passa contra esse servidor), então é barulho de log num estado que não
 * deveria existir em produção. Matar de vez exigiria construir a instância
 * preguiçosamente, e isso mexe no módulo mais sensível do projeto — fica
 * anotado como pendência consciente, não como coisa esquecida.
 */
let handlersMemo: ReturnType<typeof toNextJsHandler> | null = null;
function handlers() {
  handlersMemo ??= toNextJsHandler(auth.handler);
  return handlersMemo;
}

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
  return authDisponivel() ? handlers().GET(request) : indisponivel();
}

export async function POST(request: Request) {
  return authDisponivel() ? handlers().POST(request) : indisponivel();
}
