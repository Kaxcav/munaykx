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

// Ajustes EM CIMA do tema `white`, com intenção. Terra e água/parque ganham
// presença clara; ruas viram fitas brancas com casing hierárquico.
const OVER: Partial<Theme> = {
  background: "#f3f1ec", //           terra off-white quente (base)
  earth: "#f3f1ec",
  water: "#c4dcec", //                azul suave e CLARO (não o cinza do white)
  park_a: "#e3ece0", //               verde discreto
  park_b: "#d6e6d0", //               parque arborizado um tom acima
  wood_a: "#e3ece0",
  wood_b: "#d6e6d0",
  sand: "#efe9dc",
  pedestrian: "#ece9e2",
  buildings: "#e7e2d8", //            footprint um tom acima da terra (lê no plano)
  // Vias: fita branca + casing hierárquico (o que dá a "nitidez limpa").
  highway: "#ffffff",
  major: "#ffffff",
  minor_a: "#ffffff",
  minor_b: "#fbfaf7",
  other: "#fbfaf7",
  highway_casing_late: "#d6d0c4", //  arteriais: contorno mais forte → saltam
  major_casing_late: "#dbd6ca",
  minor_casing: "#e6e2d9", //         locais: contorno leve
  minor_service_casing: "#e9e5dd",
  boundaries: "#c9c4b8", //           divisas de RA discretas
  // Rótulos um tom mais escuros pra legibilidade sobre o claro.
  roads_label_major: "#79746b",
  roads_label_minor: "#97928a",
  city_label: "#4a4842",
  subplace_label: "#7b776e",
};

/** Cor dos prédios extrudados (3D) — cinza-quente claro com gradiente vertical. */
const EXTRUSAO_COR = "#e6e1d7";

/** Céu/atmosfera claro e arejado, coerente com a terra off-white. */
const SKY: Record<string, unknown> = {
  "sky-color": "#e8eef2",
  "sky-horizon-blend": 0.8,
  "horizon-color": "#ffffff",
  "horizon-fog-blend": 0.6,
  "fog-color": "#f3f1ec",
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

  return { layers, fundo: OVER.background ?? "#f3f1ec", sky: SKY };
}
