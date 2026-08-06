import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { brand } from "@/lib/brand";
import { hexParaHsl, misturar, tema, type ChaveTema } from "@/lib/tema";

/**
 * Coerência entre `lib/brand.ts` e as variáveis CSS do shadcn.
 *
 * Este é O teste que justifica adotar o shadcn neste projeto. A regra 4 diz
 * que hex só mora em `lib/brand.ts` — mas o shadcn tematiza por variável CSS
 * no `globals.css`, e CSS não importa TypeScript. Sem uma trava, viram duas
 * fontes de cor que divergem em silêncio: alguém troca a paleta no brand.ts,
 * o site público muda, o /admin não, e ninguém percebe por semanas.
 *
 * Aqui o CSS é tratado como ARTEFATO do brand.ts, e a divergência vira build
 * vermelho.
 */

// `path.join(__dirname, …)` e não `import.meta.url`: o Playwright transpila
// os specs pra CommonJS, onde `import.meta` não existe.
const css = readFileSync(
  path.join(__dirname, "..", "app", "globals.css"),
  "utf8",
);

/** Lê `--primary: 181.3 60% 14.7%;` do :root do globals.css. */
function varDoCss(nome: string): string | null {
  const achado = css.match(new RegExp(`--${nome}:\\s*([^;]+);`));
  return achado ? achado[1].trim() : null;
}

test.describe("o tema do shadcn deriva da marca", () => {
  test("TODA variável do tema existe no globals.css com o valor calculado", () => {
    for (const [chave, esperado] of Object.entries(tema)) {
      const noCss = varDoCss(chave);
      expect(noCss, `--${chave} não existe no globals.css`).not.toBeNull();
      expect(
        noCss,
        `--${chave} divergiu: o globals.css tem "${noCss}", mas lib/tema.ts calcula "${esperado}" a partir do lib/brand.ts. Rode a geração e cole o bloco novo.`,
      ).toBe(esperado);
    }
  });

  test("as cores centrais são LITERALMENTE as da marca, não aproximações", () => {
    // Se alguém "ajustar levemente" o --primary no CSS pra ficar mais bonito,
    // a marca deixa de ser uma só. Isto pega.
    const pares: [ChaveTema, string][] = [
      ["background", brand.areia],
      ["foreground", brand.petroleo],
      ["primary", brand.petroleo],
      ["primary-foreground", brand.areia],
      ["destructive", brand.coral],
      ["ring", brand.lime],
    ];
    for (const [chave, hex] of pares) {
      expect(tema[chave], `--${chave} devia ser ${hex}`).toBe(hexParaHsl(hex));
    }
  });

  test("nenhum hex solto no globals.css — a regra 4 vale pro CSS também", () => {
    // O `:focus-visible` tinha `#c6ff3d` cravado aqui até 06/08/2026,
    // furando a regra em silêncio porque ninguém lê CSS procurando hex.
    const hexSoltos = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexSoltos, `hex encontrado(s) no globals.css: ${hexSoltos.join(", ")}`)
      .toHaveLength(0);
  });

  test("a conversão pra HSL está certa, não só consistente consigo mesma", () => {
    // Consistência sem correção passaria mesmo se a fórmula estivesse errada.
    expect(hexParaHsl("#FFFFFF")).toBe("0 0% 100%");
    expect(hexParaHsl("#000000")).toBe("0 0% 0%");
    expect(hexParaHsl("#FF0000")).toBe("0 100% 50%");
    expect(hexParaHsl("#00FF00")).toBe("120 100% 50%");
    expect(hexParaHsl("#0000FF")).toBe("240 100% 50%");
  });

  test("a mistura de tons não inventa cor fora da marca", () => {
    // Os slots que a marca não define (borda, superfície) vêm de mistura
    // entre cores da marca — nunca de um hex novo escolhido a olho.
    expect(misturar(brand.areia, brand.petroleo, 0)).toBe(brand.areia.toLowerCase());
    expect(misturar(brand.areia, brand.petroleo, 1)).toBe(brand.petroleo.toLowerCase());
    // No meio, tem que ficar ENTRE os dois em luminosidade.
    const meio = misturar(brand.areia, brand.petroleo, 0.5);
    const luz = (h: string) => Number(hexParaHsl(h).split(" ")[2].replace("%", ""));
    expect(luz(meio)).toBeLessThan(luz(brand.areia));
    expect(luz(meio)).toBeGreaterThan(luz(brand.petroleo));
  });

  test("o lime NÃO é o --accent", () => {
    // O shadcn usa --accent como fundo de hover em menu, item selecionado e
    // célula ativa: aparece o tempo todo. A regra 7 diz que lime é acento
    // RARO. Se alguém apontar --accent pro lime, a cor mais rara do projeto
    // vira a mais frequente da tela — e com contraste ruim sobre areia.
    expect(tema.accent).not.toBe(hexParaHsl(brand.lime));
    expect(tema["accent-foreground"]).not.toBe(hexParaHsl(brand.lime));
  });
});
