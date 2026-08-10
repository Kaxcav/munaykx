import * as Sentry from "@sentry/nextjs";

/**
 * SENTRY — runtime de CLIENTE (browser). O DSN aqui é o `NEXT_PUBLIC_SENTRY_DSN`
 * (embutido no build, como toda `NEXT_PUBLIC_*`). Sem ele, `init` não roda —
 * no-op total, zero chamada externa, nada muda pro visitante.
 *
 * ⚠️ NUNCA hardcode DSN. A ativação é do dono (setar a env no Railway).
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    sendDefaultPii: false,
  });
}

// Instrumenta as transições de rota do App Router. Seguro sem DSN: quando o SDK
// não foi inicializado, é um no-op.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
