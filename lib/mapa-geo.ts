/**
 * Coordenadas GEOGRÁFICAS (lng, lat) do CENTRO de cada Região Administrativa
 * do DF — para o basemap real (MapLibre + PMTiles, Fase 1).
 *
 * Por que o CENTRO da RA, e não o ponto exato da comunidade: privacidade
 * (PESQUISA §H). A descoberta pública mostra a REGIÃO, nunca o endereço de um
 * treino. O banco, aliás, nem guarda coordenada de comunidade — guarda RA — e
 * esta tabela é a ponte RA → ponto no mapa.
 *
 * Os valores são o centro APROXIMADO de cada RA (não o centroide geodésico
 * exato). Isso é adequado de propósito: um pino de descoberta por região não
 * quer precisão de metro, quer "é ali por Ceilândia". Todos caem dentro da
 * bbox do DF (lng -48.29..-47.30, lat -16.06..-15.50), a mesma do `df.pmtiles`.
 *
 * TODA RA de `REGIOES_DF` precisa estar aqui — há teste que reprova se faltar
 * uma ou sobrar uma inexistente (espelha a regra de `COORDENADAS` no esquemático).
 */
export const CENTROIDES: Record<string, [lng: number, lat: number]> = {
  "Água Quente": [-48.13, -15.9],
  "Águas Claras": [-48.02, -15.84],
  Arapoanga: [-47.6, -15.6],
  Arniqueira: [-48.02, -15.86],
  Brazlândia: [-48.2, -15.67],
  Candangolândia: [-47.95, -15.85],
  Ceilândia: [-48.11, -15.82],
  Cruzeiro: [-47.94, -15.79],
  Fercal: [-47.85, -15.58],
  Gama: [-48.06, -16.02],
  Guará: [-47.98, -15.82],
  Itapoã: [-47.77, -15.73],
  "Jardim Botânico": [-47.78, -15.87],
  "Lago Norte": [-47.83, -15.74],
  "Lago Sul": [-47.87, -15.84],
  "Núcleo Bandeirante": [-47.97, -15.87],
  Paranoá: [-47.78, -15.77],
  "Park Way": [-47.96, -15.9],
  Planaltina: [-47.61, -15.62],
  "Plano Piloto": [-47.88, -15.79],
  "Recanto das Emas": [-48.06, -15.9],
  "Riacho Fundo": [-48.01, -15.88],
  "Riacho Fundo II": [-48.04, -15.9],
  Samambaia: [-48.09, -15.88],
  "Santa Maria": [-48.01, -16.01],
  "São Sebastião": [-47.78, -15.9],
  "SCIA/Estrutural": [-47.99, -15.78],
  SIA: [-47.95, -15.8],
  Sobradinho: [-47.79, -15.65],
  "Sobradinho II": [-47.83, -15.65],
  "Sol Nascente/Pôr do Sol": [-48.15, -15.82],
  "Sudoeste/Octogonal": [-47.92, -15.79],
  Taguatinga: [-48.06, -15.83],
  Varjão: [-47.87, -15.71],
  "Vicente Pires": [-48.03, -15.8],
};

/** Bounding box do DF — mesma do `df.pmtiles`. [oeste, sul, leste, norte]. */
export const BBOX_DF: [number, number, number, number] = [
  -48.29, -16.06, -47.3, -15.5,
];

/** Centro do DF (Plano Piloto), para o `center` inicial do mapa. */
export const CENTRO_DF: [lng: number, lat: number] = [-47.88, -15.79];

/**
 * URL dos tiles do mapa real, lida no SERVIDOR em RUNTIME (não `NEXT_PUBLIC_`,
 * de propósito: assim o dono ATIVA o mapa real só setando a env no Railway e
 * reiniciando — sem rebuild). Vazia/ausente → `null` → a `/mapa` cai no mapa
 * ESQUEMÁTICO atual (fallback), idêntico a hoje. Zero mudança em produção até
 * o dono setar `MAPA_TILES_URL`.
 */
export function mapaTilesUrl(): string | null {
  const v = process.env.MAPA_TILES_URL?.trim();
  return v ? v : null;
}
