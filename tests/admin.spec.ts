import { test, expect } from "@playwright/test";
import { AUTH_ADMIN, criarLeads, limparFixtures, prisma } from "./fixtures";

/**
 * Listagens do /admin — paginação, busca, período e a regra do CSV.
 *
 * A regra que mais importa é a do export: **CSV leva o recorte inteiro, nunca
 * só a página visível**. Quebrar isso é silencioso e caro — alguém exporta
 * "todos os leads", recebe 50, e toma decisão de edital com 10% da base.
 */

test.use({ extraHTTPHeaders: AUTH_ADMIN });

test.beforeAll(async () => {
  await limparFixtures();
  await criarLeads(130);
});

test.afterAll(async () => {
  await limparFixtures();
  await prisma.$disconnect();
});

const linhas = (page: import("@playwright/test").Page) =>
  page.locator("tbody tr").count();

test("a lista para nos 50, não despeja 130", async ({ page }) => {
  await page.goto("/admin/leads");
  expect(await linhas(page)).toBe(50);
  await expect(page.locator("body")).toContainText(/1–50 de \d+/);
  await expect(page.getByRole("link", { name: /Próxima/ })).toBeVisible();
});

test("página inventada avisa em vez de mentir 'nenhum lead'", async ({ page }) => {
  const resp = await page.goto("/admin/leads?p=99");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("body")).toContainText("Essa página não existe nesse recorte");
});

test("p inválido cai na página 1, nunca em offset negativo", async ({ page }) => {
  for (const p of ["0", "-3", "abc"]) {
    await page.goto(`/admin/leads?p=${p}`);
    expect(await linhas(page), `p=${p}`).toBe(50);
  }
});

test("busca acha por nome e por e-mail, ignorando caixa", async ({ page }) => {
  // Nome NÃO é único no banco (o seed e dados reais podem ter homônimo), então
  // aqui a asserção é "filtrou e achou", não uma contagem exata — contagem
  // exata sobre campo não-único é teste que quebra sozinho no dia errado.
  await page.goto("/admin/leads?q=Pessoa%2077");
  expect(await linhas(page)).toBeLessThan(50);
  await expect(page.locator("tbody")).toContainText("Pessoa 77");

  await page.goto("/admin/leads?q=PESSOA%2077");
  await expect(page.locator("tbody")).toContainText("Pessoa 77");

  // E-mail é único e tem o prefixo da fixture — aqui a contagem exata vale.
  await page.goto("/admin/leads?q=zzt-lead-42%40teste.invalid");
  expect(await linhas(page)).toBe(1);
  await expect(page.locator("tbody")).toContainText("Pessoa 42");
});

test("período de 7 dias corta o histórico; período inválido é ignorado", async ({ page }) => {
  await page.goto("/admin/leads?periodo=7");
  const semana = await linhas(page);
  expect(semana).toBeLessThan(50);
  await expect(page.locator("tbody")).not.toContainText("Pessoa 100");

  // Filtro fantasma seria pior que filtro ausente: mostraria menos dado sem
  // dizer por quê.
  await page.goto("/admin/leads?periodo=999");
  expect(await linhas(page)).toBe(50);
});

test("os filtros se combinam sem se apagar", async ({ page }) => {
  await page.goto("/admin/leads?tipo=participante&periodo=7&q=Pessoa");
  // O form de busca carrega os outros filtros em campos ocultos — senão
  // buscar apagaria o recorte.
  await expect(page.locator('form input[name="tipo"]')).toHaveValue("participante");
  await expect(page.locator('form input[name="periodo"]')).toHaveValue("7");
});

const linhasCsv = (csv: string) => csv.trim().split("\r\n").length - 1;

test("CSV leva o recorte inteiro, NUNCA só a página", async ({ request }) => {
  const tudo = linhasCsv(await (await request.get("/admin/leads/export")).text());
  expect(tudo).toBeGreaterThan(50);

  const semana = linhasCsv(
    await (await request.get("/admin/leads/export?periodo=7")).text(),
  );
  expect(semana).toBeLessThan(tudo);

  const busca = linhasCsv(
    await (await request.get("/admin/leads/export?q=zzt-lead-42%40teste")).text(),
  );
  expect(busca).toBe(1);

  // ?p= é ignorado de propósito
  const pagina = linhasCsv(
    await (await request.get("/admin/leads/export?p=3")).text(),
  );
  expect(pagina).toBe(tudo);
});

test("o /admin não responde sem credencial", async ({ browser, baseURL }) => {
  // `browser.newContext()` HERDA as opções do `test.use` — inclusive o header
  // de auth. Sem zerar explicitamente, este teste passaria autenticado e não
  // provaria nada, que é o pior tipo de teste verde.
  const ctx = await browser.newContext({ extraHTTPHeaders: {}, baseURL });
  for (const rota of ["/admin", "/admin/leads", "/admin/leads/export"]) {
    const resp = await ctx.request.get(rota, { failOnStatusCode: false });
    expect([401, 404], rota).toContain(resp.status());
  }
  await ctx.close();
});

test("o filtro de evento é select, não fileira de chips", async ({ page }) => {
  await page.goto("/admin/rsvps");
  await expect(page.locator('select[name="evento"]')).toBeVisible();
  await expect(page.locator('select[name="evento"] option[value=""]')).toHaveText(
    "Todos os eventos",
  );
});

test("slug de evento inventado não vira filtro fantasma", async ({ page }) => {
  await page.goto("/admin/rsvps");
  const todos = await linhas(page);
  await page.goto("/admin/rsvps?evento=nao-existe-mesmo");
  expect(await linhas(page)).toBe(todos);
});
