import * as Sentry from "@sentry/nextjs";

/**
 * SENTRY — runtime EDGE (middleware, route handlers edge). Carregado por
 * `instrumentation.ts`. Mesma regra de ouro do server: sem DSN, `init` não roda
 * (no-op total). Ver `sentry.server.config.ts` para o racional completo.
 */
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    sendDefaultPii: false,
  });
}
