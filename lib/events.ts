import { prisma } from "@/lib/db";
import type { Community, Event } from "@prisma/client";

export type EventComCommunity = Event & { community: Community };

/** Próximos eventos ativos de uma comunidade, do mais próximo pro mais distante. */
export function getUpcomingEventsByCommunity(
  communityId: string,
): Promise<Event[]> {
  return prisma.event.findMany({
    where: { communityId, ativo: true, startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
  });
}

/** Todos os próximos eventos ativos — alimenta o sitemap. */
export function getUpcomingEvents(): Promise<Event[]> {
  return prisma.event.findMany({
    where: { ativo: true, startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
  });
}

export function getEventBySlug(
  slug: string,
): Promise<EventComCommunity | null> {
  return prisma.event.findFirst({
    where: { slug, ativo: true },
    include: { community: true },
  });
}

/** Confirmados no evento — pra mostrar vagas restantes quando há capacidade. */
export function countConfirmados(eventId: string): Promise<number> {
  return prisma.rsvp.count({
    where: { eventId, status: "confirmado" },
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
