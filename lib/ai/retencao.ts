import { prisma } from "@/lib/db";

/**
 * RETENÇÃO DO TEXTO DAS BUSCAS — 12 MESES.
 *
 * Aprovado pelo dono em 09/08/2026, junto com a autorização de registrar as
 * buscas (`lib/ai/registro.ts`).
 *
 * ── O QUE SOME E O QUE FICA ─────────────────────────────────────────────
 *
 * Some **só o `texto`**, que é o único campo sensível: gente escreve desabafo
 * em campo de busca, e um desabafo de treze meses atrás não serve pra decidir
 * nada e continua identificando alguém pra quem o ler.
 *
 * Fica **a linha inteira** — dia, modalidade, região, `teveResultado`. Nada
 * disso identifica ninguém, e é justamente o que responde "o que Brasília
 * pediu e a MUNAY não tinha" ao longo do tempo. Apagar a linha jogaria fora a
 * série histórica pra remover um risco que já foi removido com o texto.
 *
 * Anular em vez de deletar também mantém as contagens do /admin estáveis: o
 * número de buscas de 2026 não muda quando 2027 chegar.
 *
 * ── IDEMPOTENTE ────────────────────────────────────────────────────────
 *
 * Roda quantas vezes quiser. O `where` exige `texto: { not: null }`, então a
 * segunda passagem no mesmo dia não toca em nada e devolve 0 — o que também
 * torna seguro um cron que dispara duas vezes por retentativa.
 */

/** O prazo. Documentado aqui porque é onde alguém vai procurar. */
export const MESES_DE_RETENCAO = 12;

/** A data de corte: tudo com `dia` ANTERIOR a isto perde o texto. */
export function dataDeCorte(agora: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
  );
  d.setUTCMonth(d.getUTCMonth() - MESES_DE_RETENCAO);
  return d;
}

export type ResultadoPurga = {
  /** Quantas linhas perderam o texto nesta passagem. */
  purgados: number;
  corte: string;
};

/**
 * Apaga o texto das buscas antigas. Nunca apaga a linha.
 *
 * Devolve quantas foram — 0 é o resultado normal quando já rodou hoje, e não
 * é erro.
 */
export async function purgarTextosAntigos(
  agora: Date = new Date(),
): Promise<ResultadoPurga> {
  const corte = dataDeCorte(agora);

  const r = await prisma.buscaRegistro.updateMany({
    where: { dia: { lt: corte }, texto: { not: null } },
    data: { texto: null },
  });

  return { purgados: r.count, corte: corte.toISOString().slice(0, 10) };
}
