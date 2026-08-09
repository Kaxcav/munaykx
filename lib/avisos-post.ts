import { prisma } from "@/lib/db";
import { dispararEmail } from "@/lib/emails-rsvp";
import { emailAvisoNovo } from "@/lib/emails-post";
import { assinar, verificar } from "@/lib/assinatura";

/**
 * AVISO POR E-MAIL DE POST NOVO (STORY-010, tarefa 7).
 *
 * Duas coisas separam este disparo do de evento (`lib/avisos-evento.ts`):
 *
 *  1. É **opt-in** — só recebe quem ligou `avisarPosts` (que nasce `false`).
 *     Aviso de evento é o motivo de seguir; aviso de post é mais frequente e
 *     mais miúdo, e ninguém pediu.
 *  2. O teto tem **cota própria** (`ultimoAvisoPostEm`): post não consome a
 *     cota de evento nem vice-versa. Um teto compartilhado faria um aviso de
 *     treino cancelado sumir porque a comunidade criou um evento de manhã.
 *
 * O gate do teto é o mesmo padrão provado na 008: `updateMany` condicional,
 * atômico. Cinco avisos no mesmo dia geram UM e-mail por pessoa, mesmo em
 * corrida entre dois `post.create`.
 */

const PROP_DESCADASTRO_POST = "descadastro-post";

export function tokenDescadastroPost(userId: string, communityId: string): string {
  return assinar({ p: PROP_DESCADASTRO_POST, u: userId, c: communityId });
}

export function lerTokenDescadastroPost(
  token: string,
): { userId: string; communityId: string } | null {
  const d = verificar(token);
  if (!d || d.p !== PROP_DESCADASTRO_POST || !d.u || !d.c) return null;
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
 * Avisa quem ligou o aviso de posts daquela comunidade. Só dispara de post que
 * o público veria: não oculto, comunidade aprovada e ativa. Devolve quantos
 * e-mails saíram.
 */
export async function avisarSeguidoresDePostNovo(postId: string): Promise<number> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      corpo: true,
      ocultoEm: true,
      community: {
        select: { id: true, nome: true, slug: true, statusPublicacao: true, ativo: true },
      },
    },
  });
  if (!post) return 0;
  if (
    post.ocultoEm ||
    post.community.statusPublicacao !== "aprovada" ||
    !post.community.ativo
  ) {
    return 0;
  }

  const agora = new Date();
  const inicioDia = inicioDoDiaBrasilia(agora);

  const inscritos = await prisma.membership.findMany({
    where: { communityId: post.community.id, avisarPosts: true },
    select: { id: true, userId: true, user: { select: { email: true } } },
  });

  let enviados = 0;
  for (const s of inscritos) {
    // GATE ATÔMICO do teto (1/comunidade/dia/pessoa, cota própria de post).
    const claim = await prisma.membership.updateMany({
      where: {
        id: s.id,
        avisarPosts: true,
        OR: [{ ultimoAvisoPostEm: null }, { ultimoAvisoPostEm: { lt: inicioDia } }],
      },
      data: { ultimoAvisoPostEm: agora },
    });
    if (claim.count !== 1) continue; // já avisado hoje (ou corrida perdida)

    dispararEmail(
      emailAvisoNovo({
        para: s.user.email,
        comunidade: { nome: post.community.nome, slug: post.community.slug },
        corpo: post.corpo,
        tokenDescadastro: tokenDescadastroPost(s.userId, post.community.id),
      }),
    );
    enviados++;
  }
  return enviados;
}

/** Gancho pós-commit da publicação: fire-and-forget, nunca lança. */
export function dispararAvisosDePostNovo(postId: string): void {
  void avisarSeguidoresDePostNovo(postId).catch((e) =>
    console.error(
      "[avisos-post] falha ao avisar seguidores:",
      e instanceof Error ? e.message : e,
    ),
  );
}
