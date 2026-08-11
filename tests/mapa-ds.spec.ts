import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { estiloMapa, PALETA } from "@/lib/mapa-temas";

/**
 * MAPA × DESIGN SYSTEM (lote L7 da rodada shadcn).
 *
 * ── O QUE AQUI É PROVA E O QUE É GUARDA ──────────────────────────────────────
 *
 * **PROVA** (rodado contra `origin/main` antes de entrar, e confirmado
 * VERMELHO lá — teste que nunca falhou não é teste):
 *
 *  1. `a /mapa abre pelo container do design system` — contra a `main` a tela
 *     escrevia o próprio `<main>` e o próprio `<h1>`.
 *  2. `zero controle nativo fora do DS nas pastas do lote` — contra a `main` o
 *     `EixoDeTempo` tinha um `<button>` cru.
 *  3. `zero superfície-card à mão nas pastas do lote` — contra a `main` eram
 *     três (`EixoDeTempo`, `MapaMapLibre`, `MapaTelaCheia`).
 *  4. `cada tom do basemap é declarado UMA vez` — contra a `main` a terra
 *     aparecia em quatro lugares e o branco das vias em quatro.
 *
 * **GUARDA** (existe pra travar o ganho daqui pra frente, não pra provar que
 * ele aconteceu):
 *
 *  5. `o basemap não mudou um pixel` — a assinatura do estilo gerado. Este é o
 *     teste que autoriza o item 4 a existir: dar nome a cor só vale se o mapa
 *     continuar idêntico. **A igualdade foi medida fora do teste**, gerando a
 *     assinatura com o `lib/mapa-temas.ts` de `b50c4d7` e com o daqui: mesmo
 *     hash, 67 camadas, 32 cores. Dentro do teste isso não dá pra reproduzir,
 *     porque contra a `main` o arquivo nem exporta `PALETA` — o describe
 *     inteiro cai no import, que é falha por motivo colateral e não vale como
 *     prova. Registrado assim de propósito: chamar de "prova" o que só ficou
 *     vermelho por acidente é a mesma armadilha do "verde por acidente de
 *     ambiente" do `CLAUDE.md`, virada do avesso.
 *  6. `um <main> só na /mapa` — o L3 descobriu do jeito difícil que adotar o
 *     container padrão sem tirar o `<main>` antigo produz HTML inválido. Passa
 *     dos dois lados de propósito: a tela tinha um antes e tem um agora.
 *
 * ── AS ISENÇÕES SÃO DECISÕES COM NOME, NÃO "O QUE SOBROU" ────────────────────
 *
 * - `<input type="range">` do `EixoDeTempo`: slider NATIVO de propósito. A
 *   pesquisa do mapa (§G) é explícita — slider custom quebra leitor de tela no
 *   toque. O DS não tem `Slider` e não deve ganhar um só pra este caso.
 * - `<input type="radio" class="sr-only">` do `EixoDeTempo`: o visual já é o
 *   `chipVariants` do DS; o rádio embaixo não tem pixel nenhum (é a mesma
 *   isenção do `type="hidden"`, que o guardrail global já concede). Continua
 *   contado porque quem muda o script é o F0, não este lote.
 * - o `<button>` de linha da lista do `MapaTelaCheia`: é uma LINHA de lista de
 *   35 itens (`items-baseline`, `text-left`, `flex-1`), não um botão. Vestir
 *   `<Button>` ali significaria sobrescrever altura, raio, alinhamento e
 *   quebra de linha do variant — ou seja, usar a peça errada pra agradar o
 *   contador, que é como guardrail vira teatro.
 *
 * Para ver estes testes falharem: troque o `<Button>` do `EixoDeTempo` por um
 * `<button>` cru, ou escreva `"#f3f1ec"` duas vezes em `lib/mapa-temas.ts`.
 */

const RAIZ = path.join(__dirname, "..");

/** As pastas e arquivos que o L7 possui (tabela de lotes do QUADRO). */
const ARQUIVOS_DO_LOTE = [
  "app/mapa/page.tsx",
  "components/MapaDF.tsx",
  "components/MapaMapLibre.tsx",
  "components/MapaTelaCheia.tsx",
  "components/EixoDeTempo.tsx",
];

/** `<button>`, `<select>`, `<textarea>` e `<input>` que não seja `hidden`. */
const CONTROLE_CRU =
  /<(?:button|select|textarea)(?=[\s/>])|<input(?![^>]*type="hidden")(?=[\s/>])/g;

/** Raio grande + borda/fundo = card montado à mão em vez de `<Card>`. */
const SUPERFICIE_A_MAO = /rounded-(?:card|3xl|2xl|xl)\b(?=[^"'`]*\b(?:border|bg-)[a-z])/g;

/** Hex de 3, 6 ou 8 dígitos — o mesmo do `scripts/verificar-higiene.mjs`. */
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g;

/**
 * O que cada arquivo do lote pode manter de controle nativo, e por quê. A
 * isenção é por ARQUIVO e por CONTAGEM de propósito: se alguém escrever um
 * controle a mais em qualquer um deles, este teste fica vermelho.
 */
const CONTROLES_ISENTOS: Record<string, number> = {
  // o `<input type="range">` citado no JSDoc + o rádio sr-only + o slider
  "components/EixoDeTempo.tsx": 3,
  // a linha da lista de RAs (ver cabeçalho)
  "components/MapaTelaCheia.tsx": 1,
};

/** Idem pras superfícies: o painel flutuante do mapa em tela cheia. */
const SUPERFICIES_ISENTAS: Record<string, number> = {
  // `rounded-2xl` + `ring-1` do painel lateral sobre o mapa. É um `<aside>`
  // com `aria-label`, e `<Card>` é `<div>` — trocar perderia a semântica de
  // região navegável pelo leitor de tela, que vale mais que o contador.
  "components/MapaTelaCheia.tsx": 1,
};

function ler(rel: string): string {
  return fs.readFileSync(path.join(RAIZ, rel), "utf8");
}

/** Casamentos de um regex, como "arquivo:linha  trecho". */
function ocorrencias(rel: string, re: RegExp): string[] {
  const texto = ler(rel);
  const saida: string[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    const linha = texto.slice(0, m.index).split("\n").length;
    saida.push(`${rel}:${linha}  ${m[0]}`);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return saida;
}

test.describe("as telas do mapa vivem dentro do design system", () => {
  test("a /mapa abre pelo container do design system, não à mão", () => {
    const fonte = ler("app/mapa/page.tsx");

    // PROVA: a tela usa o `<Pagina>` do L1…
    expect(fonte).toContain('from "@/components/comum/Pagina"');
    expect(fonte).toContain("<Pagina");

    // …e não escreve mais o próprio `<main>` nem o próprio `<h1>`. É isto que
    // a `main` fazia, e é o que fazia a tela-referência ser, ela mesma, uma
    // cópia à mão da régua que inspirou.
    expect(fonte).not.toMatch(/<main[\s>]/);
    expect(fonte).not.toMatch(/<h1[\s>]/);

    // Cabeçalho de seção também é peça, não `<h2 className="eyebrow">` solto.
    expect(fonte).not.toMatch(/<h2[\s>]/);
    expect(fonte).toContain('from "@/components/comum/Secao"');
  });

  test("zero controle nativo fora do DS nas pastas do lote", () => {
    for (const rel of ARQUIVOS_DO_LOTE) {
      const achados = ocorrencias(rel, CONTROLE_CRU);
      const teto = CONTROLES_ISENTOS[rel] ?? 0;
      expect(
        achados.length,
        `controle nativo em ${rel} (teto ${teto}):\n${achados.join("\n")}`,
      ).toBe(teto);
    }
  });

  test("zero superfície-card à mão nas pastas do lote", () => {
    for (const rel of ARQUIVOS_DO_LOTE) {
      const achados = ocorrencias(rel, SUPERFICIE_A_MAO);
      const teto = SUPERFICIES_ISENTAS[rel] ?? 0;
      expect(
        achados.length,
        `superfície à mão em ${rel} (teto ${teto}):\n${achados.join("\n")}`,
      ).toBe(teto);
    }
  });
});

test.describe("a paleta cartográfica do basemap", () => {
  test("cada tom é declarado UMA vez — nenhum hex repetido", () => {
    for (const rel of ["lib/mapa-temas.ts", "lib/mapa-estilo.ts"]) {
      const achados = (ler(rel).match(HEX) ?? []).map((h) => h.toLowerCase());
      const repetidos = achados.filter((h, i) => achados.indexOf(h) !== i);
      expect(
        [...new Set(repetidos)],
        `${rel}: tom escrito mais de uma vez — dê nome no objeto da paleta e reuse`,
      ).toEqual([]);
    }
  });

  test("os tons têm nome, e o nome é usado", () => {
    // A paleta é o único lugar onde hex de basemap pode nascer.
    const nomes = Object.keys(PALETA);
    expect(nomes.length).toBeGreaterThanOrEqual(20);
    for (const [nome, valor] of Object.entries(PALETA)) {
      expect(valor, `PALETA.${nome} não é um hex`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  test("o basemap não mudou um pixel com a tokenização", () => {
    const estilo = estiloMapa();
    const json = JSON.stringify(estilo);

    // Assinatura medida nos DOIS lados: em `origin/main` `b50c4d7` (antes da
    // tokenização) e aqui. Se este hash mudar, alguma cor, camada ou ordem do
    // basemap mudou de verdade — o que pode até ser desejado, mas nunca deve
    // acontecer sem alguém decidir. Uma atualização de
    // `protomaps-themes-base` também move este número, e aí a leitura é a
    // mesma: o mapa mudou, confira se você quis isso.
    expect(crypto.createHash("sha256").update(json).digest("hex")).toBe(
      "a824201a3081b0bf4adb7485f37fedc7102cca15fe80b382ad1a6142080c1be5",
    );
    expect(estilo.layers.length).toBe(67);
    expect(estilo.fundo).toBe(PALETA.terra);
  });
});

test("a /mapa tem um <main> só e um <h1> só", async ({ page }) => {
  const resp = await page.goto("/mapa");
  expect(resp?.status()).toBe(200);
  // Dois `<main>` aninhados é HTML inválido, e é exatamente o que acontece
  // quando se adota o container padrão sem tirar o antigo (achado do L3).
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toContainText("região por região");
});
