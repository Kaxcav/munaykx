import { test, expect } from "@playwright/test";

/**
 * Headers de segurança HTTP.
 *
 * O que estes testes prendem: (1) os cinco headers seguros aparecem de verdade
 * na resposta — o raio-X apontou que hoje não vem nenhum; (2) o CSP saiu como
 * **Report-Only**, não enforcing — esta é a garantia de que a mudança NÃO pode
 * derrubar a página (um CSP enforcing errado é tela branca em produção). Se
 * alguém um dia trocar para enforcing sem passar pelo nonce, o teste (3) reprova.
 */

const ROTAS = ["/", "/comunidades", "/entrar"];

test.describe("os 5 headers seguros aparecem", () => {
  for (const rota of ROTAS) {
    test(`${rota} traz os headers de segurança`, async ({ request }) => {
      const r = await request.get(rota);
      expect(r.status(), `${rota} não respondeu 200`).toBe(200);
      const h = r.headers();

      expect(h["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains");
      // SEM preload de propósito — conservador.
      expect(h["strict-transport-security"]).not.toContain("preload");
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["x-frame-options"]).toBe("SAMEORIGIN");
      expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["permissions-policy"]).toContain("geolocation=()");
      expect(h["permissions-policy"]).toContain("camera=()");
      expect(h["permissions-policy"]).toContain("microphone=()");
    });
  }
});

test.describe("CSP é Report-Only (não pode bloquear nada)", () => {
  test("vem o Report-Only e NÃO vem o CSP enforcing", async ({ request }) => {
    const h = (await request.get("/")).headers();
    // A garantia de segurança da mudança: existe o de relatório...
    expect(h["content-security-policy-report-only"], "faltou o CSP Report-Only").toBeTruthy();
    // ...e NÃO existe o enforcing (que seria o único capaz de derrubar a página).
    expect(h["content-security-policy"], "veio um CSP ENFORCING — risco de quebrar prod").toBeFalsy();
  });

  test("o Report-Only descreve a política esperada", async ({ request }) => {
    const csp = (await request.get("/")).headers()["content-security-policy-report-only"] ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("object-src 'none'");
    // Google Fonts é legítimo e precisa estar liberado (a folha de estilo).
    expect(csp).toContain("https://fonts.googleapis.com");
  });
});

test.describe("os headers cobrem rotas não-HTML sem quebrá-las", () => {
  test("a rota de OG image segue 200 e ganha os headers", async ({ request }) => {
    // Slug inexistente cai no cartão genérico da marca (200), com os headers.
    const r = await request.get("/eventos/zzt-headers-check/opengraph-image");
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/png");
    expect(r.headers()["x-content-type-options"]).toBe("nosniff");
  });
});
