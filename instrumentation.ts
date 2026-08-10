import * as Sentry from "@sentry/nextjs";

/**
 * INSTRUMENTAÇÃO (Next 15, App Router). O `register()` roda uma vez no boot de
 * cada runtime e importa o config do Sentry certo — que, sem DSN, é no-op.
 *
 * `onRequestError` manda os erros de servidor (RSC, route handlers, SSR) pro
 * Sentry. Sem DSN, `captureRequestError` é um no-op seguro — nada é enviado.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
