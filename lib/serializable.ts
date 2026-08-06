import { Prisma } from "@prisma/client";

/**
 * Retry para transações Serializable — padrão extraído da STORY-002
 * (POST /api/rsvps), agora compartilhado (STORY-003).
 *
 * Conflito de serialização é esperado sob concorrência: espera um pouco e
 * tenta de novo. Esgotou as tentativas, o erro sobe pra rota decidir a
 * resposta (ex.: 503 "muita gente ao mesmo tempo").
 */
const MAX_TENTATIVAS = 5;

function backoff(tentativa: number) {
  const ms = tentativa * 30 + Math.random() * 70;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * P2034 é como o engine binário (produção hoje) reporta o conflito.
 * O query compiler/driver adapters reporta o MESMO conflito como
 * "TransactionWriteConflict" — cobrir os dois deixa o retry imune a uma
 * futura troca de engine (e foi observado no ambiente de teste da 003).
 */
export function isSerializationConflict(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return true;
  }
  return error instanceof Error && error.message.includes("TransactionWriteConflict");
}

export async function withSerializableRetry<T>(
  fn: () => Promise<T>,
): Promise<T> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await fn();
    } catch (error) {
      if (isSerializationConflict(error) && tentativa < MAX_TENTATIVAS) {
        await backoff(tentativa);
        continue;
      }
      throw error;
    }
  }
}
