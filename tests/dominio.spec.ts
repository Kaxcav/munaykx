import { test, expect } from "@playwright/test";

/**
 * Canonicalização de domínio.
 *
 * O que isto protege: o site responde em mais de um endereço (domínio próprio
 * e o `*.up.railway.app`, que o Railway nunca desliga). No endereço
 * secundário, a Better Auth compara a origem com `baseURL` e devolve 403 —
 * o login para de funcionar sem dizer por quê, e o sintoma ("não deu pra
 * enviar") aponta pro lugar errado. Custou uma hora em 06/08/2026.
 *
 * A suíte roda com `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100`, então o
 * host canônico aqui é `127.0.0.1:3100` — e o middleware nunca redireciona
 * localhost/127.0.0.1, senão `npm run dev` mandaria todo mundo pra produção.
 */

test("no host canônico, nada é redirecionado", async ({ page }) => {
  const resp = await page.goto("/comunidades");
  expect(resp?.status()).toBe(200);
  expect(new URL(page.url()).host).toBe("127.0.0.1:3100");
});

test("host de desenvolvimento nunca é redirecionado", async ({ request }) => {
  // Se o middleware redirecionasse localhost, o dev local viraria inutilizável.
  const resp = await request.get("/comunidades", {
    headers: { host: "localhost:3100" },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  expect(resp.status()).not.toBe(308);
});

test("host desconhecido é redirecionado com 308, preservando o caminho", async ({
  request,
}) => {
  const resp = await request.get("/comunidades?modalidade=Corrida", {
    headers: { host: "munaykx-production.up.railway.app" },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  expect(resp.status()).toBe(308);

  const destino = new URL(resp.headers()["location"]);
  // NÃO se afirma QUAL é o host de destino aqui de propósito.
  // `NEXT_PUBLIC_SITE_URL` é assado no BUILD, não lido em runtime — então o
  // canônico depende de como a imagem foi construída, e fixar o valor faria
  // este teste passar no CI e falhar na máquina de quem tem outro `.env`.
  // O contrato é: saiu do host pedido, e caminho + querystring sobreviveram.
  expect(destino.host).not.toBe("munaykx-production.up.railway.app");
  expect(destino.pathname).toBe("/comunidades");
  // Sem isto, link compartilhado perde o recorte no meio do caminho.
  expect(destino.searchParams.get("modalidade")).toBe("Corrida");
});

test("308, não 301: método e corpo sobrevivem", async ({ request }) => {
  // 301 vira GET em vários clientes e o POST perde o corpo. Num formulário
  // de inscrição isso seria uma inscrição perdida em silêncio.
  const resp = await request.post("/comunidades", {
    headers: { host: "munaykx-production.up.railway.app" },
    data: { qualquer: "coisa" },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  expect(resp.status()).toBe(308);
});

test("as APIs NÃO são redirecionadas", async ({ request }) => {
  // Redirecionar POST de API quebraria clientes que não reenviam o corpo.
  // O matcher exclui /api de propósito.
  const resp = await request.post("/api/rsvps", {
    headers: { host: "munaykx-production.up.railway.app" },
    data: {},
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  expect(resp.status()).not.toBe(308);
});

test("/admin continua exigindo credencial depois da mudança no matcher", async ({
  browser,
  baseURL,
}) => {
  // O matcher do middleware mudou de "/admin/:path*" para quase tudo. Se a
  // ordem das duas responsabilidades quebrasse, o /admin ficaria aberto.
  const ctx = await browser.newContext({ extraHTTPHeaders: {}, baseURL });
  for (const rota of ["/admin", "/admin/leads"]) {
    const resp = await ctx.request.get(rota, { failOnStatusCode: false });
    expect([401, 404], rota).toContain(resp.status());
  }
  await ctx.close();
});
