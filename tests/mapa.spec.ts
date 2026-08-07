import { test, expect } from "@playwright/test";
import { COORDENADAS, raio } from "@/lib/mapa";
import { REGIOES_DF } from "@/lib/regioes";

/**
 * O mapa do DF.
 *
 * O risco número um aqui não é o desenho ficar feio — é o mapa **mentir**:
 * apontar pra recorte que não existe (404 na cara do visitante), sumir com
 * uma RA em silêncio, ou apresentar conteúdo de demonstração como se fosse
 * parceria firmada (regra 3 do projeto). Os testes abaixo são sobre isso.
 */

test.describe("as coordenadas cobrem o DF inteiro", () => {
  // Sem servidor: é tabela contra tabela.

  test("toda RA oficial tem posição no mapa", () => {
    const semPosicao = REGIOES_DF.filter((r) => !COORDENADAS[r]);
    // Se isto falhar, alguém criou RA em lib/regioes.ts e ela sumiria do
    // mapa sem ninguém perceber — o desenho continuaria bonito e errado.
    expect(semPosicao, `RAs sem coordenada: ${semPosicao.join(", ")}`).toEqual(
      [],
    );
  });

  test("não há posição sobrando pra RA que não existe", () => {
    const oficiais = new Set<string>(REGIOES_DF);
    const inventadas = Object.keys(COORDENADAS).filter((r) => !oficiais.has(r));
    expect(inventadas, `RAs inventadas: ${inventadas.join(", ")}`).toEqual([]);
  });

  test("nenhuma RA cai fora do quadro nem em cima de outra", () => {
    const vistas = new Map<string, string>();
    for (const [regiao, { x, y }] of Object.entries(COORDENADAS)) {
      expect(x, regiao).toBeGreaterThan(4);
      expect(x, regiao).toBeLessThan(84);
      expect(y, regiao).toBeGreaterThan(4);
      expect(y, regiao).toBeLessThan(88);
      const chave = `${x},${y}`;
      expect(vistas.get(chave), `${regiao} está exatamente sobre`).toBe(
        undefined,
      );
      vistas.set(chave, regiao);
    }
  });

  test("o raio cresce devagar — uma RA grande não engole as vizinhas", () => {
    const um = raio({ total: 1 } as never);
    const cem = raio({ total: 100 } as never);
    expect(cem).toBeGreaterThan(um);
    // Teto existe de propósito: sem ele, uma RA com 200 comunidades viraria
    // uma bolha cobrindo meio DF.
    expect(cem).toBeLessThanOrEqual(5.5);
    expect(raio({ total: 0 } as never)).toBeLessThan(um);
  });
});

test("a página abre e as 35 RAs aparecem — nenhuma some", async ({ page }) => {
  const resp = await page.goto("/mapa");
  expect(resp?.status()).toBe(200);

  // Toda RA tem que estar no HTML: ou como link (tem dado) ou no texto de
  // "ainda sem ninguém". Sumir do mapa é o jeito silencioso de errar.
  const html = (await page.content()).replace(/<!-- -->/g, "");
  const ausentes = REGIOES_DF.filter((r) => !html.includes(r));
  expect(ausentes, `RAs fora da página: ${ausentes.join(", ")}`).toEqual([]);
});

test("TODO link do mapa leva a uma página que existe", async ({
  page,
  request,
}) => {
  await page.goto("/mapa");
  const destinos = await page
    .locator('a[href^="/descobrir/"]')
    .evaluateAll((as) => [
      ...new Set(as.map((a) => a.getAttribute("href") ?? "")),
    ]);

  // O contrato central: o link do mapa só existe porque o recorte existe.
  // Se o mapa e a descoberta discordarem, isto vira 404 pro visitante.
  for (const href of destinos) {
    const r = await request.get(href, { failOnStatusCode: false });
    expect(r.status(), href).toBe(200);
  }
});

test("RA sem dado NÃO é link — não se manda ninguém pro vazio", async ({
  page,
}) => {
  await page.goto("/mapa");
  const vazias = await page.locator("section", { hasText: "Ainda sem ninguém" });
  if ((await vazias.count()) === 0) test.skip();
  // O bloco das vazias é texto corrido, sem âncora nenhuma.
  expect(await vazias.first().locator("a").count()).toBe(0);
});

test("o mapa se explica sem depender de enxergar o desenho", async ({
  page,
}) => {
  await page.goto("/mapa");
  // Legenda dos três estados + o aviso de que é esquema, não cartografia.
  // `exact` porque o texto de abertura da página também fala em
  // "comunidade cadastrada" — sem isso o seletor pega os dois e o teste
  // falha por ambiguidade, não por defeito.
  await expect(page.getByText("Comunidade cadastrada", { exact: true })).toBeVisible();
  await expect(page.getByText("Exemplo ilustrativo", { exact: true })).toBeVisible();
  await expect(page.getByText("Sem nada ainda", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Esquema, não mapa cartográfico", { exact: false }),
  ).toBeVisible();
});

test("com só conteúdo demo, o mapa fica fora do Google", async ({
  page,
  request,
}) => {
  // O seed cria só comunidade demo. Enquanto for assim, indexar este mapa
  // afirmaria publicamente uma cobertura que a MUNAY não tem (regra 3).
  await page.goto("/mapa");
  const temReal =
    (await page.locator('aside li a >> text=exemplo').count()) <
    (await page.locator("aside li a").count());

  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  if (temReal) {
    expect(robots ?? "").not.toContain("noindex");
  } else {
    expect(robots ?? "").toContain("noindex");
    // E fora do sitemap, pelo mesmo motivo.
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).not.toContain("/mapa");
  }
});
