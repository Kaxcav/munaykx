import { prisma } from "@/lib/db";
import { emailLancamento } from "@/lib/emails-lancamento";

/**
 * A FERRAMENTA DE AVISO DE LANÇAMENTO.
 *
 * ── O que ela NÃO faz ──────────────────────────────────────────────────
 *
 * **Não envia sozinha.** Não há cron, não há hook de boot, não há chamada em
 * deploy. O único chamador é a Server Action do `/admin/leads`, atrás de
 * `assertAdmin()`, e existe teste estrutural que fica vermelho se um segundo
 * chamador aparecer. Isso é deliberado: uma base inteira avisada por engano é
 * dano que não se desfaz — não dá para "despublicar" e-mail.
 *
 * ── Quem recebe: só quem PEDIU ────────────────────────────────────────
 *
 * Só `origem: "site"` — quem preencheu o formulário da lista de espera. Quem
 * está na tabela por ter feito RSVP (`origem: "rsvp"`, criado pelo próprio
 * fluxo de inscrição) **não pediu** aviso de lançamento: pediu vaga num
 * evento. São bases diferentes na mesma tabela, e tratar as duas como uma só
 * seria usar um consentimento para uma finalidade que ele não cobre.
 *
 * ── Idempotência: a reserva vem antes do envio ────────────────────────
 *
 * `avisadoLancamentoEm` é gravado num `updateMany` que só pega quem ainda está
 * `null`. O `count` que volta diz quantas linhas EU reservei — e só para essas
 * eu mando. Duas abas do admin clicando junto disputam a mesma linha no banco,
 * e o Postgres resolve: uma leva, a outra recebe zero.
 *
 * Marcar antes tem um custo conhecido: envio que falha depois da reserva não é
 * tentado de novo. É o lado certo de errar. O relatório devolve quantos
 * falharam, e reenviar para uma pessoa é barato; reenviar para a base inteira
 * é o desastre que esta ordem impede.
 *
 * ── Ritmo ─────────────────────────────────────────────────────────────
 *
 * Envio em série com pausa entre um e outro. A Resend limita requisições por
 * segundo, e disparar em paralelo devolveria 429 — que o `sendEmail` engole em
 * silêncio, produzindo exatamente o sintoma que este projeto já conhece: a
 * pessoa não recebe e ninguém fica sabendo.
 */

/** Quantos e-mails saem por clique. Vários cliques esvaziam a fila. */
export const LOTE_MAX = 50;

/** Pausa entre envios, para não bater no limite por segundo do provedor. */
export const INTERVALO_MS = 600;

/** Só a lista de espera. Quem entrou por RSVP não pediu este aviso. */
export const ORIGEM_DA_LISTA = "site";

export type ResumoLancamento = {
  /** Quantos foram reservados neste clique (o teto é `LOTE_MAX`). */
  tentados: number;
  enviados: number;
  falharam: number;
  /** Quantos ainda restam na fila depois deste lote. */
  restantes: number;
};

/** Quantos ainda não receberam o aviso. É o número que a tela mostra. */
export async function pendentesDeAviso(): Promise<number> {
  return prisma.lead.count({
    where: { origem: ORIGEM_DA_LISTA, avisadoLancamentoEm: null },
  });
}

/** Quantos já receberam. Serve para a tela dizer que o trabalho foi feito. */
export async function jaAvisados(): Promise<number> {
  return prisma.lead.count({
    where: { origem: ORIGEM_DA_LISTA, avisadoLancamentoEm: { not: null } },
  });
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Envia um lote do aviso de lançamento.
 *
 * Não recebe destinatário, filtro nem texto: quem decide isso é este arquivo,
 * não quem chama. Uma action que pudesse escolher para quem mandar seria uma
 * action que, com um campo a mais no formulário, manda para qualquer um.
 */
export async function enviarLoteDeLancamento(
  opts: { limite?: number; pausaMs?: number } = {},
): Promise<ResumoLancamento> {
  const limite = Math.max(1, Math.min(opts.limite ?? LOTE_MAX, LOTE_MAX));
  const pausa = opts.pausaMs ?? INTERVALO_MS;

  const candidatos = await prisma.lead.findMany({
    where: { origem: ORIGEM_DA_LISTA, avisadoLancamentoEm: null },
    // Mais antigos primeiro: quem esperou mais é avisado antes.
    orderBy: { createdAt: "asc" },
    take: limite,
    select: { id: true, email: true, nome: true, tipo: true },
  });

  if (candidatos.length === 0) {
    return { tentados: 0, enviados: 0, falharam: 0, restantes: 0 };
  }

  // A RESERVA. `avisadoLancamentoEm: null` no `where` é o que torna isto
  // atômico: se outro clique já pegou estas linhas, elas não voltam aqui.
  const agora = new Date();
  const reserva = await prisma.lead.updateMany({
    where: {
      id: { in: candidatos.map((c) => c.id) },
      avisadoLancamentoEm: null,
    },
    data: { avisadoLancamentoEm: agora },
  });

  // Reservou menos do que achou = outra aba levou parte. Sem jeito de saber
  // QUAIS sobraram para mim, então este lote não manda nada e o próximo clique
  // recomeça limpo. Perder um lote é melhor que mandar dois e-mails iguais.
  if (reserva.count !== candidatos.length) {
    return {
      tentados: 0,
      enviados: 0,
      falharam: 0,
      restantes: await pendentesDeAviso(),
    };
  }

  let enviados = 0;
  let falharam = 0;

  for (const [i, lead] of candidatos.entries()) {
    // `sendEmail` nunca lança (engole erro de propósito), mas o try existe
    // mesmo assim: uma exceção inesperada aqui abortaria o lote no meio, e as
    // linhas restantes já estariam marcadas como avisadas.
    try {
      const r = await emailLancamento({
        para: lead.email,
        nome: lead.nome,
        tipo: lead.tipo,
      });
      if (r.ok) enviados += 1;
      else falharam += 1;
    } catch (error) {
      falharam += 1;
      console.error(
        "[lancamento] falha inesperada ao enviar:",
        error instanceof Error ? error.message : error,
      );
    }
    if (i < candidatos.length - 1 && pausa > 0) await dormir(pausa);
  }

  return {
    tentados: candidatos.length,
    enviados,
    falharam,
    restantes: await pendentesDeAviso(),
  };
}
