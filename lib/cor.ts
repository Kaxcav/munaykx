/**
 * MATEMÁTICA DE COR — funções puras, ZERO imports.
 *
 * POR QUE ESTE ARQUIVO EXISTE (07/08/2026): `tailwind.config.ts` passou a
 * precisar de `misturar()` pra derivar o verde sálvia e os seis acentos de
 * categoria a partir de `lib/brand.ts`. A primeira tentativa foi importar de
 * `lib/tema.ts`, onde as funções já moravam — e o build quebrou com
 * `MODULE_NOT_FOUND`.
 *
 * A razão é sutil e vale ficar registrada: o `tailwind.config.ts` NÃO é
 * compilado pelo webpack do Next. Ele é carregado pelo loader de TS do
 * próprio Tailwind, que **não lê os `paths` do tsconfig** — então o
 * `import { brand } from "@/lib/brand"` que existe dentro do `tema.ts` é
 * resolvível pelo app inteiro e irresolvível ali. O sintoma aponta pro
 * arquivo errado (o erro acusa `lib/tema.ts`, mas o culpado é quem importou).
 *
 * Daí a regra desta camada: **este arquivo não importa nada e nunca vai
 * importar**. É o único jeito de o mesmo código servir ao app (via alias),
 * ao Tailwind (via caminho relativo) e às OG images.
 *
 * `lib/tema.ts` reexporta as duas funções, então quem já importava de lá
 * continua funcionando.
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
 * exige (borda, superfície suave) e pros acentos de categoria — em vez de
 * inventar um hex novo, que seria exatamente a cor fora do `brand.ts` que a
 * regra 4 proíbe.
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
