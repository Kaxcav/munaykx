import { prisma } from "@/lib/db";
import { dispararEmail } from "@/lib/emails-rsvp";
import { emailVesperaEvento } from "@/lib/emails-vespera";
import { lerGuia } from "@/lib/guia";

/**
 * LEMBRETE DE VÉSPERA ("O que esperar") — o batch, chamado pelo cron diário.
 *
 * Acha os eventos de AMANHÃ com inscritos CONFIRMADOS que ainda não foram
 * avisados e manda o e-mail "o que esperar". Ataca o abandono (confirmou e não
 * vai): quem sabe o que levar, como chegar e o nível, chega mais.
 *
 * ── IDEMPOTÊNCIA ATÔMICA (mesma técnica do aviso de evento novo) ─────────
 *
 * O gate é um `updateMany` condicional em `avisadoVesperaEm`: só envia quem
 * "ganha" a reivindicação. Rodar o cron duas vezes no mesmo dia — ou dois
 * processos em corrida — manda UM e-mail por inscrito, nunca dois.
 *
 * ── OPT-OUT RESPEITADO ──────────────────────────────────────────────────
 *
 * Quem segue a comunidade e desligou os avisos (`Membership.avisarEventos =
 * false`) não recebe. Inscrito sem conta/sem seguir não tem esse sinal e
 * recebe — é lembrete transacional de um evento que a própria pessoa confirmou.
 *
 * ── GROUNDED + FAIL-SAFE ────────────────────────────────────────────────
 *
 * Só evento que o público veria (ativo, não cancelado, comunidade aprovada e
 * ativa). O e-mail usa dado real; guia se existir, senão versão genérica. Envio
 * é fire-and-forget (`dispararEmail` engole erro) — um e-mail que falha não
 * derruba o lote.
 */

/** 00:00 de Brasília (UTC−3 = 03:00 UTC) do dia de `agora`. */
function inicioDoDiaBrasilia(agora: Date): Date {
  const d = new Date(agora);
  d.setUTCHours(3, 0, 0, 0);
  if (agora.getTime() < d.getTime()) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/** Janela [início, fim) do DIA DE AMANHÃ em Brasília. */
export function janelaDeAmanha(agora: Date): { inicio: Date; fim: Date } {
  const hoje0 = inicioDoDiaBrasilia(agora);
  const inicio = new Date(hoje0);
  inicio.setUTCDate(inicio.getUTCDate() + 1);
  const fim = new Date(hoje0);
  fim.setUTCDate(fim.getUTCDate() + 2);
  return { inicio, fim };
}

export type ResultadoVespera = { avisados: number; candidatos: number };

/**
 * Roda o lote da véspera. `agora` injetável pro teste fixar o "amanhã".
 */
export async function avisarVespera(agora: Date = new Date()): Promise<ResultadoVespera> {
  const { inicio, fim } = janelaDeAmanha(agora);

  const candidatos = await prisma.rsvp.findMany({
    where: {
      status: "confirmado",
      canceledAt: null,
      avisadoVesperaEm: null,
      event: {
        ativo: true,
        canceladoEm: null,
        startsAt: { gte: inicio, lt: fim },
        community: { statusPublicacao: "aprovada", ativo: true },
      },
    },
    select: {
      id: true,
      email: true,
      token: true,
      userId: true,
      event: {
        select: {
          titulo: true,
          slug: true,
          startsAt: true,
          local: true,
          modoRota: true,
          origem: true,
          destino: true,
          percursoObs: true,
          communityId: true,
          community: {
            select: { nome: true, nivel: true, acolheIniciante: true, guiaIniciante: true },
          },
        },
      },
    },
  });

  // Opt-out: quem segue a comunidade com avisos DESLIGADOS. Pré-busca em lote e
  // vira um Set (userId|communityId) — sem N consultas dentro do laço.
  const comConta = candidatos.filter((c) => c.userId);
  const optOut = new Set<string>();
  if (comConta.length > 0) {
    const desligados = await prisma.membership.findMany({
      where: {
        avisarEventos: false,
        userId: { in: comConta.map((c) => c.userId as string) },
        communityId: { in: comConta.map((c) => c.event.communityId) },
      },
      select: { userId: true, communityId: true },
    });
    for (const m of desligados) optOut.add(`${m.userId}|${m.communityId}`);
  }

  let avisados = 0;
  for (const c of candidatos) {
    if (c.userId && optOut.has(`${c.userId}|${c.event.communityId}`)) continue;

    // GATE ATÔMICO: só marca (e envia) se ainda estava null.
    const claim = await prisma.rsvp.updateMany({
      where: { id: c.id, avisadoVesperaEm: null },
      data: { avisadoVesperaEm: agora },
    });
    if (claim.count !== 1) continue; // já avisado (ou corrida perdida)

    const ev = c.event;
    dispararEmail(
      emailVesperaEvento({
        para: c.email,
        evento: { titulo: ev.titulo, slug: ev.slug, startsAt: ev.startsAt },
        comunidade: ev.community.nome,
        local: ev.local,
        modoRota: ev.modoRota,
        origem: ev.origem,
        destino: ev.destino,
        percursoObs: ev.percursoObs,
        nivel: ev.community.nivel,
        acolheIniciante: ev.community.acolheIniciante,
        guia: lerGuia(ev.community.guiaIniciante),
        tokenGestao: c.token,
      }),
    );
    avisados++;
  }

  return { avisados, candidatos: candidatos.length };
}
