import { prisma } from "@/lib/db";
import { dispararEmail } from "@/lib/emails-rsvp";
import { emailEventoNovo } from "@/lib/emails-pertencimento";
import { assinar, verificar } from "@/lib/assinatura";

/**
 * AVISO DE EVENTO NOVO aos seguidores (STORY-008, tarefas 6 e 7).
 *
 * Teto **1/comunidade/dia por pessoa**: o gate é um `updateMany` atômico sobre
 * `ultimoAvisoEm`. Só recebe quem "ganha" a reivindicação do dia — então dois
 * eventos no mesmo dia (mesmo em corrida entre dois `event.create`) geram UM
 * e-mail por seguidor, não dois. É o que a spec exige: "cadastrar 5 eventos
 * dispara 1, não 5".
 */

const PROP_DESCADASTRO = "descadastro-aviso";

export function tokenDescadastro(userId: string, communityId: string): string {
  return assinar({ p: PROP_DESCADASTRO, u: userId, c: communityId });
}

export function lerTokenDescadastro(
  token: string,
): { userId: string; communityId: string } | null {
  const d = verificar(token);
  if (!d || d.p !== PROP_DESCADASTRO || !d.u || !d.c) return null;
  return { userId: d.u, communityId: d.c };
}

/** Meia-noite de Brasília (UTC−3 = 03:00 UTC) do dia de `agora`. */
function inicioDoDiaBrasilia(agora: Date): Date {
  const d = new Date(agora);
  d.setUTCHours(3, 0, 0, 0);
  if (agora.getTime() < d.getTime()) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/**
 * Avisa os seguidores (`avisarEventos = true`) de um evento novo. Só dispara de
 * evento que o público veria (ativo, não cancelado, futuro, comunidade aprovada
 * e ativa) — rascunho/pendente não gera e-mail. Devolve quantos e-mails saíram.
 */
export async function avisarSeguidoresDeEventoNovo(
  eventId: string,
): Promise<number> {
  const evento = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      titulo: true,
      slug: true,
      startsAt: true,
      ativo: true,
      canceladoEm: true,
      community: {
        select: {
          id: true,
          nome: true,
          statusPublicacao: true,
          ativo: true,
        },
      },
    },
  });
  if (!evento) return 0;

  const agora = new Date();
  if (
    !evento.ativo ||
    evento.canceladoEm ||
    evento.startsAt.getTime() < agora.getTime() ||
    evento.community.statusPublicacao !== "aprovada" ||
    !evento.community.ativo
  ) {
    return 0;
  }

  const inicioDia = inicioDoDiaBrasilia(agora);
  const seguidores = await prisma.membership.findMany({
    where: { communityId: evento.community.id, avisarEventos: true },
    select: { id: true, userId: true, user: { select: { email: true } } },
  });

  let enviados = 0;
  for (const s of seguidores) {
    // GATE ATÔMICO do teto: só marca (e envia) se não foi avisado hoje.
    const claim = await prisma.membership.updateMany({
      where: {
        id: s.id,
        avisarEventos: true,
        OR: [{ ultimoAvisoEm: null }, { ultimoAvisoEm: { lt: inicioDia } }],
      },
      data: { ultimoAvisoEm: agora },
    });
    if (claim.count !== 1) continue; // já avisado hoje (ou corrida perdida)

    dispararEmail(
      emailEventoNovo({
        para: s.user.email,
        comunidade: evento.community.nome,
        evento: { titulo: evento.titulo, slug: evento.slug, startsAt: evento.startsAt },
        tokenDescadastro: tokenDescadastro(s.userId, evento.community.id),
      }),
    );
    enviados++;
  }
  return enviados;
}

/** Gancho pós-commit da criação de evento: fire-and-forget, nunca lança. */
export function dispararAvisosDeEventoNovo(eventId: string): void {
  void avisarSeguidoresDeEventoNovo(eventId).catch((e) =>
    console.error(
      "[avisos-evento] falha ao avisar seguidores:",
      e instanceof Error ? e.message : e,
    ),
  );
}
