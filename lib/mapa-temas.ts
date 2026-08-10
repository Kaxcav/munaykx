import type { LayerSpecification } from "maplibre-gl";
import { namedTheme, layers as camadasTema, type Theme } from "protomaps-themes-base";

/**
 * TRÊS DIREÇÕES VISUAIS do basemap, pro dono escolher.
 *
 * Lição do feedback ("ficou feio"): a paleta MUTED da marca tingindo CADA rua,
 * parque e prédio deixou o mapa lamacento. Mapa bonito usa uma paleta
 * cartográfica própria e harmônica; a MARCA aparece nos ACENTOS (pinos, painel,
 * header) — o coral queimado (#FF6B4A) nos pinos, não no asfalto.
 *
 * Por isso cada direção PARTE de um tema comprovado do `protomaps-themes-base`
 * (light/white/dark) e só ajusta alguns tons — em vez de paleta à mão que já
 * saiu feia uma vez.
 */
export type Direcao = "claro" | "clean" | "escuro";

/** Metadados de composição que o basemap precisa fora das camadas. */
export type EstiloMapa = {
  layers: LayerSpecification[];
  /** Cor de fundo do container (evita flash branco antes dos tiles). */
  fundo: string;
  /** Cor dos prédios extrudados (3D). */
  extrusaoCor: string;
  /** Céu/atmosfera (setSky) — reforça o 3D sob pitch. */
  sky: Record<string, unknown>;
  /** Se o tema é escuro (a UI decide contrastes a partir disso). */
  escuro: boolean;
};

// Ajustes por direção, EM CIMA do tema base. Poucos tons, com intenção.
const RECEITA: Record<
  Direcao,
  { base: "light" | "white" | "dark"; over: Partial<Theme>; extrusaoCor: string; sky: Record<string, unknown>; escuro: boolean }
> = {
  // 1) Claro & vivo — a vibe Waze bem feita: água azul de verdade, parque
  //    verde suave, ruas nítidas com casing. Alto contraste alegre.
  claro: {
    base: "light",
    over: {
      earth: "#e9e5dc",
      water: "#5fc5e8", //           azul vivo (não o cyan pálido)
      park_a: "#cfe3d4",
      park_b: "#93cfa9", //          verde parque saturado o suficiente
      buildings: "#dcd8cf",
    },
    extrusaoCor: "#d8d4ca",
    sky: {
      "sky-color": "#bfe3f0",
      "sky-horizon-blend": 0.7,
      "horizon-color": "#e9f1f2",
      "horizon-fog-blend": 0.6,
      "fog-color": "#e9e5dc",
      "fog-ground-blend": 0.5,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 13, 0.2],
    },
    escuro: false,
  },
  // 2) Clean & moderno — Apple/Mapbox Streets: off-white, hierarquia elegante,
  //    água num azul PÁLIDO tasteful, muita clareza. Premium e minimal.
  clean: {
    base: "white",
    over: {
      background: "#f7f6f2",
      earth: "#f7f6f2",
      water: "#dcebf1", //           azul-gelo discreto
      park_a: "#eef3ee",
      park_b: "#e3eee6",
      buildings: "#eeebe4",
    },
    extrusaoCor: "#ece9e2",
    sky: {
      "sky-color": "#eef3f5",
      "sky-horizon-blend": 0.8,
      "horizon-color": "#ffffff",
      "horizon-fog-blend": 0.6,
      "fog-color": "#f7f6f2",
      "fog-ground-blend": 0.5,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 13, 0.15],
    },
    escuro: false,
  },
  // 3) Escuro premium — basemap sleek, ruas com "glow" (fill claro sobre terra
  //    escura), água num azul profundo. Moderno, high-end.
  escuro: {
    base: "dark",
    over: {
      background: "#262a30",
      earth: "#1b1e23",
      water: "#16202e", //           navy profundo
      park_a: "#1b2620",
      park_b: "#18271f",
      buildings: "#242830",
      highway: "#efe9db", //         via principal quase branca = glow
      major: "#c3bdae",
      minor_a: "#4c515b",
      minor_b: "#3d424b",
      other: "#3d424b",
    },
    extrusaoCor: "#2f333c",
    sky: {
      "sky-color": "#12151b",
      "sky-horizon-blend": 0.6,
      "horizon-color": "#2b3240",
      "horizon-fog-blend": 0.5,
      "fog-color": "#262a30",
      "fog-ground-blend": 0.5,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 13, 0.15],
    },
    escuro: true,
  },
};

/**
 * Monta o estilo completo de uma direção: camadas do tema Protomaps ajustado +
 * a camada de prédios 3D (fill-extrusion) inserida logo antes dos rótulos.
 */
export function estiloDirecao(direcao: Direcao, src = "protomaps"): EstiloMapa {
  const receita = RECEITA[direcao];
  const tema: Theme = { ...namedTheme(receita.base), ...receita.over };
  // `lang: "pt"` traz os rótulos em português (name:pt) além das camadas base.
  const layers = camadasTema(src, tema, { lang: "pt" }) as unknown as LayerSpecification[];

  const extrusao: LayerSpecification = {
    id: "predios-3d",
    type: "fill-extrusion",
    source: src,
    "source-layer": "buildings",
    minzoom: 14,
    paint: {
      "fill-extrusion-color": receita.extrusaoCor,
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["zoom"],
        14, 0,
        15.2, ["coalesce", ["get", "height"], ["get", "render_height"], 8],
      ] as unknown as number,
      "fill-extrusion-base": ["coalesce", ["get", "min_height"], ["get", "render_min_height"], 0] as unknown as number,
      "fill-extrusion-opacity": 0.85,
      "fill-extrusion-vertical-gradient": true,
    },
  };

  // Antes do primeiro rótulo pra não tampar texto.
  const iRotulo = layers.findIndex((l) => typeof l.id === "string" && l.id.includes("label"));
  if (iRotulo >= 0) layers.splice(iRotulo, 0, extrusao);
  else layers.push(extrusao);

  return {
    layers,
    fundo: tema.background ?? tema.earth ?? "#eeeeee",
    extrusaoCor: receita.extrusaoCor,
    sky: receita.sky,
    escuro: receita.escuro,
  };
}

/** Direção default (a base "claro" foi a mais segura pós-feedback). */
export const DIRECAO_PADRAO: Direcao = "claro";

/** Lê a direção de um valor livre (query param), caindo no padrão. */
export function direcaoDe(valor: string | null | undefined): Direcao {
  return valor === "clean" || valor === "escuro" || valor === "claro" ? valor : DIRECAO_PADRAO;
}
