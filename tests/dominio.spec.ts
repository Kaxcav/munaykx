import { test, expect } from "@playwright/test";
import { hostCanonico } from "@/lib/site";

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
  baseURL,
}) => {
  const resp = await request.get("/comunidades?modalidade=Corrida", {
    headers: { host: "munaykx-production.up.railway.app" },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  expect(resp.status()).toBe(308);

  const location = resp.headers()["location"];
  // O anti-regressão que importa de verdade: nunca apontar de volta pro host
  // pedido. Isso não seria redirect, seria laço infinito.
  expect(location).not.toContain("munaykx-production.up.railway.app");

  // O Location pode vir ABSOLUTO ou RELATIVO — as duas formas estão certas.
  // O Next relativiza o Location quando o destino cai na MESMA origem de
  // quem respondeu, e é exatamente o caso aqui: a suíte sobe com
  // NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100, ou seja, o canônico É este
  // servidor. Em produção, com domínio próprio, vem absoluto.
  //
  // A primeira versão deste teste fazia `new URL(location)` sem base e
  // quebrava com "Invalid URL" — falha de ambiente disfarçada de falha de
  // código. Também afirmava que `NEXT_PUBLIC_SITE_URL` era assada no build:
  // é, no bundle de cliente; no servidor é lida em runtime (ver lib/site.ts).
  const destino = new URL(location, baseURL);
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

test.describe("quem pode virar host canônico", () => {
  // Sem servidor: a decisão de canonicalizar ou não é uma função pura, e é
  // ela que decide se um erro de variável derruba o site ou não.

  test("sem a env configurada, NINGUÉM é redirecionado", () => {
    // Este é o caso perigoso. O `SITE_URL` tem fallback (pro metadataBase e
    // as OG images não explodirem), mas usar esse fallback como canônico
    // significaria: esqueceu a variável no painel → todo visitante leva 308
    // pra um domínio que talvez nem seja nosso. O site não some por falta
    // de env; ele só deixa de canonicalizar.
    expect(hostCanonico(undefined)).toBe("");
    expect(hostCanonico("")).toBe("");
    expect(hostCanonico("   ")).toBe("");
  });

  test("domínio sem protocolo funciona — é como o Railway entrega", () => {
    expect(hostCanonico("sejamunay.com.br")).toBe("sejamunay.com.br");
  });

  test("caixa e barra no fim não criam host diferente", () => {
    // O host da requisição chega minúsculo; se o canônico viesse com
    // maiúscula, a comparação nunca casaria e o site entraria em laço.
    expect(hostCanonico("https://SejaMunay.com.br/")).toBe("sejamunay.com.br");
  });

  test("porta faz parte do host — senão dev e preview quebram", () => {
    expect(hostCanonico("http://127.0.0.1:3100")).toBe("127.0.0.1:3100");
  });

  test("valor sujo não vira redirect pra lugar nenhum", () => {
    // Copiar e colar errado no painel acontece. O que não pode acontecer é
    // virar um 308 pra um endereço inventado.
    expect(hostCanonico("isto não é uma url")).toBe("");
  });
});
