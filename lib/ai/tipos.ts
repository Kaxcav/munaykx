/**
 * SUBSTRATO DE IA DA MUNAY — tipos comuns.
 *
 * Toda feature de IA do projeto passa por aqui. O que este arquivo define é o
 * CONTRATO, e ele foi desenhado a partir das três regras que a busca por
 * descrição (`lib/ia.ts`) já provou valerem a pena — elas não são preferência,
 * são cicatriz:
 *
 * 1. **O modelo escolhe DENTRO do que existe, nunca inventa.** Quem chama
 *    sempre valida a saída contra o banco de novo. Sem isso, a busca filtraria
 *    por "Crossfit" num banco que só tem "Funcional" e devolveria vazio com
 *    cara de site quebrado.
 * 2. **Endpoint público que chama API paga é vetor de esvaziar carteira.**
 *    Teto por IP, teto global diário, limite de entrada e cache — por FEATURE,
 *    nunca compartilhado (ver `lib/ai/tetos.ts`).
 * 3. **Falha nunca vira erro na cara da pessoa.** Sem chave, API fora, timeout
 *    ou JSON quebrado → `null`, e o chamador cai no caminho normal.
 */

/** O que uma chamada de IA devolve. `null` = não deu pra confiar; caia no fallback. */
export type ResultadoIa<T> = T | null;

export type PedidoIa = {
  /** Instruções do sistema — o enquadramento e as listas do banco. */
  sistema: string;
  /** O texto da pessoa. Já truncado por quem chama. */
  usuario: string;
  /** Teto de tokens da resposta. Pequeno de propósito: saída é sempre JSON curto. */
  maxTokens: number;
  /**
   * IMAGEM opcional (visão) — para o fluxo flyer→evento. Quando presente, o
   * modelo recebe a imagem + o texto de `usuario` (a instrução do que extrair).
   * ADITIVO: sem `imagem`, o comportamento é byte a byte o de texto de sempre.
   * `dados` é base64 puro (sem o prefixo `data:`), `mediaType` é o MIME
   * (`image/png`, `image/jpeg`, `image/webp`, `image/gif`).
   */
  imagem?: { dados: string; mediaType: string };
  /** Timeout desta chamada em ms. Default do adapter (8s) quando ausente — a
   *  visão pede mais folga que a busca de texto, então o flyer passa um maior. */
  timeoutMs?: number;
};

/**
 * FORNECEDOR DE MODELO — a abstração que permite trocar de provedor sem tocar
 * em nenhuma feature.
 *
 * Devolve TEXTO CRU, de propósito. Quem valida é a feature, contra o banco: se
 * o fornecedor devolvesse algo já parseado, a validação viraria responsabilidade
 * dele e a regra 1 se dissolveria em duas camadas.
 *
 * `null` cobre todos os modos de falha (sem chave, HTTP != 2xx, timeout, corpo
 * inesperado). O chamador não distingue — e não deve: a resposta a qualquer um
 * deles é a mesma, cair no caminho sem IA.
 */
export type Fornecedor = {
  /** Nome curto pro diagnóstico do /admin. Ex.: "anthropic". */
  readonly nome: string;
  /** Modelo em uso, pro diagnóstico. */
  readonly modelo: string;
  /** `false` quando falta credencial — a feature nem tenta chamar. */
  disponivel(): boolean;
  gerar(pedido: PedidoIa): Promise<ResultadoIa<string>>;
};

/** Diagnóstico exibido no /admin — mesma ideia do `statusEmail()`. */
export type StatusIa = {
  ligada: boolean;
  fornecedor: string;
  modelo: string;
  usosHoje: number;
  tetoDia: number;
};
