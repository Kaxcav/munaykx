/**
 * DE-PARA modalidade → acento de categoria.
 *
 * Briefing 07/08/2026, item 3: "Adicionar cor aos cards. Hoje estão
 * visualmente neutros demais e não diferenciam categorias. (…) Cada
 * categoria pode ganhar uma cor de destaque sutil, criando reconhecimento
 * visual rápido."
 *
 * A COR não mora aqui — moram os seis acentos no `tailwind.config.ts`,
 * derivados de `lib/brand.ts`. Aqui mora só o DADO: qual categoria usa qual
 * dos seis. É essa separação que deixa o PO trocar a paleta sem mexer em
 * taxonomia, e trocar a taxonomia sem mexer na paleta.
 *
 * DECISÃO: cor determinística, nunca aleatória e nunca por índice da lista.
 * Se a cor viesse da posição no grid, a mesma comunidade mudaria de cor ao
 * ser filtrada — e "reconhecimento visual rápido" é exatamente o que isso
 * destrói. Aqui, jiu-jítsu é a mesma cor na home, na busca e no mapa.
 */

/** Seis acentos disponíveis (ver ACENTOS_BASE no tailwind.config.ts). */
export type Acento = 1 | 2 | 3 | 4 | 5 | 6;

/** "Vôlei de areia" → "volei de areia" — comparação sem acento nem caixa. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Famílias de modalidade. A ordem importa: a primeira família cujo termo
 * aparecer no texto vence. Por isso "beach tennis" está antes de "tenis" —
 * senão cairia na família errada por conter a palavra maior.
 */
const FAMILIAS: { acento: Acento; rotulo: string; termos: string[] }[] = [
  {
    acento: 1,
    rotulo: "Corpo e mente",
    termos: ["yoga", "ioga", "pilates", "meditacao", "alongamento", "mobilidade"],
  },
  {
    acento: 2,
    rotulo: "Sobre rodas",
    termos: ["pedal", "bike", "ciclismo", "mtb", "skate", "patins", "bicicleta"],
  },
  {
    acento: 3,
    rotulo: "Força",
    termos: ["funcional", "crossfit", "musculacao", "calistenia", "hiit", "treino"],
  },
  {
    acento: 4,
    rotulo: "Correr",
    termos: ["corrida", "run", "trail", "caminhada", "maratona", "cooper"],
  },
  {
    acento: 5,
    rotulo: "Luta",
    termos: [
      "jiu",
      "jitsu",
      "luta",
      "muay",
      "boxe",
      "judo",
      "karate",
      "mma",
      "capoeira",
      "wrestling",
    ],
  },
  {
    acento: 6,
    rotulo: "Coletivo",
    termos: [
      "volei",
      "beach tennis",
      "futebol",
      "basquete",
      "handebol",
      "futevolei",
      "tenis",
      "natacao",
      "remo",
      "escalada",
    ],
  },
];

/**
 * Modalidade desconhecida também precisa de cor estável — o admin digita
 * texto livre, e cair sempre no acento 1 faria metade do grid ficar verde.
 * Hash pequeno e determinístico distribui sem depender de cadastro prévio.
 */
function acentoPorHash(texto: string): Acento {
  let soma = 0;
  for (let i = 0; i < texto.length; i++) soma = (soma * 31 + texto.charCodeAt(i)) % 997;
  return ((soma % 6) + 1) as Acento;
}

export function acentoDaModalidade(modalidade: string | null | undefined): Acento {
  if (!modalidade) return 1;
  const texto = normalizar(modalidade);
  for (const familia of FAMILIAS) {
    if (familia.termos.some((termo) => texto.includes(termo))) return familia.acento;
  }
  return acentoPorHash(texto);
}

/** Nome curto da família — legenda de cor, não substitui o nome real. */
export function familiaDaModalidade(modalidade: string | null | undefined): string | null {
  if (!modalidade) return null;
  const texto = normalizar(modalidade);
  return FAMILIAS.find((f) => f.termos.some((t) => texto.includes(t)))?.rotulo ?? null;
}

/**
 * Classes Tailwind do acento. Devolvidas como STRING PRONTA porque o
 * scanner do Tailwind não executa código — quem garante que estas classes
 * existem no CSS final é a `safelist` do tailwind.config.ts. Mexeu aqui,
 * confira a safelist lá.
 */
export function classesDoAcento(acento: Acento) {
  return {
    fundo: `bg-acento-${acento}-soft`,
    tinta: `text-acento-${acento}-ink`,
    traco: `bg-acento-${acento}`,
    borda: `border-acento-${acento}`,
  };
}

/** Legenda da home: as seis famílias, na ordem dos acentos. */
export const LEGENDA_FAMILIAS = FAMILIAS.map((f) => ({
  acento: f.acento,
  rotulo: f.rotulo,
}));
