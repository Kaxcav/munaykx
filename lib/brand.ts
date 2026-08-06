/**
 * TOKENS DE MARCA — MUNAY ("Vitalidade Serena")
 * Fonte única dos hex da paleta. O tailwind.config.ts importa daqui, e as
 * OG images (next/og não enxerga classes Tailwind) também. Se o PO trocar
 * a paleta (decisão 0.3), a troca continua acontecendo num arquivo só.
 */
export const brand = {
  areia: "#F6F3EA", // base clara predominante
  petroleo: "#0F3B3C", // tinta / estrutura / seções escuras
  petroleoSoft: "#1C4E4F",
  lime: "#C6FF3D", // acento de energia — usar com parcimônia
  coral: "#FF6B4A", // acento secundário — raríssimo
} as const;
