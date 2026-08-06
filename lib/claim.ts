import { prisma } from "@/lib/db";

/**
 * Reivindicação de RSVPs por e-mail (STORY-007, tarefa 4).
 *
 * Quem se inscreveu em evento ANTES de ter conta deixou o rastro só no
 * `Rsvp.email`. Quando a pessoa prova o e-mail (magic link), as inscrições
 * passam a ser dela.
 *
 * Roda em dois momentos, de propósito:
 *  - ao CRIAR a conta   → pega o histórico anterior ao cadastro
 *  - ao CRIAR a sessão  → pega inscrições feitas anonimamente DEPOIS do
 *                         cadastro (a pessoa não estava logada na hora)
 *
 * Idempotente: só toca em linhas com `userId` nulo. Rodar mil vezes dá o
 * mesmo resultado de rodar uma.
 */
export async function reivindicarRsvps(
  userId: string,
  email: string,
): Promise<number> {
  const alvo = email.trim().toLowerCase();
  if (!alvo) return 0;

  const { count } = await prisma.rsvp.updateMany({
    where: { email: alvo, userId: null },
    data: { userId },
  });

  if (count > 0) {
    console.info(`[claim] ${count} inscrição(ões) vinculada(s) ao usuário ${userId}.`);
  }
  return count;
}
