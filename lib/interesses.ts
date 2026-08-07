import { acentoDaModalidade, type Acento } from "@/lib/modalidades";

/**
 * TAGS DE INTERESSE — briefing 07/08/2026, item 11.1.
 *
 * "Adotar seleção de preferências por tags, seguindo o padrão de interface
 * usado por apps de relacionamento como o Tinder. Exemplos: comida saudável,
 * corrida, jiu-jitsu, ioga, pedal, vôlei de areia, funcional. Objetivo:
 * mapear quais esportes e atividades a pessoa pratica e quais são seus
 * interesses particulares."
 *
 * ── DUAS CATEGORIAS, E A DIFERENÇA IMPORTA ───────────────────────────────
 *
 * O briefing junta duas coisas no mesmo pedido: "quais esportes PRATICA" e
 * "quais são seus INTERESSES particulares". Não são a mesma pergunta —
 * quem corre e gosta de cerveja artesanal não quer ver evento de corrida
 * patrocinado por cervejaria pelo mesmo motivo.
 *
 * Por isso as tags têm `tipo`:
 * - `pratica` — alimenta recomendação de comunidade e evento. É o sinal
 *   forte: casa direto com a `modalidade` do catálogo.
 * - `estilo` — alimenta afinidade entre PESSOAS e o tom do que é sugerido.
 *   Sinal fraco pra recomendar treino, sinal forte pra "vocês combinam".
 *
 * ── CATÁLOGO FECHADO, DE PROPÓSITO ───────────────────────────────────────
 *
 * Tag livre viraria "corrida", "Corrida", "corridas", "run" e "correr" — cinco
 * tags pra mesma coisa, e nenhuma agregação possível. O preço é ter que
 * editar este arquivo pra acrescentar; é um preço barato perto de um campo
 * de interesse que não serve pra segmentar nada.
 */

export type Interesse = {
  /** Chave gravada no banco. NUNCA mude uma existente — quebra perfil salvo. */
  id: string;
  rotulo: string;
  tipo: "pratica" | "estilo";
  /** Só em `pratica`: casa com a `modalidade` das comunidades. */
  modalidade?: string;
};

export const INTERESSES: Interesse[] = [
  // ── Pratica ───────────────────────────────────────────────────────────
  { id: "corrida", rotulo: "Corrida", tipo: "pratica", modalidade: "corrida" },
  { id: "caminhada", rotulo: "Caminhada", tipo: "pratica", modalidade: "caminhada" },
  { id: "trail", rotulo: "Trilha / trail", tipo: "pratica", modalidade: "trail" },
  { id: "pedal", rotulo: "Pedal", tipo: "pratica", modalidade: "pedal" },
  { id: "yoga", rotulo: "Yoga", tipo: "pratica", modalidade: "yoga" },
  { id: "pilates", rotulo: "Pilates", tipo: "pratica", modalidade: "pilates" },
  { id: "funcional", rotulo: "Funcional", tipo: "pratica", modalidade: "funcional" },
  { id: "musculacao", rotulo: "Musculação", tipo: "pratica", modalidade: "musculação" },
  { id: "crossfit", rotulo: "Crossfit", tipo: "pratica", modalidade: "crossfit" },
  { id: "jiu-jitsu", rotulo: "Jiu-jítsu", tipo: "pratica", modalidade: "jiu-jítsu" },
  { id: "muay-thai", rotulo: "Muay thai", tipo: "pratica", modalidade: "muay thai" },
  { id: "boxe", rotulo: "Boxe", tipo: "pratica", modalidade: "boxe" },
  { id: "capoeira", rotulo: "Capoeira", tipo: "pratica", modalidade: "capoeira" },
  { id: "volei-areia", rotulo: "Vôlei de areia", tipo: "pratica", modalidade: "vôlei de areia" },
  { id: "futevolei", rotulo: "Futevôlei", tipo: "pratica", modalidade: "futevôlei" },
  { id: "beach-tennis", rotulo: "Beach tennis", tipo: "pratica", modalidade: "beach tennis" },
  { id: "futebol", rotulo: "Futebol", tipo: "pratica", modalidade: "futebol" },
  { id: "basquete", rotulo: "Basquete", tipo: "pratica", modalidade: "basquete" },
  { id: "natacao", rotulo: "Natação", tipo: "pratica", modalidade: "natação" },
  { id: "escalada", rotulo: "Escalada", tipo: "pratica", modalidade: "escalada" },
  { id: "skate", rotulo: "Skate", tipo: "pratica", modalidade: "skate" },
  { id: "danca", rotulo: "Dança", tipo: "pratica", modalidade: "dança" },

  // ── Estilo ────────────────────────────────────────────────────────────
  { id: "comida-saudavel", rotulo: "Comida saudável", tipo: "estilo" },
  { id: "vegetariano", rotulo: "Vegetariano / vegano", tipo: "estilo" },
  { id: "cafe", rotulo: "Café depois do treino", tipo: "estilo" },
  { id: "cerveja", rotulo: "Cerveja depois do jogo", tipo: "estilo" },
  { id: "madrugador", rotulo: "Time 5h da manhã", tipo: "estilo" },
  { id: "noturno", rotulo: "Time treino à noite", tipo: "estilo" },
  { id: "ao-ar-livre", rotulo: "Só ao ar livre", tipo: "estilo" },
  { id: "musica-ao-vivo", rotulo: "Música ao vivo", tipo: "estilo" },
  { id: "cultura", rotulo: "Cultura e arte", tipo: "estilo" },
  { id: "viagem", rotulo: "Viajar pra competir", tipo: "estilo" },
  { id: "competicao", rotulo: "Gosto de competir", tipo: "estilo" },
  { id: "sem-competicao", rotulo: "Zero competição", tipo: "estilo" },
  { id: "pet", rotulo: "Levo meu cachorro", tipo: "estilo" },
  { id: "crianca", rotulo: "Vou com criança", tipo: "estilo" },
  { id: "iniciante", rotulo: "Começando agora", tipo: "estilo" },
];

const PORid = new Map(INTERESSES.map((i) => [i.id, i]));

export function interessePorId(id: string): Interesse | undefined {
  return PORid.get(id);
}

/** Descarta id que não existe mais no catálogo — perfil antigo não quebra. */
export function sanitizarInteresses(ids: string[]): string[] {
  return [...new Set(ids)].filter((id) => PORid.has(id));
}

/** Cor da tag: a de prática herda o acento da modalidade; estilo é neutro. */
export function acentoDoInteresse(interesse: Interesse): Acento | null {
  return interesse.tipo === "pratica"
    ? acentoDaModalidade(interesse.modalidade)
    : null;
}

export const INTERESSES_PRATICA = INTERESSES.filter((i) => i.tipo === "pratica");
export const INTERESSES_ESTILO = INTERESSES.filter((i) => i.tipo === "estilo");
