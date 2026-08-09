import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { eventAdminSchema, parseDataBrasilia, toCsv } from "@/lib/admin";
import {
  comunidadeDoUsuario,
  comunidadesDoUsuario,
  eventoDoUsuario,
} from "@/lib/organizacao";
import { dispararEmail, emailRsvpCancelado } from "@/lib/emails-rsvp";
import { dispararAvisosDeEventoNovo } from "@/lib/avisos-evento";

/**
 * MUTAÇÕES DO PAINEL DO ORGANIZADOR (STORY-009, frente C).
 *
 * `lib/organizacao.ts` é a camada de LEITURA com o filtro de dono, e é
 * congelada (gargalo). Aqui ficam as ESCRITAS — e cada uma reusa aquela
 * camada pra checar dono antes de tocar em qualquer coisa, em vez de repetir
 * o `where` de organização (que, repetido, diverge em silêncio).
 *
 * Contrato de segurança, o mesmo do resto do painel:
 *  - `userId` SEMPRE vem da sessão lida no servidor (a action passa), NUNCA do
 *    formulário. Estas funções recebem `userId` como primeiro argumento — a
 *    assinatura é a barreira.
 *  - "não é seu" e "não existe" são indistinguíveis: os dois devolvem
 *    `motivo: "nao-dono"`, e a página vira **404, nunca 403** (403 confirmaria
 *    que o recurso existe e deixaria varrer IDs pra mapear o concorrente).
 */

export type ResultadoPainel<T = undefined> =
  | { ok: true; dados: T }
  | { ok: false; motivo: "nao-dono" | "invalido" | "slug-repetido"; erro?: string };

const naoDono = { ok: false, motivo: "nao-dono" } as const;

/** Campos que o organizador mantém na própria comunidade. Nome/slug/modalidade
 *  não entram: mexer neles é operação de admin (muda URL pública e descoberta). */
export const comunidadeEdicaoSchema = z.object({
  descricao: z.string().trim().max(2000),
  horarios: z.string().trim().max(200),
  local: z.string().trim().max(200),
  nivel: z.string().trim().max(80),
  ativo: z.boolean(),
  // Sinal "acolhe iniciante" — opt-in do organizador (default false na coluna).
  // `.default(false)`: campo OPCIONAL na entrada (chamadas antigas que não mandam
  // o campo seguem válidas), mas SEMPRE boolean na saída persistida. O form do
  // painel envia sempre (checkbox → "on"|ausente), então o valor real não se perde.
  acolheIniciante: z.boolean().default(false),
});
export type ComunidadeEdicaoInput = z.infer<typeof comunidadeEdicaoSchema>;

/** Edita a comunidade da pessoa. `null`/`nao-dono` se não for dela. */
export async function editarComunidade(
  userId: string,
  slug: string,
  entrada: unknown,
): Promise<ResultadoPainel> {
  const dono = await comunidadeDoUsuario(userId, slug);
  if (!dono) return naoDono;

  const parsed = comunidadeEdicaoSchema.safeParse(entrada);
  if (!parsed.success) {
    return { ok: false, motivo: "invalido", erro: parsed.error.issues[0]?.message };
  }
  const d = parsed.data;
  await prisma.community.update({
    where: { id: dono.id },
    data: {
      descricao: d.descricao || null,
      horarios: d.horarios || null,
      local: d.local || null,
      nivel: d.nivel || null,
      ativo: d.ativo,
      acolheIniciante: d.acolheIniciante,
    },
  });
  return { ok: true, dados: undefined };
}

/** Cria um evento numa comunidade da pessoa. Reusa `eventAdminSchema` (regra:
 *  não duplicar a validação de evento). Evento de organizador é sempre real
 *  (`demo: false`) — a flag demo é só do conteúdo ilustrativo nosso (regra 3). */
export async function criarEvento(
  userId: string,
  entrada: unknown,
): Promise<ResultadoPainel<{ id: string }>> {
  const parsed = eventAdminSchema.safeParse(entrada);
  if (!parsed.success) {
    return { ok: false, motivo: "invalido", erro: parsed.error.issues[0]?.message };
  }
  const dados = parsed.data;

  // Dono: a comunidade-alvo tem que estar entre as da pessoa. Reusa o filtro
  // de `lib/organizacao.ts` em vez de recriá-lo.
  const minhas = await comunidadesDoUsuario(userId);
  if (!minhas.some((c) => c.id === dados.communityId)) return naoDono;

  const quando = parseDataBrasilia(dados.startsAt);
  if (!quando) return { ok: false, motivo: "invalido", erro: "Data e hora inválidas." };

  try {
    const ev = await prisma.event.create({
      data: {
        communityId: dados.communityId,
        titulo: dados.titulo,
        slug: dados.slug,
        startsAt: quando,
        city: dados.city,
        local: dados.local ?? null,
        capacidade: dados.capacidade,
        gratuito: dados.gratuito,
        demo: false,
        ativo: dados.ativo,
      },
    });
    // Evento novo → avisa os seguidores (pós-commit, fire-and-forget). STORY-008.
    dispararAvisosDeEventoNovo(ev.id);
    return { ok: true, dados: { id: ev.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, motivo: "slug-repetido", erro: "Já existe um evento com esse slug." };
    }
    throw error;
  }
}

/** Edita um evento da pessoa. Não move o evento de comunidade (o `communityId`
 *  do form é ignorado — usa o do evento existente). `nao-dono` se não for dela. */
export async function editarEvento(
  userId: string,
  eventId: string,
  entrada: unknown,
): Promise<ResultadoPainel> {
  const dono = await eventoDoUsuario(userId, eventId);
  if (!dono) return naoDono;

  const parsed = eventAdminSchema.safeParse(entrada);
  if (!parsed.success) {
    return { ok: false, motivo: "invalido", erro: parsed.error.issues[0]?.message };
  }
  const dados = parsed.data;
  const quando = parseDataBrasilia(dados.startsAt);
  if (!quando) return { ok: false, motivo: "invalido", erro: "Data e hora inválidas." };

  try {
    await prisma.event.update({
      where: { id: dono.id },
      data: {
        // communityId NÃO entra: mover evento entre comunidades não é edição.
        titulo: dados.titulo,
        slug: dados.slug,
        startsAt: quando,
        city: dados.city,
        local: dados.local ?? null,
        capacidade: dados.capacidade,
        gratuito: dados.gratuito,
        ativo: dados.ativo,
      },
    });
    return { ok: true, dados: undefined };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, motivo: "slug-repetido", erro: "Já existe um evento com esse slug." };
    }
    throw error;
  }
}

/**
 * Cancela um evento da pessoa. É STATUS (`canceladoEm`), não delete — tem gente
 * inscrita e o histórico dela vale. Avisa os inscritos por e-mail DEPOIS do
 * commit (fora de transação, fire-and-forget) e **NÃO promove a lista de
 * espera** (STORY-009, decisão 7: cancelar não abre vaga pra ninguém).
 * Idempotente: cancelar de novo não re-avisa.
 */
export async function cancelarEvento(
  userId: string,
  eventId: string,
): Promise<ResultadoPainel> {
  const dono = await eventoDoUsuario(userId, eventId);
  if (!dono) return naoDono;
  if (dono.canceladoEm) return { ok: true, dados: undefined }; // já cancelado

  // Quem avisar: inscritos ainda ativos (não cancelados). Lida ANTES do commit,
  // enviado DEPOIS.
  const aviso = await prisma.rsvp.findMany({
    where: { eventId: dono.id, canceledAt: null },
    select: { nome: true, email: true },
  });

  await prisma.event.update({
    where: { id: dono.id },
    data: { canceladoEm: new Date() },
  });

  for (const i of aviso) {
    dispararEmail(
      emailRsvpCancelado({
        para: i.email,
        nome: i.nome,
        evento: {
          titulo: dono.titulo,
          startsAt: dono.startsAt,
          local: dono.local,
          slug: dono.slug,
        },
      }),
    );
  }
  return { ok: true, dados: undefined };
}

type InscritoCsv = {
  nome: string;
  email: string;
  whatsapp: string | null;
  status: string;
  createdAt: Date;
  canceledAt: Date | null;
  checkinEm: Date | null;
};

/**
 * CSV dos inscritos de UM evento (nunca global — STORY-009, decisão 5). Puro,
 * pra dar pra testar sem servidor. Quem chama passa a lista que veio de
 * `inscritosDoEvento` (já escopada ao dono) — a contenção mora lá, não aqui.
 * Leva BOM porque o Excel pt-BR só reconhece UTF-8 com ele.
 */
export function csvDeInscritos(inscritos: InscritoCsv[]): string {
  const csv = toCsv(
    ["nome", "email", "whatsapp", "status", "inscrito_em", "cancelado_em", "checkin_em"],
    inscritos.map((i) => [
      i.nome,
      i.email,
      i.whatsapp,
      i.status,
      i.createdAt.toISOString(),
      i.canceledAt?.toISOString() ?? null,
      i.checkinEm?.toISOString() ?? null,
    ]),
  );
  return String.fromCharCode(0xfeff) + csv;
}
