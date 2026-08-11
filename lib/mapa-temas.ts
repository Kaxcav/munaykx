import type { LayerSpecification } from "maplibre-gl";
import { namedTheme, layers as camadasTema, type Theme } from "protomaps-themes-base";

/**
 * ESTILO DO BASEMAP — "Clean & moderno" (tipo Apple/Mapbox Streets).
 *
 * Escolhido pelo dono entre 3 direções exploradas. Lição do feedback anterior
 * ("ficou feio"): a paleta MUTED da marca tingindo CADA rua/parque/prédio
 * deixou tudo lamacento. Aqui o basemap tem paleta cartográfica PRÓPRIA,
 * clara e elegante; a MARCA vive só no ACENTO (pino coral, painel, header).
 *
 * Parte do tema `white` do `protomaps-themes-base` (base comprovada) e ajusta
 * com intenção — o `white` puro é branco/cinza (água cinza, parque invisível),
 * então damos: terra off-white QUENTE, água azul SUAVE mas clara, parque verde
 * DISCRETO, e ruas brancas nítidas com casing hierárquico (highway/major com
 * contorno mais forte que as vias locais). Minimal, premium, nada lamacento.
 */

/** Metadados de composição que o basemap precisa fora das camadas. */
export type EstiloMapa = {
  layers: LayerSpecification[];
  /** Cor de fundo do container (evita flash antes dos tiles). */
  fundo: string;
  /** Céu/atmosfera (setSky) — reforça o 3D sob pitch. */
  sky: Record<string, unknown>;
};

/**
 * ── A PALETA CARTOGRÁFICA, NOMEADA (tokenização do Lote 7) ──────────────────
 *
 * Antes desta rodada os 29 valores estavam soltos nas chaves do tema, e o
 * mesmo tom aparecia escrito de novo mais abaixo sem nada dizendo que era a
 * mesma decisão: a terra em quatro lugares, o branco das vias em quatro, os
 * dois verdes em dois cada. Trocar "a terra" significava caçar quatro linhas e
 * torcer pra não esquecer uma — que é como uma paleta começa a divergir de si
 * mesma. Agora cada tom tem NOME e mora em um lugar só: 29 ocorrências → 20
 * tons de verdade.
 *
 * (E o valor não se repete em comentário: o `verificar:higiene` conta hex em
 * comentário também, e com razão — hex escrito em prosa envelhece mentindo,
 * porque ninguém atualiza os dois lados. O mesmo aviso está no `Pagina.tsx`.)
 *
 * **Por que estes hex NÃO derivam de `lib/brand.ts`** (e por que isso não é
 * violação da regra 4): esta é paleta CARTOGRÁFICA, não paleta de marca —
 * decisão registrada no cabeçalho acima e tomada depois do feedback de que
 * tingir cada rua e parque com a paleta muted da MUNAY deixou tudo lamacento.
 * O basemap é o papel; a marca vive no acento (pino coral, painel, header),
 * onde os tokens do design system mandam. São dois vocabulários, e misturá-los
 * foi tentado e reprovado. O que o Lote 7 podia fazer sem desfazer essa
 * decisão era o que fez: dar nome, matar a duplicata e deixar UM lugar pra
 * mudar cada tom.
 *
 * Cor de MapLibre é `paint` de camada — não passa por Tailwind, não tem
 * `hsl(var(--x))`, não vira classe. Por isso o guardrail continua contando
 * estes 20 (`scripts/verificar-higiene.mjs`): eles não estão isentos, estão
 * **contidos**.
 */
export const PALETA = {
  /** Terra off-white quente — a base de tudo (fundo do container, `earth`). */
  terra: "#f3f1ec",
  /** Água: azul suave e CLARO, não o cinza do tema `white`. */
  agua: "#c4dcec",
  /** Verde discreto de área verde ampla. */
  verdeClaro: "#e3ece0",
  /** Parque arborizado, um tom acima do verde claro. */
  verdeMedio: "#d6e6d0",
  /** Areia/praia. */
  areiaMapa: "#efe9dc",
  /** Calçadão e área de pedestre. */
  pedestre: "#ece9e2",
  /** Footprint de prédio no plano — um tom acima da terra, pra ler. */
  predio: "#e7e2d8",
  /** Vias principais: fita branca pura, é o que dá a nitidez limpa. */
  viaForte: "#ffffff",
  /** Vias locais e o resto: branco levemente quebrado. */
  viaFraca: "#fbfaf7",
  /** Casing das arteriais — o mais forte, faz a via saltar. */
  casingArterial: "#d6d0c4",
  /** Casing das principais. */
  casingPrincipal: "#dbd6ca",
  /** Casing das locais — contorno leve. */
  casingLocal: "#e6e2d9",
  /** Casing de via de serviço — o mais leve. */
  casingServico: "#e9e5dd",
  /** Divisas de RA, discretas. */
  divisa: "#c9c4b8",
  /** Rótulo de via principal. */
  rotuloViaForte: "#79746b",
  /** Rótulo de via secundária. */
  rotuloViaFraca: "#97928a",
  /** Nome de cidade — o rótulo mais escuro. */
  rotuloCidade: "#4a4842",
  /** Nome de bairro/sublugar. */
  rotuloBairro: "#7b776e",
  /** Prédio extrudado (3D) — cinza-quente claro com gradiente vertical. */
  extrusao: "#e6e1d7",
  /** Céu/atmosfera: claro e arejado, coerente com a terra off-white. */
  ceu: "#e8eef2",
} as const;

// Ajustes EM CIMA do tema `white`, com intenção. Terra e água/parque ganham
// presença clara; ruas viram fitas brancas com casing hierárquico.
const OVER: Partial<Theme> = {
  background: PALETA.terra,
  earth: PALETA.terra,
  water: PALETA.agua,
  park_a: PALETA.verdeClaro,
  park_b: PALETA.verdeMedio,
  wood_a: PALETA.verdeClaro,
  wood_b: PALETA.verdeMedio,
  sand: PALETA.areiaMapa,
  pedestrian: PALETA.pedestre,
  buildings: PALETA.predio,
  // Vias: fita branca + casing hierárquico (o que dá a "nitidez limpa").
  highway: PALETA.viaForte,
  major: PALETA.viaForte,
  minor_a: PALETA.viaForte,
  minor_b: PALETA.viaFraca,
  other: PALETA.viaFraca,
  highway_casing_late: PALETA.casingArterial, // arteriais saltam
  major_casing_late: PALETA.casingPrincipal,
  minor_casing: PALETA.casingLocal,
  minor_service_casing: PALETA.casingServico,
  boundaries: PALETA.divisa,
  // Rótulos um tom mais escuros pra legibilidade sobre o claro.
  roads_label_major: PALETA.rotuloViaForte,
  roads_label_minor: PALETA.rotuloViaFraca,
  city_label: PALETA.rotuloCidade,
  subplace_label: PALETA.rotuloBairro,
};

/** Cor dos prédios extrudados (3D) — cinza-quente claro com gradiente vertical. */
const EXTRUSAO_COR = PALETA.extrusao;

/** Céu/atmosfera claro e arejado, coerente com a terra off-white. */
const SKY: Record<string, unknown> = {
  "sky-color": PALETA.ceu,
  "sky-horizon-blend": 0.8,
  "horizon-color": PALETA.viaForte,
  "horizon-fog-blend": 0.6,
  "fog-color": PALETA.terra,
  "fog-ground-blend": 0.5,
  "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 13, 0.15],
};

/**
 * Monta o estilo completo: camadas do tema `white` ajustado + a camada de
 * prédios 3D (fill-extrusion) inserida logo antes dos rótulos.
 */
export function estiloMapa(src = "protomaps"): EstiloMapa {
  const tema: Theme = { ...namedTheme("white"), ...OVER };
  // `lang: "pt"` traz os rótulos em português (name:pt) além das camadas base.
  const layers = camadasTema(src, tema, { lang: "pt" }) as unknown as LayerSpecification[];

  const extrusao: LayerSpecification = {
    id: "predios-3d",
    type: "fill-extrusion",
    source: src,
    "source-layer": "buildings",
    minzoom: 14,
    paint: {
      "fill-extrusion-color": EXTRUSAO_COR,
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["zoom"],
        14, 0,
        15.2, ["coalesce", ["get", "height"], ["get", "render_height"], 8],
      ] as unknown as number,
      "fill-extrusion-base": ["coalesce", ["get", "min_height"], ["get", "render_min_height"], 0] as unknown as number,
      "fill-extrusion-opacity": 0.9,
      "fill-extrusion-vertical-gradient": true,
    },
  };

  const iRotulo = layers.findIndex((l) => typeof l.id === "string" && l.id.includes("label"));
  if (iRotulo >= 0) layers.splice(iRotulo, 0, extrusao);
  else layers.push(extrusao);

  return { layers, fundo: PALETA.terra, sky: SKY };
}
