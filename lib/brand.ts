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
  /**
   * VERDE SÁLVIA — acento principal da marca.
   *
   * Entrou em 07/08/2026, pelo briefing do PO ("aumentar o uso do verde
   * sálvia da paleta MUNAY como cor de destaque em toda a landing page").
   *
   * POR QUE PRECISOU ENTRAR: o briefing descreve a paleta MUNAY como
   * "azul petróleo, verde sálvia, coral queimado e areia" — mas o único
   * verde que existia aqui era o `lime` (#C6FF3D), que é verde ÁCIDO, não
   * sálvia. Não dava pra "aumentar o uso do sálvia" sem o sálvia existir.
   * Ele não substitui o lime: divide o trabalho com ele.
   *
   * DIVISÃO DE PAPÉIS (importa pra regra 7 continuar valendo):
   * - `salvia` é o acento de PRESENÇA — pode cobrir área: fundo de card,
   *   faixa, chip, borda de seção. Dessaturado o bastante pra repetir na
   *   página inteira sem cansar, e escuro o bastante pra receber petróleo
   *   por cima com contraste de leitura.
   * - `lime` continua sendo o acento de ENERGIA e continua RARO: um
   *   destaque por dobra, foco (`--ring`), estado de sucesso. É ele que
   *   perde o efeito se virar cor de fundo — não o sálvia.
   */
  salvia: "#7F9A72",
  lime: "#C6FF3D", // acento de energia — usar com parcimônia
  coral: "#FF6B4A", // acento secundário — raríssimo
} as const;
