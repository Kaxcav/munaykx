import type { LayerSpecification } from "maplibre-gl";
import { brand } from "@/lib/brand";
import { misturar } from "@/lib/cor";

/**
 * Estilo próprio do mapa da MUNAY — vibe "tipo Waze" (INSPIRAÇÃO no aesthetic,
 * não cópia do visual proprietário): rua como herói (casing + fill, hierarquia
 * clara), terra suave, água e PARQUES bem visíveis. Toda a paleta sai da marca
 * (areia/petroleo/salvia via `misturar`), nunca os azuis do Waze.
 *
 * O look é 100% paint/layout das camadas do schema Protomaps Basemap v4
 * (source-layers: earth, landcover, landuse, water, roads, buildings,
 * boundaries, places, pois) — os DADOS não mudam, só como se pintam.
 *
 * Fácil de ajustar: as cores estão nomeadas no topo; largura de via é uma
 * função de zoom reaproveitada. Trocar um tom = uma linha.
 */

// ── Paleta do mapa, derivada da marca ────────────────────────────────────────
const C = {
  fundo: brand.areia, //                                       base clara
  terra: misturar(brand.areia, brand.petroleo, 0.05), //       terra levemente mais quente
  agua: misturar(brand.petroleo, brand.areia, 0.72), //        teal pálido (petróleo diluído)
  aguaBorda: misturar(brand.petroleo, brand.areia, 0.58),
  verdeSuave: misturar(brand.salvia, brand.areia, 0.68), //    landcover amplo, discreto
  parque: misturar(brand.salvia, brand.areia, 0.42), //        parque: sálvia visível
  quadra: misturar(brand.salvia, brand.areia, 0.22), //        campo/quadra esportiva: mais forte
  predio: misturar(brand.areia, brand.petroleo, 0.09), //      prédio: cinza-quente sutil
  // Vias — herói. Casing escuro + fill claro (Waze-like), contraste alto.
  viaFill: misturar(brand.areia, "#ffffff", 0.7), //           branco-creme das ruas
  viaBigFill: "#ffffff", //                                    principais: branco puro, saltam
  casingBig: misturar(brand.petroleo, brand.areia, 0.35), //   contorno forte
  casingMed: misturar(brand.petroleo, brand.areia, 0.6),
  casingSmall: misturar(brand.petroleo, brand.areia, 0.78),
  trilha: brand.salvia, //                                     trilha/caminho (corrida/pedal)
  trilho: misturar(brand.petroleo, brand.areia, 0.55),
  divisa: misturar(brand.petroleo, brand.areia, 0.55), //      divisa de RA
  rotulo: brand.petroleo, //                                   texto
  rotuloHalo: brand.areia,
  rotuloVia: misturar(brand.petroleo, brand.areia, 0.25),
};

// Larguras dos grupos de via por zoom (casing = fill + folga), como no Waze.
const larg = (parada: [number, number][]) =>
  ({
    type: "exponential",
    base: 1.4,
    stops: parada,
  }) as unknown as number;

const GRANDES = ["highway", "major_road"];
const MEDIAS = ["medium_road"];
const PEQUENAS = ["minor_road", "other", "service"];

/**
 * Camadas do estilo, na ordem de desenho (de baixo pra cima).
 * @param src nome da source vetorial (o mesmo do style: "protomaps")
 */
export function camadasMunay(src = "protomaps"): LayerSpecification[] {
  const camadas: LayerSpecification[] = [
    { id: "fundo", type: "background", paint: { "background-color": C.fundo } },
    {
      id: "terra",
      type: "fill",
      source: src,
      "source-layer": "earth",
      paint: { "fill-color": C.terra },
    },
    // Cobertura natural ampla (grama/mata) — bem clarinha, dá "respiro" verde.
    {
      id: "landcover",
      type: "fill",
      source: src,
      "source-layer": "landcover",
      filter: ["match", ["get", "kind"], ["grass", "wood", "forest", "scrub"], true, false],
      paint: { "fill-color": C.verdeSuave, "fill-opacity": 0.6 },
    },
    // PARQUES e áreas verdes de uso — o que mais importa pra MUNAY: destaque.
    {
      id: "parques",
      type: "fill",
      source: src,
      "source-layer": "landuse",
      filter: [
        "match",
        ["get", "kind"],
        ["park", "forest", "wood", "grass", "meadow", "recreation_ground", "garden", "nature_reserve", "village_green", "golf_course"],
        true,
        false,
      ],
      paint: { "fill-color": C.parque, "fill-opacity": 0.85 },
    },
    // Campos/quadras esportivas — onde o esporte acontece: um tom acima.
    {
      id: "quadras",
      type: "fill",
      source: src,
      "source-layer": "landuse",
      filter: ["match", ["get", "kind"], ["pitch", "sports_centre", "stadium", "track"], true, false],
      paint: { "fill-color": C.quadra, "fill-opacity": 0.9 },
    },
    // Água — teal da marca, com borda pra "assentar" o lago.
    {
      id: "agua",
      type: "fill",
      source: src,
      "source-layer": "water",
      paint: { "fill-color": C.agua },
    },
    {
      id: "agua-borda",
      type: "line",
      source: src,
      "source-layer": "water",
      paint: { "line-color": C.aguaBorda, "line-width": 0.6, "line-opacity": 0.5 },
    },
    // Prédios — sutis (Waze quase esconde), só a partir de perto.
    {
      id: "predios",
      type: "fill",
      source: src,
      "source-layer": "buildings",
      minzoom: 13,
      paint: { "fill-color": C.predio, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 15, 0.6] },
    },
    // Divisas de RA — tracejado discreto.
    {
      id: "divisas",
      type: "line",
      source: src,
      "source-layer": "boundaries",
      paint: { "line-color": C.divisa, "line-width": 0.8, "line-dasharray": [3, 2], "line-opacity": 0.45 },
    },

    // ── VIAS: casing (contorno) embaixo, fill em cima — o herói do mapa ──────
    // Trilho primeiro (fica atrás das ruas).
    {
      id: "trilho",
      type: "line",
      source: src,
      "source-layer": "roads",
      filter: ["==", ["get", "kind"], "rail"],
      minzoom: 12,
      paint: { "line-color": C.trilho, "line-width": larg([[12, 0.5], [16, 1.4]]), "line-dasharray": [3, 3] },
    },
    // Casing (contorno) das pequenas, médias, grandes — de baixo pra cima.
    {
      id: "via-peq-casing",
      type: "line",
      source: src,
      "source-layer": "roads",
      filter: ["match", ["get", "kind"], PEQUENAS, true, false],
      minzoom: 12,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": C.casingSmall, "line-width": larg([[12, 1.2], [16, 6], [18, 14]]) },
    },
    {
      id: "via-med-casing",
      type: "line",
      source: src,
      "source-layer": "roads",
      filter: ["match", ["get", "kind"], MEDIAS, true, false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": C.casingMed, "line-width": larg([[9, 1], [13, 4], [16, 11], [18, 20]]) },
    },
    {
      id: "via-grande-casing",
      type: "line",
      source: src,
      "source-layer": "roads",
      filter: ["match", ["get", "kind"], GRANDES, true, false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": C.casingBig, "line-width": larg([[7, 1.4], [12, 5], [16, 15], [18, 26]]) },
    },
    // Fill das mesmas, mais finas — o "miolo" claro da rua.
    {
      id: "via-peq",
      type: "line",
      source: src,
      "source-layer": "roads",
      filter: ["match", ["get", "kind"], PEQUENAS, true, false],
      minzoom: 12,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": C.viaFill, "line-width": larg([[12, 0.4], [16, 4], [18, 11]]) },
    },
    {
      id: "via-med",
      type: "line",
      source: src,
      "source-layer": "roads",
      filter: ["match", ["get", "kind"], MEDIAS, true, false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": C.viaFill, "line-width": larg([[9, 0.6], [13, 2.6], [16, 8], [18, 16]]) },
    },
    {
      id: "via-grande",
      type: "line",
      source: src,
      "source-layer": "roads",
      filter: ["match", ["get", "kind"], GRANDES, true, false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": C.viaBigFill, "line-width": larg([[7, 0.8], [12, 3.4], [16, 11], [18, 20]]) },
    },
    // Trilhas/caminhos (corrida, pedal) — sálvia tracejada, o toque MUNAY.
    {
      id: "trilhas",
      type: "line",
      source: src,
      "source-layer": "roads",
      filter: ["==", ["get", "kind"], "path"],
      minzoom: 13,
      layout: { "line-cap": "round" },
      paint: { "line-color": C.trilha, "line-width": larg([[13, 0.8], [18, 4]]), "line-dasharray": [2, 1.5], "line-opacity": 0.9 },
    },

    // ── RÓTULOS ─────────────────────────────────────────────────────────────
    // Nome de via principal (só as grandes/médias, sem exagero).
    {
      id: "rotulo-via",
      type: "symbol",
      source: src,
      "source-layer": "roads",
      filter: ["match", ["get", "kind"], [...GRANDES, ...MEDIAS], true, false],
      minzoom: 13,
      layout: {
        "symbol-placement": "line",
        "text-field": ["coalesce", ["get", "name:pt"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
      },
      paint: { "text-color": C.rotuloVia, "text-halo-color": C.rotuloHalo, "text-halo-width": 1.4 },
    },
    // Bairros / RAs / localidades.
    {
      id: "rotulo-lugar",
      type: "symbol",
      source: src,
      "source-layer": "places",
      filter: ["match", ["get", "kind"], ["locality", "neighbourhood", "borough", "suburb", "quarter"], true, false],
      layout: {
        "text-field": ["coalesce", ["get", "name:pt"], ["get", "name"]],
        "text-font": ["Noto Sans Medium"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 11, 14, 15],
        "text-max-width": 7,
      },
      paint: { "text-color": C.rotulo, "text-halo-color": C.rotuloHalo, "text-halo-width": 1.6 },
    },
  ];
  return camadas;
}
