import { test, expect } from "@playwright/test";
import { criarEvento, limparFixtures, prisma } from "./fixtures";

/**
 * SEO — canonical por rota e structured data de evento.
 *
 * Os dois têm o mesmo modo de falha: parecem funcionar e não funcionam. Um
 * canonical que aponta todo mundo pra home diz ao Google que o site tem uma
 * página só; um JSON-LD que descreve o que a página não mostra é o que o
 * Google chama de spam. Nos dois casos o estrago aparece semanas depois, no
 * domínio que é a evidência da Etapa 2.
 */

test.afterAll(async () => {
  await limparFixtures();
  await prisma.$disconnect();
});

test.describe("canonical resolve pra própria rota", () => {
  /**
   * Comparo o PATH, não a URL inteira, e o motivo é o `NEXT_PUBLIC_SITE_URL`
   * valer nos dois tempos: páginas ESTÁTICAS congelam o host no build (aqui,
   * o fallback `sejamunay.com.br`) e as dinâmicas leem em runtime (o host do
   * teste). Verifiquei isso num servidor real antes de escrever o teste — em
   * produção o build tem a env certa e os dois convergem. O que este teste
   * protege é o que pode quebrar de verdade: o caminho.
   */
  const rotas = ["/", "/comunidades", "/mapa", "/privacidade", "/entrar"];

  for (const rota of rotas) {
    test(`${rota} aponta pra si mesma`, async ({ request }) => {
      const html = await (await request.get(rota)).text();
      const m = html.match(/<link rel="canonical" href="([^"]+)"/);
      expect(m, `${rota} não tem canonical`).not.toBeNull();

      const url = new URL(m![1]);
      const esperado = rota === "/" ? "" : rota;
      expect(url.pathname.replace(/\/$/, ""), `${rota} canonicalizou errado`).toBe(
        esperado,
      );
    });
  }

  test("o canonical NÃO colapsa tudo pra home", async ({ request }) => {
    // O erro clássico de pôr `canonical` no layout raiz sem `./`: toda página
    // do site declara ser a home, e o Google desindexa o resto.
    const [home, comunidades] = await Promise.all([
      (await request.get("/")).text(),
      (await request.get("/comunidades")).text(),
    ]);
    const canon = (h: string) => h.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    expect(canon(home)).not.toBe(canon(comunidades));
  });
});

test.describe("JSON-LD de evento", () => {
  test("a página de evento descreve um Event com o que ela já mostra", async ({
    request,
  }) => {
    await limparFixtures();
    const ev = await criarEvento({
      nome: "seo",
      modalidade: "Corrida",
      regiao: "Ceilândia",
      capacidade: 10,
    });

    const html = await (await request.get(`/eventos/${ev.slug}`)).text();
    const blocos = [
      ...html.matchAll(
        /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
      ),
    ].map((m) => JSON.parse(m[1]));

    const evento = blocos.find((b) => b["@type"] === "Event");
    expect(evento, "nenhum bloco Event no HTML").toBeTruthy();

    // Os quatro campos pedidos, cada um batendo com o que a página exibe.
    expect(evento.name).toBe(`Treino seo`);
    expect(evento.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(evento.url).toContain(`/eventos/${ev.slug}`);
    expect(evento.location["@type"]).toBe("Place");
    expect(evento.location.address.addressLocality).toBe("Ceilândia");
    expect(evento.location.address.addressRegion).toBe("DF");
  });

  test("evento gratuito declara preço 0; nada é inventado", async ({ request }) => {
    await limparFixtures();
    const ev = await criarEvento({ nome: "gratis", capacidade: 5 });

    const html = await (await request.get(`/eventos/${ev.slug}`)).text();
    const evento = [
      ...html.matchAll(
        /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
      ),
    ]
      .map((m) => JSON.parse(m[1]))
      .find((b) => b["@type"] === "Event");

    // A fixture cria evento gratuito por padrão.
    expect(evento.offers?.price).toBe("0");
    expect(evento.offers?.priceCurrency).toBe("BRL");
    // Campos que a página NÃO mostra não podem existir no structured data —
    // descrever o que não está lá é exatamente o padrão que penaliza domínio.
    expect(evento.performer).toBeUndefined();
    expect(evento.image).toBeUndefined();
    expect(evento.description).toBeUndefined();
  });

  test("o JSON-LD é JSON válido e sai escapado, não como marcação", async ({
    request,
  }) => {
    await limparFixtures();
    const ev = await criarEvento({ nome: "valido" });

    const html = await (await request.get(`/eventos/${ev.slug}`)).text();
    const blocos = [
      ...html.matchAll(
        /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
      ),
    ];
    expect(blocos.length).toBeGreaterThan(0);
    for (const b of blocos) {
      expect(() => JSON.parse(b[1])).not.toThrow();
    }
  });

  test("evento inexistente continua 404 — o SEO não criou página fantasma", async ({
    request,
  }) => {
    const r = await request.get("/eventos/zzt-nao-existe", {
      failOnStatusCode: false,
    });
    expect(r.status()).toBe(404);
  });
});
