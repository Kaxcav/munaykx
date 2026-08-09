import { criarFornecedorAnthropic } from "@/lib/ai/anthropic";
import type { Fornecedor } from "@/lib/ai/tipos";

/**
 * PONTO DE ENTRADA DO SUBSTRATO DE IA.
 *
 * Toda feature pede o fornecedor daqui e nunca importa `lib/ai/anthropic.ts`
 * direto. É essa indireção que torna a troca de provedor um arquivo só.
 *
 * ── Sobre o fallback OpenAI ─────────────────────────────────────────────
 *
 * A interface `Fornecedor` já comporta um segundo provedor: `disponivel()` diz
 * se ele pode atender, e `gerar()` devolve `null` em qualquer falha — que é
 * exatamente o gancho onde um encadeamento entraria (tenta o primeiro, cai no
 * segundo). Ele **NÃO está ligado**, e isso é deliberado: um segundo provedor
 * é decisão do dono (credencial nova, custo novo, e a política de qual dado sai
 * para qual empresa é escolha de produto, não de código). Quando for decidido,
 * o encadeamento nasce aqui, e nenhuma feature muda.
 *
 * O que existe hoje é um só, e o código diz isso em vez de fingir uma cadeia
 * que não existe.
 */

let cache: Fornecedor | null = null;

/**
 * O fornecedor em uso. Memoizado por processo, mas lê a env a cada criação —
 * então trocar `ANTHROPIC_MODEL` no Railway e reiniciar vale, sem rebuild.
 */
export function fornecedor(): Fornecedor {
  if (!cache) cache = criarFornecedorAnthropic();
  return cache;
}

/** Só para teste: força a releitura das envs. Não usar em produção. */
export function esquecerFornecedor(): void {
  cache = null;
}

/** A IA está ligada? Uma pergunta, uma resposta — o resto do site só quer isto. */
export function iaDisponivel(): boolean {
  return fornecedor().disponivel();
}

export { Balde, statusDe, normalizar } from "@/lib/ai/tetos";
export type { ConfigTeto, Permissao } from "@/lib/ai/tetos";
export type { Fornecedor, PedidoIa, ResultadoIa, StatusIa } from "@/lib/ai/tipos";
