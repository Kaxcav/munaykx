import { test, expect } from "@playwright/test";
import { CENTROIDES, mapaTilesUrl } from "@/lib/mapa-geo";
import { REGIOES_DF } from "@/lib/regioes";

/**
 * Mapa real (Fase 1) — o gate por env e o fallback.
 *
 * O risco que estes testes prendem: a ativação do mapa real (uma env) não pode
 * mudar produção enquanto o dono não setar, e não pode arrastar o MapLibre
 * (pesado) pro caminho de quem só abre a /mapa no modo esquemático. O screenshot
 * do basemap renderizando é feito à parte (`_mapa-shot.mjs`), com o df.pmtiles
 * servido localmente — CI não tem o arquivo de tiles, então aqui não se testa o
 * basemap em si, só a lógica do gate.
 */

test.describe("centróides das RAs (dado do basemap)", () => {
  test("toda RA tem centro, e nenhum centro é de RA inexistente", () => {
    for (const ra of REGIOES_DF) {
      expect(CENTROIDES[ra], `falta o centro de ${ra}`).toBeDefined();
    }
    const todas: readonly string[] = REGIOES_DF;
    const extras = Object.keys(CENTROIDES).filter((k) => !todas.includes(k));
    expect(extras, `centros de RA que não existem: ${extras.join(", ")}`).toEqual([]);
  });

  test("todo centro cai dentro da bbox do DF", () => {
    for (const [ra, [lng, lat]] of Object.entries(CENTROIDES)) {
      expect(lng, `${ra} lng fora do DF`).toBeGreaterThanOrEqual(-48.29);
      expect(lng, `${ra} lng fora do DF`).toBeLessThanOrEqual(-47.3);
      expect(lat, `${ra} lat fora do DF`).toBeGreaterThanOrEqual(-16.06);
      expect(lat, `${ra} lat fora do DF`).toBeLessThanOrEqual(-15.5);
    }
  });
});

test.describe("o gate lê a env em runtime", () => {
  test("vazia/ausente → null; setada → a URL (trim)", () => {
    const original = process.env.MAPA_TILES_URL;
    try {
      delete process.env.MAPA_TILES_URL;
      expect(mapaTilesUrl()).toBeNull();
      process.env.MAPA_TILES_URL = "   ";
      expect(mapaTilesUrl(), "só espaço = vazio").toBeNull();
      process.env.MAPA_TILES_URL = "https://tiles.sejamunay.com.br/df.pmtiles";
      expect(mapaTilesUrl()).toBe("https://tiles.sejamunay.com.br/df.pmtiles");
    } finally {
      if (original === undefined) delete process.env.MAPA_TILES_URL;
      else process.env.MAPA_TILES_URL = original;
    }
  });
});

test.describe("/mapa sem a env → esquemático intacto (o padrão de produção)", () => {
  test("responde 200, renderiza o esquemático e NÃO carrega o mapa real", async ({
    request,
  }) => {
    const r = await request.get("/mapa");
    // Sem MAPA_TILES_URL no servidor de teste, é o caminho de sempre.
    test.skip(
      !!process.env.MAPA_TILES_URL,
      "servidor subiu COM a env — este teste é do fallback",
    );
    expect(r.status()).toBe(200);
    const html = await r.text();
    expect(html, "sumiu o aviso do esquemático").toContain("Esquema, não mapa cartográfico");
    expect(html, "o container do mapa real não devia estar aqui").not.toContain(
      'data-testid="mapa-real"',
    );
  });
});

test.describe("/mapa com a env → o mapa real monta (roda só quando ativado)", () => {
  test("o container do MapLibre aparece e o esquemático some", async ({ page }) => {
    test.skip(
      !process.env.MAPA_TILES_URL,
      "sem MAPA_TILES_URL no servidor — nada a testar (é o caso do CI)",
    );
    await page.goto("/mapa");
    await expect(page.getByTestId("mapa-real")).toBeVisible();
    await expect(page.locator("text=Esquema, não mapa cartográfico")).toHaveCount(0);
  });
});
