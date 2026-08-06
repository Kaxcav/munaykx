import { test, expect } from "@playwright/test";
import { criarEvento, limparFixtures, prisma } from "./fixtures";

/**
 * Páginas de recorte (`/descobrir/[recorte]`) — SEO programático.
 *
 * As duas regras aqui não são de UI, são de sobrevivência do domínio:
 * página sem dado tem que ser 404 (200 vazio em massa = doorway page, e isso
 * derruba o domínio inteiro, não só a página ruim), e recorte que só tem
 * conteúdo `demo: true` não pode ir pro índice do Google — publicar parceiro
 * ilustrativo é transformar exemplo em afirmação pública.
 */

test.beforeAll(async () => {
  await limparFixtures();
  await criarEvento({
    nome: "demo",
    modalidade: "Slackline",
    regiao: "Ceilândia",
    demo: true,
  });
  await criarEvento({
    nome: "real",
    modalidade: "Canoagem",
    regiao: "Taguatinga",
    demo: false,
  });
});

test.afterAll(async () => {
  await limparFixtures();
  await prisma.$disconnect();
});

test("recorte com dado responde 200 e se descreve com a frase que a pessoa busca", async ({ page }) => {
  const resp = await page.goto("/descobrir/slackline-em-ceilandia");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Slackline em Ceilândia");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/descobrir\/slackline-em-ceilandia$/,
  );
});

test("modalidade e região sozinhas também têm página", async ({ page }) => {
  await page.goto("/descobrir/slackline");
  await expect(page.locator("h1")).toHaveText("Slackline em Brasília");
  await page.goto("/descobrir/em-ceilandia");
  await expect(page.locator("h1")).toHaveText("Comunidades em Ceilândia");
});

test("recorte sem dado é 404, nunca página oca com 200", async ({ page }) => {
  for (const slug of [
    "slackline-em-taguatinga", // combinação que não existe
    "xadrez", // modalidade que não existe
    "em-lugar-nenhum",
  ]) {
    const resp = await page.goto(`/descobrir/${slug}`);
    expect(resp?.status(), `/descobrir/${slug}`).toBe(404);
  }
});

test("recorte só com demo sai noindex e fora do sitemap", async ({ page, request }) => {
  await page.goto("/descobrir/slackline-em-ceilandia");
  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveAttribute("content", /noindex/);
  // follow continua: o robô não indexa a página, mas anda pelos links dela
  await expect(robots).toHaveAttribute("content", /follow/);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/descobrir/slackline-em-ceilandia<");
});

test("recorte com comunidade real é indexável e entra no sitemap", async ({ page, request }) => {
  await page.goto("/descobrir/canoagem-em-taguatinga");
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/descobrir/canoagem-em-taguatinga");
});

test("os recortes são alcançáveis por link — senão o robô nunca acha", async ({ page }) => {
  await page.goto("/comunidades");
  await expect(
    page.locator('a[href="/descobrir/slackline-em-ceilandia"]'),
  ).toHaveCount(1);
});

test("a página de UMA comunidade não colide com a de recorte", async ({ page }) => {
  const resp = await page.goto("/comunidades/zzt-demo-com");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("body")).not.toContainText("Buscas frequentes");
});
