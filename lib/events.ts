import { prisma } from "@/lib/db";
import type { Community, Event } from "@prisma/client";
import { PUBLICO } from "@/lib/communities";

/**
 * Evento só é público se a COMUNIDADE dele for. Sem isto, uma comunidade
 * `pendente` fica invisível mas os eventos dela aparecem no site e no
 * sitemap — o portão de aprovação com um buraco do lado.
 *
 * `canceladoEm` entra junto nas listagens: evento cancelado sai da descoberta
 * sem a linha ser apagada, porque tem gente inscrita e o histórico dela vale.
 */
const EVENTO_PUBLICO = { community: PUBLICO } as const;

export type EventComCommunity = Event & { community: Community };

/** Próximos eventos ativos de uma comunidade, do mais próximo pro mais distante. */
export function getUpcomingEventsByCommunity(
  communityId: string,
): Promise<Event[]> {
  return prisma.event.findMany({
    where: {
      communityId,
      ativo: true,
      canceladoEm: null,
      startsAt: { gte: new Date() },
      ...EVENTO_PUBLICO,
    },
    orderBy: { startsAt: "asc" },
  });
}

/** Todos os próximos eventos ativos — alimenta o sitemap. */
export function getUpcomingEvents(): Promise<Event[]> {
  return prisma.event.findMany({
    where: {
      ativo: true,
      canceladoEm: null,
      startsAt: { gte: new Date() },
      ...EVENTO_PUBLICO,
    },
    orderBy: { startsAt: "asc" },
  });
}

export function getEventBySlug(
  slug: string,
): Promise<EventComCommunity | null> {
  return prisma.event.findFirst({
    // Cancelado NÃO some daqui de propósito: quem tem o link precisa chegar
    // numa página que explica, não num 404. Some das listagens, não da URL.
    where: { slug, ativo: true, ...EVENTO_PUBLICO },
    include: { community: true },
  });
}

/** Confirmados no evento — pra mostrar vagas restantes quando há capacidade.
 *  Cancelados (canceledAt) não ocupam vaga (STORY-003). */
export function countConfirmados(eventId: string): Promise<number> {
  return prisma.rsvp.count({
    where: { eventId, status: "confirmado", canceledAt: null },
  });
}

/** Ex.: "sáb., 15 de ago., 19h00" — sempre no fuso de Brasília. */
export function formatarDataEvento(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}
