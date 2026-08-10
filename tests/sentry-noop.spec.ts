import { test, expect } from "@playwright/test";

/**
 * SENTRY NO-OP SEM DSN — a regra de ouro: envolver o app com Sentry não pode
 * quebrar produção.
 *
 * O webServer da suíte roda SEM `SENTRY_DSN` setado (vazio no .env, igual ao
 * ambiente do CI e ao de produção antes de o dono ativar). Nesse estado, o
 * `Sentry.init` NÃO roda em nenhum runtime (server/edge/client) — é no-op total.
 * Este teste prova que, nesse no-op, as rotas-chave sobem e respondem normal:
 * páginas, listagem, login e as rotas de OG image (que rodam em runtime próprio
 * e são o tipo de coisa que uma instrumentação mal-feita quebraria primeiro).
 */

const ROTAS_200 = ["/", "/mapa", "/entrar", "/comunidades"];

test.describe("Sentry no-op sem DSN — o app segue de pé", () => {
  for (const rota of ROTAS_200) {
    test(`${rota} responde 200`, async ({ request }) => {
      const r = await request.get(rota);
      expect(r.status()).toBe(200);
    });
  }

  test("a OG image raiz responde uma imagem (não erro)", async ({ request }) => {
    const r = await request.get("/opengraph-image");
    expect(r.ok()).toBe(true);
    expect(r.headers()["content-type"]).toContain("image");
  });

  test("os headers de segurança do #32 sobreviveram ao withSentryConfig", async ({ request }) => {
    const r = await request.get("/");
    // Prova que compor com o Sentry não apagou os headers existentes.
    expect(r.headers()["x-content-type-options"]).toBe("nosniff");
    expect(r.headers()["content-security-policy-report-only"]).toBeTruthy();
  });
});
