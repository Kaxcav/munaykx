/**
 * As 35 regiões administrativas oficiais do DF — fonte única de qualquer
 * lista de região na UI (select de leads, filtros de /comunidades, admin).
 * Nenhuma lista de região hardcoded fora deste arquivo.
 *
 * Lista verificada em 06/08/2026: o dossiê da SEDUH nomeia RA I–XX; a
 * SINJ/LC 1.028/2023 confirma RA XXXIV Arapoanga e RA XXXV Água Quente
 * (criadas pelas Leis 7.190 e 7.191/2022); as intermediárias (XXI–XXXIII)
 * vieram do cruzamento dessas fontes. Atenção ao atualizar: material de
 * 2020 ainda diz "33 RAs" — não é fonte válida.
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
