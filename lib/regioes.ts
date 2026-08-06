/**
 * As 35 regiões administrativas oficiais do DF — fonte única de qualquer
 * lista de região na UI (select de leads, filtros de /comunidades, admin).
 * Nenhuma lista de região hardcoded fora deste arquivo.
 *
 * Lista verificada em fonte oficial em 06/08/2026: SEDUH (RA I–XXXIII) e
 * SINJ/LC 1.028/2023 (RA XXXIV Arapoanga e RA XXXV Água Quente, criadas
 * pelas Leis 7.190 e 7.191/2022). Fontes de 2020 ainda dizem "33 RAs".
 * Cobertura de todo o DF é requisito de produto (Blueprint §8): a MUNAY se
 * propõe a alcançar além do Plano Piloto.
 */
export const REGIOES_DF = [
  "Água Quente",
  "Águas Claras",
  "Arapoanga",
  "Arniqueira",
  "Brazlândia",
  "Candangolândia",
  "Ceilândia",
  "Cruzeiro",
  "Fercal",
  "Gama",
  "Guará",
  "Itapoã",
  "Jardim Botânico",
  "Lago Norte",
  "Lago Sul",
  "Núcleo Bandeirante",
  "Paranoá",
  "Park Way",
  "Planaltina",
  "Plano Piloto",
  "Recanto das Emas",
  "Riacho Fundo",
  "Riacho Fundo II",
  "Samambaia",
  "Santa Maria",
  "São Sebastião",
  "SCIA/Estrutural",
  "SIA",
  "Sobradinho",
  "Sobradinho II",
  "Sol Nascente/Pôr do Sol",
  "Sudoeste/Octogonal",
  "Taguatinga",
  "Varjão",
  "Vicente Pires",
] as const;

/** Escape pra quem está fora do DF (RIDE/Entorno) — sempre no FIM da lista. */
export const REGIAO_OUTRA = "Outra região";

/** Lista pronta pra selects/filtros: 35 RAs + "Outra região" no fim. */
export const REGIOES_COM_OUTRA: readonly string[] = [
  ...REGIOES_DF,
  REGIAO_OUTRA,
];
