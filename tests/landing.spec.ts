import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { FEED_MIDIA } from "@/lib/midia";
import { LEGENDA_FAMILIAS } from "@/lib/modalidades";

/**
 * A landing depois do briefing do PO (07/08/2026).
 *
 * Estes testes travam o que foi PEDIDO, não o que foi escrito: se alguém
 * reintroduzir a frase removida ou apagar uma seção nova, o CI reprova antes
 * de o Mateus descobrir abrindo o site.
 */

const RAIZ = path.join(__dirname, "..");

test.describe("item 1 — a frase de categorias saiu e não volta", () => {
  test("a home não lista modalidades como se fosse cardápio", async ({ page }) => {
    // A frase que o PO mandou remover era a enumeração "corrida, lutas,
    // ioga, funcional e o que mais a cidade tiver".
    //
    // Este teste checa o HTML RENDERIZADO, não o arquivo-fonte — e a
    // primeira versão dele checava o fonte e reprovou por um motivo que
    // vale registrar: o comentário no topo do `Hero.tsx` CITA a frase pra
    // explicar por que ela saiu. Um teste que proíbe a string no código
    // proíbe também documentar a decisão, e aí a próxima pessoa remove o
    // comentário em vez do texto. O que não pode voltar é o que o visitante
    // lê.
    await page.goto("/");
    await expect(page.locator("main")).not.toContainText(
      /o que mais a cidade tiver/i,
    );
  });

  test("a primeira dobra continua tendo os dois caminhos", () => {
    // Remover a frase não podia levar junto as duas portas de entrada
    // (participar / organizar) — elas são o funil inteiro do site.
    const hero = fs.readFileSync(path.join(RAIZ, "components", "Hero.tsx"), "utf8");
    expect(hero).toContain("#cadastro");
    expect(hero).toContain("#organizador");
  });
});

test.describe("as seções pedidas existem e estão na ordem certa", () => {
  test("mídia (item 2) vem ANTES de 'Brasília treina todo dia' (item 3)", () => {
    // O item 3 do briefing amarra a ordem com todas as letras: "Abaixo da
    // seção de mídia, manter a seção de chamada local".
    const page = fs.readFileSync(path.join(RAIZ, "app", "page.tsx"), "utf8");
    const mosaico = page.indexOf("<Mosaico />");
    const vitrine = page.indexOf("<Vitrine />");
    const painel = page.indexOf("<PainelFuncional />");
    expect(mosaico).toBeGreaterThan(-1);
    expect(vitrine).toBeGreaterThan(-1);
    expect(painel).toBeGreaterThan(-1);
    expect(mosaico).toBeLessThan(vitrine);
    expect(vitrine).toBeLessThan(painel);
  });

  test("a home renderiza as seções novas", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /gente que saiu de casa/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Brasília treina todo dia/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Nenhum deles é um app de busca/i }),
    ).toBeVisible();
  });

  test("os três blocos do painel funcional aparecem (item 4)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Comunidade", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mapa", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Organizadores", exact: true })).toBeVisible();
  });

  test("Organizadores fala com os DOIS públicos, separados (item 4.1)", async ({
    page,
  }) => {
    // Decisão do Kaxcav em 07/08/2026: B2B **e** B2S. E "os dois" resolvido
    // direito não é uma copy que serve pros dois — são duas mensagens, cada
    // uma dizendo o nome de quem ela quer. Copy neutra faria cada público
    // achar que o site é do outro.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Você organiza/i })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Sua marca patrocina/i }),
    ).toBeVisible();

    // Cada trilha nomeia o seu público — é isso que faz a pessoa se
    // reconhecer numa e ignorar a outra.
    await expect(page.getByText(/professor autônomo/i)).toBeVisible();
    await expect(page.getByText(/rede de academias/i)).toBeVisible();
  });

  test("só UMA das trilhas tem o botão sólido — senão não há prioridade", async ({
    page,
  }) => {
    // Dois CTAs de mesmo peso lado a lado é a definição de nenhuma
    // prioridade. A trilha de produção vem primeiro porque é ela que coloca
    // oferta no ar antes de 03/09; a institucional negocia em trimestres.
    await page.goto("/");
    const solidos = page.locator("#plataforma a.bg-lime");
    await expect(solidos).toHaveCount(1);
    await expect(solidos).toHaveText(/Quero publicar/i);
  });

  test("Cursos aparece como roadmap e NÃO como link (item 5)", async ({ page }) => {
    await page.goto("/");
    const cursos = page.getByText(/Cursos/).first();
    await expect(cursos).toBeVisible();
    // Link pra página que não existe é pior que ausência de link — e o
    // rodapé/roadmap aparece em toda página, então seria 404 multiplicado.
    expect(await page.locator('a[href*="/cursos"]').count()).toBe(0);
  });
});

test.describe("item 3 — cor por categoria nos cards", () => {
  test("a legenda de famílias está completa e sem repetição", () => {
    expect(LEGENDA_FAMILIAS).toHaveLength(6);
    expect(new Set(LEGENDA_FAMILIAS.map((f) => f.acento)).size).toBe(6);
    expect(new Set(LEGENDA_FAMILIAS.map((f) => f.rotulo)).size).toBe(6);
  });

  test("as classes de acento chegam no CSS servido — a safelist funciona", async ({
    page,
  }) => {
    // O acento é escolhido em RUNTIME, então o scanner do Tailwind não vê a
    // classe no código. Sem a `safelist` do tailwind.config.ts, o card sai
    // colorido em dev e CINZA em produção — o pior tipo de bug de build,
    // porque não aparece em nenhuma máquina de desenvolvimento.
    //
    // ⚠️ Este teste JÁ FOI FRÁGIL e o conserto foi no componente, não aqui:
    // o `<article>` só ganhava a classe de cor quando o card NÃO tinha link,
    // então o resultado dependia de o banco ter comunidade cadastrada. Ele
    // passava com banco vazio e falhava com banco cheio. Hoje o `<article>`
    // carrega o estilo nos dois caminhos.
    await page.goto("/");
    const cards = page.locator("#comunidades article");
    await expect(cards.first()).toBeVisible();

    const fundos = await cards.evaluateAll((els) =>
      els.map((e) => getComputedStyle(e).backgroundColor),
    );
    expect(fundos.length).toBeGreaterThan(1);

    // Nenhum card pode sair sem cor — transparente é o sintoma exato da
    // safelist faltando.
    for (const f of fundos) {
      expect(f, `card sem fundo: ${f}`).not.toBe("rgba(0, 0, 0, 0)");
    }
    // E as categorias precisam se DIFERENCIAR entre si.
    expect(new Set(fundos).size).toBeGreaterThan(1);
  });
});

test.describe("item 2 — mídia sem foto real não pode virar prova social falsa", () => {
  test("todo item do feed declara texto alternativo", () => {
    for (const m of FEED_MIDIA) {
      expect(m.alt, m.id).toBeTruthy();
      expect(m.alt.length, m.id).toBeGreaterThan(20);
    }
  });

  test("os ids são únicos — o id define o desenho da composição", () => {
    const ids = FEED_MIDIA.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("sem mídia real, a seção AVISA que é ilustração", async ({ page }) => {
    // Regra 3 do projeto: exemplo não pode parecer parceria firmada. Foto
    // passa por prova social sem ninguém questionar — o aviso é o que
    // impede a seção de afirmar algo que não temos.
    const temReal = FEED_MIDIA.some((m) => m.src);
    test.skip(temReal, "já existe mídia real cadastrada — o aviso sai de cena");
    await page.goto("/");
    await expect(page.getByText(/Composições ilustrativas/i)).toBeVisible();
  });
});

test.describe("item 13 — rodapé", () => {
  test("nenhum canal falso vai ao ar enquanto o dado real não existe", async ({
    page,
  }) => {
    await page.goto("/");
    const rodape = page.locator("footer");
    // Placeholder de telefone/handle é exatamente o que produziu o
    // `contato@munay.app.br` que ficou semanas no ar (ver tests/contato).
    await expect(rodape).not.toContainText(/9xxxx|xxxxx|@munay\b|\(00\)/i);
  });

  test("TODO link institucional do rodapé leva a uma página que existe", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const hrefs = await page
      .locator("footer a[href^='/']")
      .evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of new Set(hrefs)) {
      // Âncora da home (#como-funciona) resolve pra "/" mesmo.
      const url = href.startsWith("/#") ? "/" : href;
      const r = await request.get(url);
      expect(r.status(), `${href} respondeu ${r.status()}`).toBeLessThan(400);
    }
  });
});

test.describe("as telas de conta não vazam pro Google nem pra quem não logou", () => {
  test("/perfil e /meus-ingressos mandam pro login sem sessão", async ({ page }) => {
    for (const rota of ["/perfil", "/meus-ingressos", "/minhas-inscricoes"]) {
      await page.goto(rota);
      await expect(page, `${rota} não redirecionou`).toHaveURL(/\/entrar/);
    }
  });

  test("as três estão fora do robots — elas mostram dado pessoal", () => {
    for (const arq of [
      "app/perfil/page.tsx",
      "app/meus-ingressos/page.tsx",
      "app/minhas-inscricoes/page.tsx",
    ]) {
      const src = fs.readFileSync(path.join(RAIZ, arq), "utf8");
      expect(src, arq).toMatch(/robots:\s*\{\s*index:\s*false/);
    }
  });
});
