import { test, expect } from "@playwright/test";
import { criarEvento, limparFixtures, prisma } from "./fixtures";

/**
 * Compartilhamento — o laço de crescimento.
 *
 * O que pode quebrar sem aparecer: (1) o cartão de preview do EVENTO sumir —
 * a comunidade já tinha, o evento não tinha, e link sem preview no WhatsApp
 * parece link quebrado; (2) o texto de compartilhar descrever o que a página
 * não mostra (não-grounded) — o mesmo pecado que penaliza o JSON-LD. Estes
 * testes prendem as duas coisas.
 */

test.afterAll(async () => {
  await limparFixtures();
  await prisma.$disconnect();
});

/** Extrai e decodifica o texto do link `wa.me/?text=...` de um HTML. */
function textoWhatsApp(html: string): string | null {
  const m = html.match(/href="https:\/\/wa\.me\/\?text=([^"]+)"/);
  return m ? decodeURIComponent(m[1]) : null;
}

test.describe("cartão de preview (OG image)", () => {
  test("o EVENTO tem OG image (a lacuna que faltava) — 200 e PNG", async ({ request }) => {
    await limparFixtures();
    const ev = await criarEvento({ nome: "share-og", modalidade: "Corrida", regiao: "Ceilândia" });

    const r = await request.get(`/eventos/${ev.slug}/opengraph-image`);
    expect(r.status(), "OG image do evento não respondeu 200").toBe(200);
    expect(r.headers()["content-type"]).toContain("image/png");
  });

  test("a página de evento aponta pra sua OG image e reusa o título", async ({ request }) => {
    await limparFixtures();
    const ev = await criarEvento({ nome: "share-meta" });

    const html = await (await request.get(`/eventos/${ev.slug}`)).text();
    expect(html, "sem og:image no evento").toMatch(/property="og:image"/);
    // Next deriva og:title do title da metadata (com o template `%s · MUNAY`
    // do layout raiz) — então basta CONTER o título do evento.
    expect(html).toMatch(/property="og:title" content="[^"]*Treino share-meta/);
  });

  test("regressão: a COMUNIDADE continua com OG image", async ({ request }) => {
    await limparFixtures();
    const ev = await criarEvento({ nome: "share-com" });

    const r = await request.get(`/comunidades/${ev.comunidadeSlug}/opengraph-image`);
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/png");
  });
});

test.describe("botões de compartilhar (grounded, no HTML do servidor)", () => {
  test("evento: link do WhatsApp com texto real + URL do evento", async ({ request }) => {
    await limparFixtures();
    const ev = await criarEvento({ nome: "share-ev-wa", modalidade: "Yoga", regiao: "Ceilândia" });

    const html = await (await request.get(`/eventos/${ev.slug}`)).text();
    const texto = textoWhatsApp(html);
    expect(texto, "sem link de WhatsApp na página de evento").not.toBeNull();

    // Grounded: usa o título e o LOCAL reais do evento (a fixture põe
    // "Parque da Cidade"), mais o link real.
    expect(texto).toContain("Bora nesse? Treino share-ev-wa");
    expect(texto).toContain("Parque da Cidade");
    expect(texto).toContain(`/eventos/${ev.slug}`);

    // Os outros dois caminhos também estão no HTML (o nativo é só-JS, não entra).
    expect(html).toContain("Copiar link");
    expect(html).toContain("WhatsApp");
  });

  test("comunidade: link do WhatsApp com modalidade/região reais + URL", async ({ request }) => {
    await limparFixtures();
    const ev = await criarEvento({ nome: "share-com-wa", modalidade: "Vôlei", regiao: "Taguatinga" });

    const html = await (await request.get(`/comunidades/${ev.comunidadeSlug}`)).text();
    const texto = textoWhatsApp(html);
    expect(texto, "sem link de WhatsApp na página de comunidade").not.toBeNull();

    expect(texto).toContain("Achei essa galera de Vôlei no Taguatinga");
    expect(texto).toContain(`/comunidades/${ev.comunidadeSlug}`);
  });

  test("nada inventado: o texto não traz campo que a página não tem", async ({ request }) => {
    await limparFixtures();
    const ev = await criarEvento({ nome: "share-grounded", modalidade: "Corrida", regiao: "Ceilândia" });

    const html = await (await request.get(`/eventos/${ev.slug}`)).text();
    const texto = textoWhatsApp(html)!;
    // Grounded de verdade: nenhum campo ausente vaza como "undefined" nem vira
    // "no null". Quando não houver `local`, o fallback é a região da comunidade
    // (nunca um valor vazio) — este teste prende essa promessa.
    expect(texto).not.toContain("undefined");
    expect(texto).not.toMatch(/no null/i);
  });
});
