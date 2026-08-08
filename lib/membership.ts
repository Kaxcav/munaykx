import { prisma } from "@/lib/db";
import { PUBLICO } from "@/lib/communities";

/**
 * PERTENCIMENTO (STORY-008 · C3) — fonte única do "seguir".
 *
 * Um verbo só: **Seguir**. Auto-serviço, sem aprovação (decisão 2), então
 * `Favorite` não existe — fica só `Membership` (decisão 1). `seguir` usa
 * `upsert` sobre o `@@unique([userId, communityId])`, então é idempotente na
 * aplicação E no banco: clique duplo não cria linha dupla nem reseta a
 * preferência de aviso.
 *
 * A **agenda** é derivada, nunca materializada (decisão 6): é query dos eventos
 * futuros das comunidades seguidas ∪ RSVPs ativos da pessoa.
 */

export async function seguir(userId: string, communityId: string): Promise<void> {
  await prisma.membership.upsert({
    where: { userId_communityId: { userId, communityId } },
    create: { userId, communityId },
    update: {}, // já segue → nada muda (não mexe em avisarEventos)
  });
}

export async function deixarDeSeguir(userId: string, communityId: string): Promise<void> {
  // deleteMany (não delete) pra ser idempotente: deixar de seguir o que já não
  // segue não é erro. Nunca toca em Rsvp — deixar de seguir não desinscreve.
  await prisma.membership.deleteMany({ where: { userId, communityId } });
}

export async function segue(userId: string, communityId: string): Promise<boolean> {
  const m = await prisma.membership.findUnique({
    where: { userId_communityId: { userId, communityId } },
    select: { id: true },
  });
  return m !== null;
}

/** Liga/desliga o aviso de evento novo daquela comunidade. Escopado ao dono. */
export async function definirAviso(
  userId: string,
  communityId: string,
  avisar: boolean,
): Promise<void> {
  await prisma.membership.updateMany({
    where: { userId, communityId },
    data: { avisarEventos: avisar },
  });
}

export type ComunidadeSeguida = {
  membershipId: string;
  avisarEventos: boolean;
  comunidade: { id: string; slug: string; nome: string; modalidade: string; regiao: string };
  proximoEvento: { slug: string; titulo: string; startsAt: Date } | null;
};

/** As comunidades que a pessoa segue, com o próximo evento público de cada. */
export async function comunidadesDeUsuario(userId: string): Promise<ComunidadeSeguida[]> {
  const vinculos = await prisma.membership.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      avisarEventos: true,
      community: {
        select: { id: true, slug: true, nome: true, modalidade: true, regiao: true },
      },
    },
  });

  const comIds = vinculos.map((v) => v.community.id);
  const proximos = comIds.length
    ? await prisma.event.findMany({
        where: {
          communityId: { in: comIds },
          ativo: true,
          canceladoEm: null,
          startsAt: { gte: new Date() },
          community: PUBLICO,
        },
        orderBy: { startsAt: "asc" },
        select: { communityId: true, slug: true, titulo: true, startsAt: true },
      })
    : [];

  const proximoPorCom = new Map<string, { slug: string; titulo: string; startsAt: Date }>();
  for (const e of proximos) {
    if (!proximoPorCom.has(e.communityId)) {
      proximoPorCom.set(e.communityId, { slug: e.slug, titulo: e.titulo, startsAt: e.startsAt });
    }
  }

  return vinculos.map((v) => ({
    membershipId: v.id,
    avisarEventos: v.avisarEventos,
    comunidade: v.community,
    proximoEvento: proximoPorCom.get(v.community.id) ?? null,
  }));
}

/**
 * SUGESTÃO de seguir (STORY-008, tarefa 8): comunidades onde a pessoa já tem
 * RSVP ativo mas **não segue**. É sugestão, nunca vínculo automático — seguir
 * alguém sem pedir destrói confiança. Só comunidades públicas.
 */
export async function sugestoesDeSeguir(
  userId: string,
): Promise<Array<{ id: string; slug: string; nome: string }>> {
  const [rsvps, seguidas] = await Promise.all([
    prisma.rsvp.findMany({
      where: { userId, canceledAt: null },
      select: {
        event: {
          select: {
            community: {
              select: {
                id: true,
                slug: true,
                nome: true,
                statusPublicacao: true,
                ativo: true,
              },
            },
          },
        },
      },
    }),
    prisma.membership.findMany({ where: { userId }, select: { communityId: true } }),
  ]);

  const jaSegue = new Set(seguidas.map((m) => m.communityId));
  const mapa = new Map<string, { id: string; slug: string; nome: string }>();
  for (const r of rsvps) {
    const c = r.event.community;
    if (
      c.statusPublicacao === "aprovada" &&
      c.ativo &&
      !jaSegue.has(c.id) &&
      !mapa.has(c.id)
    ) {
      mapa.set(c.id, { id: c.id, slug: c.slug, nome: c.nome });
    }
  }
  return Array.from(mapa.values());
}

export type ItemAgenda = {
  eventId: string;
  slug: string;
  titulo: string;
  startsAt: Date;
  comunidade: { slug: string; nome: string };
  inscrito: boolean;
};

/**
 * A AGENDA: eventos futuros das comunidades seguidas ∪ RSVPs ativos da pessoa,
 * ordenados por data, marcando quais já têm inscrição. Os dois caminhos entram
 * mesmo sem o outro: evento de comunidade seguida sem RSVP, e RSVP de
 * comunidade não seguida. Derivada por query, sem tabela (decisão 6).
 */
export async function agenda(userId: string): Promise<ItemAgenda[]> {
  const agora = new Date();

  const seguidas = await prisma.membership.findMany({
    where: { userId },
    select: { communityId: true },
  });
  const comIds = seguidas.map((s) => s.communityId);

  const [deSeguidas, rsvps] = await Promise.all([
    comIds.length
      ? prisma.event.findMany({
          where: {
            communityId: { in: comIds },
            ativo: true,
            canceladoEm: null,
            startsAt: { gte: agora },
            community: PUBLICO,
          },
          select: {
            id: true,
            slug: true,
            titulo: true,
            startsAt: true,
            community: { select: { slug: true, nome: true } },
          },
        })
      : Promise.resolve([]),
    prisma.rsvp.findMany({
      where: {
        userId,
        canceledAt: null,
        event: { ativo: true, canceladoEm: null, startsAt: { gte: agora } },
      },
      select: {
        eventId: true,
        event: {
          select: {
            slug: true,
            titulo: true,
            startsAt: true,
            community: { select: { slug: true, nome: true } },
          },
        },
      },
    }),
  ]);

  const inscritos = new Set(rsvps.map((r) => r.eventId));
  const mapa = new Map<string, ItemAgenda>();

  for (const e of deSeguidas) {
    mapa.set(e.id, {
      eventId: e.id,
      slug: e.slug,
      titulo: e.titulo,
      startsAt: e.startsAt,
      comunidade: e.community,
      inscrito: inscritos.has(e.id),
    });
  }
  for (const r of rsvps) {
    if (!mapa.has(r.eventId)) {
      mapa.set(r.eventId, {
        eventId: r.eventId,
        slug: r.event.slug,
        titulo: r.event.titulo,
        startsAt: r.event.startsAt,
        comunidade: r.event.community,
        inscrito: true,
      });
    }
  }

  return Array.from(mapa.values()).sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
}
