import * as Sentry from "@sentry/nextjs";

/**
 * SENTRY — runtime de SERVIDOR (Node). Carregado por `instrumentation.ts`.
 *
 * ── NO-OP SEM DSN (a regra de ouro: não quebrar produção) ─────────────────
 *
 * Sem `SENTRY_DSN`, o `Sentry.init` NÃO roda: nenhuma chamada externa, nenhum
 * overhead, o app sobe idêntico ao de hoje. A ativação é do DONO — criar um
 * projeto Sentry e setar `SENTRY_DSN` no Railway. **Nunca hardcode DSN aqui.**
 * (Mesma postura do CSP report-only e do e-mail sem provider: a capacidade
 * existe no código, o ambiente decide se liga.)
 */
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    // Amostragem de tracing baixa por padrão (barato); regulável por env quando
    // o dono ligar. Erro (exceção) é sempre capturado; isto é só o tracing.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    // Sem PII por padrão — coerente com a postura de privacidade do projeto
    // (sem CPF, sem geolocalização, k-anonimato nos agregados).
    sendDefaultPii: false,
  });
}
