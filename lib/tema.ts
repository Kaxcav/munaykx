import { brand } from "@/lib/brand";

/**
 * TEMA shadcn/ui derivado da marca.
 *
 * Por que este arquivo existe: o shadcn tematiza por variáveis CSS
 * (`--primary`, `--muted`, `--ring`…), e a regra 4 do projeto diz que hex só
 * mora em `lib/brand.ts`. Adotar o shadcn do jeito padrão criaria uma SEGUNDA
 * fonte de cor no `globals.css`, e as duas divergiriam em silêncio — o
 * `brand.ts` existe justamente porque o `next/og` não enxerga classe do
 * Tailwind e precisa dos hex em TypeScript.
 *
 * Então: a marca continua mandando, e as variáveis do shadcn são CALCULADAS
 * a partir dela. O `globals.css` guarda o resultado (CSS não importa TS), e
 * `tests/tema.spec.ts` compara os dois — divergiu, o CI fica vermelho em vez
 * de aparecer um botão com a cor errada três semanas depois.
 *
 * Formato: o shadcn no Tailwind 3 espera "H S% L%" sem o `hsl()`, porque o
 * consumidor escreve `hsl(var(--primary))` e assim consegue aplicar alpha
 * (`hsl(var(--primary) / 0.5)`).
 */

/** "#0F3B3C" → [15, 59, 60] */
function hexParaRgb(hex: string): [number, number, number] {
  const limpo = hex.replace("#", "");
  return [
    parseInt(limpo.slice(0, 2), 16),
    parseInt(limpo.slice(2, 4), 16),
    parseInt(limpo.slice(4, 6), 16),
  ];
}

/** "#0F3B3C" → "181 60% 15%" (o formato que o shadcn espera) */
export function hexParaHsl(hex: string): string {
  const [r255, g255, b255] = hexParaRgb(hex);
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  const arredonda = (n: number) => Math.round(n * 10) / 10;
  return `${arredonda(h * 360)} ${arredonda(s * 100)}% ${arredonda(l * 100)}%`;
}

/**
 * Mistura dois hex. Serve pros tons que a marca não define mas o shadcn
 * exige (borda, superfície suave) — em vez de inventar um hex novo, que
 * seria exatamente a cor fora do `brand.ts` que a regra 4 proíbe.
 */
export function misturar(hexA: string, hexB: string, proporcao: number): string {
  const a = hexParaRgb(hexA);
  const b = hexParaRgb(hexB);
  const canal = (i: 0 | 1 | 2) =>
    Math.round(a[i] * (1 - proporcao) + b[i] * proporcao);
  return `#${[canal(0), canal(1), canal(2)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}

const BRANCO = "#FFFFFF";

/**
 * Os slots do shadcn, preenchidos pela marca.
 *
 * DECISÃO QUE IMPORTA: **`--accent` NÃO é o lime.** O shadcn usa `--accent`
 * como fundo de hover de item de menu, opção selecionada, célula ativa — ou
 * seja, aparece o tempo todo. A regra 7 do projeto diz que lime é "acento
 * raro, não cor de fundo de texto". Botar lime ali transformaria o acento
 * mais raro na cor mais frequente da tela, e ainda por cima com contraste
 * ruim. O lime fica no `--ring` (foco), que é onde ele já estava no
 * `:focus-visible`, e no resto continua sendo escolha manual e deliberada.
 */
export const tema = {
  background: hexParaHsl(brand.areia),
  foreground: hexParaHsl(brand.petroleo),

  card: hexParaHsl(BRANCO),
  "card-foreground": hexParaHsl(brand.petroleo),
  popover: hexParaHsl(BRANCO),
  "popover-foreground": hexParaHsl(brand.petroleo),

  primary: hexParaHsl(brand.petroleo),
  "primary-foreground": hexParaHsl(brand.areia),

  // Superfície secundária: areia puxada levemente pro petróleo.
  secondary: hexParaHsl(misturar(brand.areia, brand.petroleo, 0.06)),
  "secondary-foreground": hexParaHsl(brand.petroleo),

  muted: hexParaHsl(misturar(brand.areia, brand.petroleo, 0.06)),
  "muted-foreground": hexParaHsl(misturar(brand.petroleo, brand.areia, 0.4)),

  // Ver a decisão acima: acento é tom da marca, nunca o lime.
  accent: hexParaHsl(misturar(brand.areia, brand.petroleo, 0.1)),
  "accent-foreground": hexParaHsl(brand.petroleo),

  destructive: hexParaHsl(brand.coral),
  "destructive-foreground": hexParaHsl(brand.areia),

  border: hexParaHsl(misturar(brand.areia, brand.petroleo, 0.14)),
  input: hexParaHsl(misturar(brand.areia, brand.petroleo, 0.2)),
  // Foco em lime — igual ao :focus-visible que já existia no globals.css,
  // onde o hex estava HARDCODED fora do brand.ts (corrigido aqui).
  ring: hexParaHsl(brand.lime),
} as const;

export type ChaveTema = keyof typeof tema;

/** O bloco `:root` que o globals.css tem que conter, gerado. */
export function blocoCssDoTema(): string {
  return Object.entries(tema)
    .map(([chave, valor]) => `  --${chave}: ${valor};`)
    .join("\n");
}
