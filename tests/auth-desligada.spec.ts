import { test, expect } from "@playwright/test";

/**
 * O site fica de pé sem `BETTER_AUTH_SECRET`.
 *
 * Achado em 06/08/2026 rodando a suíte numa máquina sem o segredo: três
 * páginas chamavam `auth.api.getSession()` direto, e a Better Auth LANÇA
 * nessa chamada quando não há segredo. Uma delas era o `<Header />` — que
 * está em toda página. Resultado: sem uma única variável de ambiente, o
 * site inteiro respondia 500. Home, comunidades, eventos, tudo.
 *
 * Em produção o sintoma fica escondido porque a variável está lá. É
 * justamente por isso que precisa de teste: o dia em que ela faltar num
 * deploy novo, o prejuízo não é "o login caiu", é "o site caiu" — e a
 * Etapa 2 do edital tem "site no ar" como evidência.
 *
 * A suíte inteira roda com a auth desligada (ver `playwright.config.ts`),
 * então todo teste de página aqui já é uma prova disso. Este arquivo
 * afirma o contrato explicitamente, incluindo a parte que NÃO pode
 * afrouxar: recusar continua sendo recusar.
 */

test("a home responde 200 e mostra o estado deslogado", async ({ page }) => {
  const resp = await page.goto("/");
  expect(resp?.status()).toBe(200);
  await expect(page.getByRole("link", { name: "Entrar", exact: true })).toBeVisible();
});

test("as páginas públicas não dependem da auth pra existir", async ({
  request,
}) => {
  for (const rota of ["/", "/comunidades", "/privacidade"]) {
    const resp = await request.get(rota, { failOnStatusCode: false });
    expect(resp.status(), rota).toBe(200);
  }
});

test("/entrar avisa em vez de estourar", async ({ page }) => {
  const resp = await page.goto("/entrar");
  expect(resp?.status()).toBe(200);
  await expect(
    page.getByText("Acesso por link ainda não está configurado"),
  ).toBeVisible();
});

test("/minhas-inscricoes manda pro /entrar em vez de dar 500", async ({
  request,
}) => {
  const resp = await request.get("/minhas-inscricoes", {
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  // Sem sessão é sem sessão — desligada ou não, o caminho é o mesmo.
  expect(resp.status()).toBe(307);
  expect(resp.headers()["location"]).toContain("/entrar");
});

test("a auth em si CONTINUA recusando — o guard não abriu porta nenhuma", async ({
  request,
}) => {
  // O risco de um fix desses é trocar "lança" por "deixa passar". Aqui a
  // resposta certa é 503: sem segredo, a lib assinaria sessão com um
  // default público e qualquer um forjaria login.
  const resp = await request.get("/api/auth/get-session", {
    failOnStatusCode: false,
  });
  expect(resp.status()).toBe(503);
});
