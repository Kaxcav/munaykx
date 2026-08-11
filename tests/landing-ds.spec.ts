import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

/**
 * LANDING + INSTITUCIONAL × DESIGN SYSTEM (lote L6 da rodada shadcn).
 *
 * ── O QUE AQUI É PROVA E O QUE É GUARDA ─────────────────────────────────
 *
 * Não é rótulo de opinião: o spec foi rodado inteiro contra `origin/main`
 * `b50c4d7` (worktree separada, build de produção da base) ANTES de entrar.
 * Placar medido lá: **8 vermelhos, 3 verdes**. O que ficou vermelho é o que
 * este lote conquistou; o que ficou verde é o que ele não podia quebrar.
 *
 * **PROVA** — vermelho na `main`, verde aqui:
 *
 *  - "zero controle nativo fora do DS": a `main` tinha 11 em
 *    `components/LeadSection.tsx` (2 botões, 8 campos, 1 select).
 *  - "zero superfície-card à mão": a `main` tinha 13, espalhadas por
 *    `Publicos`, `ComoFunciona`, `PainelFuncional`, `FeedAvisos`,
 *    `LeadSection`, `/privacidade` e `/semana`.
 *  - "o honeypot é o ÚNICO controle nativo": na `main` ele era 1 entre 11.
 *  - "a exceção de tema escuro mora num arquivo só": na `main` o override de
 *    escuro estava solto em três seções (e o `inputCls` do `LeadSection` era
 *    a quarta cópia, com um consumidor e nenhum nome).
 *  - "os campos do cadastro são a pílula do DS": na `main` o `inputCls`
 *    era `rounded-xl` (12px). O `<Input>` da MUNAY é pílula (9999px) —
 *    a mesma de `/comunidades`, `/painel` e `/admin`. Este teste mede o
 *    CSS COMPUTADO no navegador, não a classe no fonte: classe fora da
 *    safelist existe no código e não vira regra nenhuma em produção (a
 *    armadilha que o `CLAUDE.md` registra na regra 4).
 *  - "a home não tem controle nativo visível fora do DS": mesmo instrumento,
 *    aplicado ao DOM inteiro da primeira à última dobra.
 *  - "/privacidade abre pelo container padrão": na `main` ela montava o
 *    próprio `<main>` à mão e o link de volta ficava no RODAPÉ da página.
 *
 * **GUARDA** — verde na `main` e verde aqui (o lote mexeu em todo controle
 * do funil; estes três são o que não podia quebrar no caminho):
 *
 *  - "o honeypot continua invisível": é anti-spam, e trocá-lo por `<Input>`
 *    seria estragar a armadilha (ver o comentário no `LeadSection`). O
 *    `CLAUDE.md` avisa: não "consertar" achando que é bug.
 *  - "/semana abre pelo container padrão": eyebrow e `h1` já batiam antes —
 *    o que mudou foi de onde vêm (o `<Pagina>`), e isso não pode custar a
 *    forma que o visitante já lia.
 *  - "a última dobra continua sendo o formulário que cadastra": se a
 *    migração tivesse trocado um `name`, o lead pararia de chegar e nenhum
 *    teste de layout perceberia.
 *
 * **O caso à parte:** "o lote tem arquivos de verdade" também ficou vermelho
 * na `main`, mas não por mérito — `components/landing/` simplesmente não
 * existia lá. Ela é guarda estrutural: sem ela, renomear uma pasta deixaria
 * os testes de regex verdes sem medir nada.
 *
 * Para ver falhar (regra do projeto: teste que nunca falhou não é teste):
 * troque um `<Input>` por `<input>` no `LeadSection`, ou tire o `<Card>` de
 * qualquer seção da landing.
 */

const RAIZ = path.join(__dirname, "..");

/** Os arquivos que o L6 possui (tabela de lotes do QUADRO-SHADCN-MUNAY). */
const PASTAS = ["app/privacidade", "app/semana", "components/landing"];
const AVULSOS = [
  "app/page.tsx",
  "components/Hero.tsx",
  "components/Publicos.tsx",
  "components/ComoFunciona.tsx",
  "components/Mosaico.tsx",
  "components/PainelFuncional.tsx",
  "components/LeadSection.tsx",
  "components/MidiaPlaceholder.tsx",
  "components/FeedAvisos.tsx",
  "components/CorpoAviso.tsx",
  "components/Vitrine.tsx",
  "components/Footer.tsx",
];

/**
 * O único arquivo onde um controle nativo pode aparecer, e por um motivo
 * que não é dívida: o honeypot anti-spam.
 *
 * A isenção é por ARQUIVO de propósito (mesmo desenho do `painel-ds.spec`):
 * um segundo controle cru em qualquer outra tela da landing fica vermelho.
 */
const DONO_DO_HONEYPOT = "components/LeadSection.tsx";

const CONTROLE_CRU =
  /<(?:button|select|textarea)(?=[\s/>])|<input(?![^>]*type="hidden")(?=[\s/>])/g;

const SUPERFICIE_A_MAO = /rounded-(?:card|3xl|2xl|xl)\b(?=[^"'`]*\b(?:border|bg-)[a-z])/g;

function arquivosDoLote(): { rel: string; texto: string }[] {
  const saida: { rel: string; texto: string }[] = [];
  const ler = (abs: string) => {
    saida.push({
      rel: path.relative(RAIZ, abs).replace(/\\/g, "/"),
      texto: fs.readFileSync(abs, "utf8"),
    });
  };
  const andar = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) andar(p);
      else if (p.endsWith(".tsx")) ler(p);
    }
  };
  for (const pasta of PASTAS) andar(path.join(RAIZ, pasta));
  for (const arq of AVULSOS) ler(path.join(RAIZ, arq));
  return saida;
}

function ocorrencias(rel: string, texto: string, re: RegExp): string[] {
  const linhaDe = (idx: number) => texto.slice(0, idx).split("\n").length;
  const achados: string[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    achados.push(`${rel}:${linhaDe(m.index)}  ${m[0].trim()}`);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return achados;
}

test.describe("a landing e as telas institucionais estão dentro do design system", () => {
  test("GUARDA · o lote tem arquivos de verdade", () => {
    expect(arquivosDoLote().length).toBeGreaterThan(14);
  });

  test("PROVA · zero controle nativo fora do DS (só o honeypot, num arquivo)", () => {
    const achados = arquivosDoLote()
      .filter(({ rel }) => rel !== DONO_DO_HONEYPOT)
      .flatMap(({ rel, texto }) => ocorrencias(rel, texto, CONTROLE_CRU));

    expect(
      achados,
      "use Button/Input/SelectNativo/ChipBotao de components/ui, ou " +
        "buttonVariants quando o alvo for <a>/<Link>",
    ).toEqual([]);
  });

  test("PROVA · zero superfície-card montada à mão — todo container é <Card>", () => {
    const achados = arquivosDoLote().flatMap(({ rel, texto }) =>
      ocorrencias(rel, texto, SUPERFICIE_A_MAO),
    );
    expect(achados, "troque o raio+borda à mão por <Card> de components/ui").toEqual(
      [],
    );
  });

  test("PROVA · o honeypot é o ÚNICO controle nativo, e está onde a isenção diz", () => {
    // Espelho do teste acima: se o honeypot sumir (ou virar dois), a
    // isenção fica órfã — e isenção órfã vira permissão silenciosa.
    const dono = arquivosDoLote().find(({ rel }) => rel === DONO_DO_HONEYPOT);
    expect(dono, `${DONO_DO_HONEYPOT} sumiu — reveja a isenção`).toBeTruthy();
    expect(ocorrencias(DONO_DO_HONEYPOT, dono!.texto, CONTROLE_CRU)).toHaveLength(1);
    expect(dono!.texto).toContain('name="site"');
  });

  test("PROVA · a exceção de tema escuro mora num arquivo só", () => {
    // A landing tem três blocos petróleo (card B2B, Bloco 03 e a dobra de
    // cadastro). O override de cor deles vive em `components/landing/Escuro.tsx`
    // — se alguém escrever "bg-petroleo ... text-areia" solto numa seção de
    // novo, a dívida que este lote pagou volta pela porta dos fundos.
    const escuro = path.join(RAIZ, "components/landing/Escuro.tsx");
    expect(fs.existsSync(escuro)).toBe(true);
    const consumidores = arquivosDoLote().filter(({ texto }) =>
      texto.includes("@/components/landing/Escuro"),
    );
    expect(consumidores.length).toBeGreaterThanOrEqual(3);
  });
});

test.describe("o que o visitante vê (CSS computado, não classe no fonte)", () => {
  test("PROVA · os campos do cadastro são a pílula do DS", async ({ page }) => {
    await page.goto("/#cadastro");

    // O campo de nome é representativo: todos os oito passam pelo mesmo
    // `<Input>`. 9999px é `rounded-full`; a `main` tinha 12px (`rounded-xl`).
    const raio = await page
      .locator("#nome")
      .evaluate((el) => getComputedStyle(el).borderRadius);
    expect(raio).toMatch(/9999px|50%/);

    // A altura também vem do DS (`h-11` = 44px), e não de `py-3` à mão.
    const altura = await page
      .locator("#nome")
      .evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(altura).toBe(44);
  });

  test("PROVA · a home não tem controle nativo visível fora do DS", async ({
    page,
  }) => {
    await page.goto("/");

    // Tudo que é controle e está VISÍVEL tem que ter passado pelo DS. O
    // marcador é o raio de pílula, que é a assinatura das peças da MUNAY
    // (Button, Input, SelectNativo e Chip são todos `rounded-full`).
    const quadrados = await page.evaluate(() => {
      const alvos = document.querySelectorAll<HTMLElement>(
        "main button, main input, main select, main textarea",
      );
      return [...alvos]
        .filter((el) => el.offsetParent !== null) // escondido não conta (honeypot)
        .filter((el) => {
          const r = parseFloat(getComputedStyle(el).borderRadius);
          return !(r >= 100 || getComputedStyle(el).borderRadius.includes("%"));
        })
        .map((el) => `${el.tagName.toLowerCase()}#${el.id || "(sem id)"}`);
    });
    expect(quadrados, "controle visível sem o raio do DS").toEqual([]);
  });

  test("GUARDA · o honeypot continua invisível e sem estilo do DS", async ({
    page,
  }) => {
    await page.goto("/");
    const site = page.locator('input[name="site"]');
    await expect(site).toHaveCount(1);
    await expect(site).toBeHidden();
  });

  test("PROVA · /privacidade abre pelo container padrão, com o voltar no topo", async ({
    page,
  }) => {
    await page.goto("/privacidade");

    // Um `<main>` por página — o do `<Pagina>`. Dois seria HTML inválido, e
    // foi o risco que o L3 encontrou ao adotar o container no painel.
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main h1")).toHaveText("Política de privacidade");

    // O voltar agora é o PRIMEIRO link do main (era o último, no rodapé da
    // página) — é a régua da `/mapa`, onde a saída fica junto da entrada.
    const primeiro = page.locator("main a").first();
    await expect(primeiro).toHaveText(/voltar pro início/i);
    await expect(primeiro).toHaveAttribute("href", "/");
  });

  test("GUARDA · /semana abre pelo container padrão", async ({ page }) => {
    await page.goto("/semana");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main h1")).toHaveText("A Semana em Brasília");
    // O eyebrow mono que abre toda tela do site.
    await expect(page.locator("main .eyebrow").first()).toHaveText("Curadoria");
  });

  test("GUARDA · a última dobra continua sendo o formulário que cadastra", async ({
    page,
  }) => {
    // O lote mexeu em TODOS os controles do funil. Se a migração tivesse
    // trocado um `name`, o lead pararia de chegar e nenhum teste de layout
    // perceberia — o campo estaria lá, bonito e inútil.
    await page.goto("/");
    for (const campo of ["nome", "email", "whatsapp", "regiao", "modalidades"]) {
      await expect(page.locator(`#cadastro [name="${campo}"]`)).toHaveCount(1);
    }
    await expect(
      page.locator("#cadastro button[type=submit]"),
    ).toHaveText(/entrar na lista/i);
  });
});
