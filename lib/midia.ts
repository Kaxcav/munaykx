import type { Acento } from "@/lib/modalidades";

/**
 * FEED DE MÍDIA DA HOME — briefing 07/08/2026, item 2.
 *
 * "Criar uma nova seção na landing page dedicada a conteúdo visual — fotos,
 * feed dinâmico e vídeos —, inspirada no formato usado por eventos como o
 * NOW Festival. Objetivo: gerar prova social e desejo mostrando pessoas
 * reais vivendo experiências reais em Brasília."
 *
 * ── O PROBLEMA QUE ESTE ARQUIVO RESOLVE ──────────────────────────────────
 *
 * O objetivo do PO é "pessoas REAIS vivendo experiências REAIS". Só que:
 *
 * 1. Não existe uma única foto no repositório (`public/` está vazia).
 * 2. A regra 3 do projeto proíbe publicar parceiro real sem autorização
 *    formal por escrito — e foto de treino de comunidade é imagem de
 *    parceiro E de pessoa identificável (LGPD, direito de imagem).
 *
 * Ou seja: a seção não podia esperar as fotos pra existir, e não podia
 * nascer com foto de banco de imagem fingindo ser Brasília — prova social
 * falsa é o oposto de prova social, e o site é evidência de edital.
 *
 * ── A SAÍDA ──────────────────────────────────────────────────────────────
 *
 * A seção nasce inteira e funcionando, com composições abstratas geradas em
 * SVG na paleta da marca no lugar das fotos. Elas não fingem ser foto: são
 * assumidamente gráficas, no mesmo idioma visual do `PlanoPiloto`.
 *
 * Quando a foto real chegar, o trabalho é: colocar o arquivo em
 * `public/midia/` e preencher `src` aqui. **Nenhuma linha de componente
 * muda** — `Mosaico.tsx` renderiza `<img>`/`<video>` quando há `src` e a
 * composição quando não há. É a mesma estratégia do `EMAIL_FROM`: o que
 * falta é operação, não código.
 *
 * IMPORTANTE ao preencher: só entra mídia com autorização de uso de imagem
 * assinada por quem aparece E pela comunidade. Sem isso, deixe `src` vazio
 * — a composição cobre.
 */
export type ItemMidia = {
  id: string;
  /** Caminho em /public quando a mídia real existir. Vazio = composição. */
  src?: string;
  /** "video" ganha o selo de play e usa <video> quando houver `src`. */
  tipo: "foto" | "video";
  /** Modalidade — define a cor do acento (lib/modalidades.ts). */
  modalidade: string;
  regiao: string;
  /** Legenda curta, no tom do item 7 do briefing. */
  legenda: string;
  /** Alternativo obrigatório — a seção inteira é conteúdo visual. */
  alt: string;
  /** Peso no grid editorial: alto = ocupa duas linhas. */
  formato: "alto" | "largo" | "quadrado";
  /** Fixado no dado (e não sorteado) pra composição não dançar a cada build. */
  acento?: Acento;
};

export const FEED_MIDIA: ItemMidia[] = [
  {
    id: "corrida-parque",
    tipo: "video",
    modalidade: "corrida",
    regiao: "Parque da Cidade",
    legenda: "6h15 e já tem gente na pista",
    alt: "Composição gráfica em tons de verde representando corredores em movimento no Parque da Cidade",
    formato: "alto",
  },
  {
    id: "yoga-olhos-dagua",
    tipo: "foto",
    modalidade: "yoga",
    regiao: "Parque Olhos d'Água",
    legenda: "Sábado, 8h, tapete na grama",
    alt: "Composição gráfica em verde sálvia representando uma roda de yoga ao ar livre",
    formato: "quadrado",
  },
  {
    id: "jiu-jitsu-noroeste",
    tipo: "foto",
    modalidade: "jiu-jítsu",
    regiao: "Noroeste",
    legenda: "Tatame aberto — pode chegar sem saber nada",
    alt: "Composição gráfica em coral queimado representando um tatame de jiu-jítsu",
    formato: "quadrado",
  },
  {
    id: "volei-lago-sul",
    tipo: "video",
    modalidade: "vôlei de areia",
    regiao: "Lago Sul",
    legenda: "Domingo de manhã, quadra cheia",
    alt: "Composição gráfica em tons de petróleo representando uma partida de vôlei de areia",
    formato: "largo",
  },
  {
    id: "pedal-eixao",
    tipo: "foto",
    modalidade: "pedal",
    regiao: "Eixão do Lazer",
    legenda: "O Eixão fecha e a cidade vira pista",
    alt: "Composição gráfica em petróleo claro representando ciclistas no Eixão do Lazer",
    formato: "quadrado",
  },
  {
    id: "funcional-sudoeste",
    tipo: "foto",
    modalidade: "funcional",
    regiao: "Sudoeste",
    legenda: "Treino em grupo às 6h30",
    alt: "Composição gráfica em coral representando um treino funcional em grupo",
    formato: "quadrado",
  },
];

/** True quando alguma mídia real já foi cadastrada — muda o aviso da seção. */
export function temMidiaReal(): boolean {
  return FEED_MIDIA.some((m) => Boolean(m.src));
}
