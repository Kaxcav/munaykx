import { prisma } from "@/lib/db";
import { eventoDoUsuario } from "@/lib/organizacao";

/**
 * RELATÓRIO PÓS-EVENTO (interno, AGREGADO) — o que o organizador vê depois que
 * o encontro aconteceu: presença, perfil do público em NÚMEROS e comparação com
 * o evento anterior da mesma comunidade. Serve pra renovar parceria e virar
 * evidência de edital.
 *
 * LGPD, o mesmo espírito do resto do painel:
 *  - **Owner-scoped**: o `userId` vem da sessão no servidor e passa por
 *    `eventoDoUsuario` (a camada congelada de `lib/organizacao.ts`). Evento que
 *    não é da pessoa devolve `null` → a página vira **404, nunca 403**.
 *  - **Agregado, nunca pessoa a pessoa**: o retorno só tem CONTAGENS. Nenhum
 *    nome, e-mail ou WhatsApp sai daqui — a camada social é congelada, e o CSV
 *    por evento (esse sim nominal, finalidade declarada) continua sendo o único
 *    lugar com identidade.
 *  - **Grounded**: toda métrica sai de dado REAL que já existe — check-in
 *    (`checkinEm`), status do RSVP e histórico de inscrição na comunidade.
 *    Nada de métrica que não dá pra calcular.
 */

/** A forma mínima de RSVP que as métricas de presença precisam. */
export type RsvpParaMetrica = {
  status: "confirmado" | "lista_espera";
  canceledAt: Date | null;
  checkinEm: Date | null;
};

export type MetricasEvento = {
  /** Confirmados ativos (status confirmado e não cancelado). */
  confirmados: number;
  /** Presentes: confirmados ativos com check-in marcado. */
  presentes: number;
  /** Faltas: confirmados ativos SEM check-in. */
  faltas: number;
  /** Presentes / confirmados. `null` quando não houve confirmado. */
  taxaComparecimento: number | null;
  /** Em lista de espera (ativos). */
  fila: number;
  /** Inscrições canceladas. */
  cancelados: number;
  /** Capacidade do evento (pode não ter sido definida). */
  capacidade: number | null;
  /** Confirmados / capacidade. `null` quando não há capacidade. */
  lotacao: number | null;
  /** Houve ao menos um check-in? Sem isto, presença/faltas não têm leitura. */
  houveCheckin: boolean;
};

/**
 * Métricas de presença a partir da lista de RSVPs — PURA (sem banco), pra
 * testar cada caso de borda sem servidor.
 */
export function metricasDeRsvps(
  rsvps: RsvpParaMetrica[],
  capacidade: number | null,
): MetricasEvento {
  const ativosConfirmados = rsvps.filter(
    (r) => r.status === "confirmado" && r.canceledAt === null,
  );
  const confirmados = ativosConfirmados.length;
  const presentes = ativosConfirmados.filter((r) => r.checkinEm !== null).length;
  const fila = rsvps.filter(
    (r) => r.status === "lista_espera" && r.canceledAt === null,
  ).length;
  const cancelados = rsvps.filter((r) => r.canceledAt !== null).length;
  const houveCheckin = rsvps.some((r) => r.checkinEm !== null);

  return {
    confirmados,
    presentes,
    faltas: confirmados - presentes,
    taxaComparecimento: confirmados > 0 ? presentes / confirmados : null,
    fila,
    cancelados,
    capacidade,
    lotacao: capacidade && capacidade > 0 ? confirmados / capacidade : null,
    houveCheckin,
  };
}

/** Normaliza e-mail pra comparação de "já veio antes" (case-insensitive). */
const normEmail = (e: string) => e.trim().toLowerCase();

/**
 * Classifica o público confirmado entre quem é de PRIMEIRA VEZ na comunidade e
 * quem está VOLTANDO — PURA. `veteranos` é o conjunto de e-mails que já se
 * inscreveram em algum evento ANTERIOR da comunidade. Agregado: recebe e-mails
 * só pra contar, devolve dois números.
 */
export function classificarPublico(
  emailsConfirmados: string[],
  veteranos: Set<string>,
): { novos: number; retornantes: number } {
  let novos = 0;
  for (const email of emailsConfirmados) {
    if (!veteranos.has(normEmail(email))) novos += 1;
  }
  return { novos, retornantes: emailsConfirmados.length - novos };
}

export type RelatorioPosEvento = {
  evento: {
    id: string;
    titulo: string;
    slug: string;
    startsAt: Date;
    canceladoEm: Date | null;
    comunidadeNome: string;
    comunidadeSlug: string;
  };
  /** O evento já aconteceu? Antes disso o relatório é preliminar. */
  passado: boolean;
  metricas: MetricasEvento;
  publico: {
    /** Confirmados ativos que nunca tinham se inscrito na comunidade. */
    novos: number;
    /** Confirmados ativos que já tinham vindo antes. */
    retornantes: number;
    /** Seguidores da comunidade (contexto — quantos podem ser chamados). */
    seguidores: number;
  };
  /** Evento anterior da MESMA comunidade, pra comparação. `null` se é o 1º. */
  anterior: {
    titulo: string;
    startsAt: Date;
    metricas: MetricasEvento;
  } | null;
};

const SELECT_RSVP_METRICA = {
  status: true,
  canceledAt: true,
  checkinEm: true,
} as const;

/**
 * Monta o relatório de um evento da pessoa. `null` quando o evento não é dela
 * (ou não existe) — a página chama `notFound()`.
 *
 * A ordem importa (mesmo princípio de `inscritosDoEvento`): confirma o dono
 * ANTES de tocar em qualquer RSVP.
 */
export async function relatorioPosEvento(
  userId: string,
  eventId: string,
  agora: Date = new Date(),
): Promise<RelatorioPosEvento | null> {
  const evento = await eventoDoUsuario(userId, eventId);
  if (!evento) return null;

  const comunidadeId = evento.community.id;

  // RSVPs deste evento — já escopado ao dono (eventId confirmado como dele).
  const rsvps = await prisma.rsvp.findMany({
    where: { eventId: evento.id },
    select: { ...SELECT_RSVP_METRICA, email: true },
  });

  const metricas = metricasDeRsvps(rsvps, evento.capacidade);

  // Veteranos: e-mails que se inscreveram em algum evento ANTERIOR da comunidade
  // (startsAt < o deste). Só e-mail, só pra contar — nada individual sai daqui.
  const anterioresRows = await prisma.rsvp.findMany({
    where: {
      event: { communityId: comunidadeId, startsAt: { lt: evento.startsAt } },
    },
    select: { email: true },
  });
  const veteranos = new Set(anterioresRows.map((r) => normEmail(r.email)));

  const emailsConfirmados = rsvps
    .filter((r) => r.status === "confirmado" && r.canceledAt === null)
    .map((r) => r.email);
  const { novos, retornantes } = classificarPublico(emailsConfirmados, veteranos);

  const seguidores = await prisma.membership.count({ where: { communityId: comunidadeId } });

  // Evento anterior da comunidade (o mais recente antes deste, não cancelado).
  const anteriorEvento = await prisma.event.findFirst({
    where: {
      communityId: comunidadeId,
      canceladoEm: null,
      startsAt: { lt: evento.startsAt },
      id: { not: evento.id },
    },
    orderBy: { startsAt: "desc" },
    select: { titulo: true, startsAt: true, capacidade: true, id: true },
  });

  let anterior: RelatorioPosEvento["anterior"] = null;
  if (anteriorEvento) {
    const rsvpsAnt = await prisma.rsvp.findMany({
      where: { eventId: anteriorEvento.id },
      select: SELECT_RSVP_METRICA,
    });
    anterior = {
      titulo: anteriorEvento.titulo,
      startsAt: anteriorEvento.startsAt,
      metricas: metricasDeRsvps(rsvpsAnt, anteriorEvento.capacidade),
    };
  }

  return {
    evento: {
      id: evento.id,
      titulo: evento.titulo,
      slug: evento.slug,
      startsAt: evento.startsAt,
      canceladoEm: evento.canceladoEm,
      comunidadeNome: evento.community.nome,
      comunidadeSlug: evento.community.slug,
    },
    passado: evento.startsAt.getTime() < agora.getTime(),
    metricas,
    publico: { novos, retornantes, seguidores },
    anterior,
  };
}
