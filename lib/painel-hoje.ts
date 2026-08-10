import { prisma } from "@/lib/db";
import { formatDatetimeLocal } from "@/lib/admin";
import {
  dataISOBrasilia,
  montarOcorrencias,
  type OcorrenciaConcreta,
} from "@/lib/ocorrencias";

/**
 * "HOJE / ESTA SEMANA" (Frente 1 · PR3). A home do organizador organizada por
 * FREQUÊNCIA DE USO, não por entidade: ele abre isto na terça de manhã pra saber
 * quem vem, não pra editar descrição.
 *
 * A linha do tempo mistura duas fontes e as ordena por quando acontecem:
 *  - OCORRÊNCIAS da grade (`HorarioRecorrente`) que ainda não viraram evento —
 *    cada uma com o botão "marcar este treino" (pré-preenchido);
 *  - EVENTOS já publicados — com confirmados, fila e quantos de 1ª vez.
 *
 * Dedup: uma ocorrência que já foi materializada em Event (via
 * `Event.horarioRecorrenteId` + mesma data) aparece SÓ como evento, nunca duas
 * vezes. Ocorrência cancelada (a "sexta chuvosa") não entra.
 *
 * Contenção: reusa o MESMO predicado de dono do resto do painel
 * (`organization.membros.some.userId`). Se esta expressão sumir, o painel vaza.
 */
const daPessoa = (userId: string) => ({
  organization: { membros: { some: { userId } } },
});

export type ItemGrade = {
  tipo: "grade";
  comunidadeSlug: string;
  comunidadeNome: string;
  comunidadeLocal: string | null;
  modalidade: string;
  horarioId: string;
  dataISO: string;
  inicio: Date;
  horaInicio: string;
  diaSemanaRotulo: string;
  localAlterado: string | null;
};

export type ItemEvento = {
  tipo: "evento";
  eventId: string;
  comunidadeSlug: string;
  comunidadeNome: string;
  titulo: string;
  slug: string;
  startsAt: Date;
  local: string | null;
  confirmados: number;
  capacidade: number | null;
  fila: number;
  primeiraVez: number;
};

export type ItemSemana = ItemGrade | ItemEvento;

/** Título sugerido pra um treino da grade — o organizador só confirma. */
export function tituloSugerido(item: {
  diaSemanaRotulo: string;
}): string {
  return `Treino de ${item.diaSemanaRotulo.toLowerCase()}`;
}

/** O link do "marcar este treino": abre o form de novo evento pré-preenchido
 *  pela grade. O `horarioId` vincula o evento à grade (dedup + histórico). */
export function linkMarcarTreino(item: ItemGrade): string {
  const params = new URLSearchParams({
    comunidade: item.comunidadeSlug,
    startsAt: formatDatetimeLocal(item.inicio),
    titulo: tituloSugerido(item),
    horarioId: item.horarioId,
  });
  const local = item.localAlterado ?? item.comunidadeLocal;
  if (local) params.set("local", local);
  return `/painel/eventos/novo?${params.toString()}`;
}

/**
 * A linha do tempo "esta semana" do organizador: ocorrências da grade (não
 * materializadas, não canceladas) + eventos futuros com contagens, dentro da
 * janela de `dias`, ordenadas por instante.
 */
export async function estaSemana(
  userId: string,
  agora: Date = new Date(),
  dias = 10,
): Promise<ItemSemana[]> {
  const limite = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);

  const comunidades = await prisma.community.findMany({
    where: daPessoa(userId),
    select: { id: true, slug: true, nome: true, modalidade: true, local: true },
  });
  if (comunidades.length === 0) return [];
  const comIds = comunidades.map((c) => c.id);
  const comPorId = new Map(comunidades.map((c) => [c.id, c]));

  // ── Eventos futuros na janela, com o que vincula à grade ────────────────
  const eventos = await prisma.event.findMany({
    where: {
      communityId: { in: comIds },
      ativo: true,
      canceladoEm: null,
      startsAt: { gte: agora, lte: limite },
    },
    select: {
      id: true,
      titulo: true,
      slug: true,
      startsAt: true,
      local: true,
      capacidade: true,
      communityId: true,
      horarioRecorrenteId: true,
    },
    orderBy: { startsAt: "asc" },
  });
  const eventoIds = eventos.map((e) => e.id);

  // RSVPs ativos desses eventos, numa consulta — contamos em memória.
  const rsvps = eventoIds.length
    ? await prisma.rsvp.findMany({
        where: { eventId: { in: eventoIds }, canceledAt: null },
        select: { eventId: true, status: true, email: true },
      })
    : [];

  // "Veteranos": e-mails que já tiveram presença marcada em algum evento da
  // comunidade. Quem NÃO está aqui e se inscreveu é "de 1ª vez".
  const veteranosRows = comIds.length
    ? await prisma.rsvp.findMany({
        where: {
          event: { communityId: { in: comIds } },
          checkinEm: { not: null },
        },
        select: { email: true, event: { select: { communityId: true } } },
      })
    : [];
  const veteranosPorCom = new Map<string, Set<string>>();
  for (const v of veteranosRows) {
    const set = veteranosPorCom.get(v.event.communityId) ?? new Set<string>();
    set.add(v.email.toLowerCase());
    veteranosPorCom.set(v.event.communityId, set);
  }

  const itensEvento: ItemEvento[] = eventos.map((e) => {
    const doEvento = rsvps.filter((r) => r.eventId === e.id);
    const veteranos = veteranosPorCom.get(e.communityId) ?? new Set<string>();
    const confirmadosR = doEvento.filter((r) => r.status === "confirmado");
    const com = comPorId.get(e.communityId)!;
    return {
      tipo: "evento",
      eventId: e.id,
      comunidadeSlug: com.slug,
      comunidadeNome: com.nome,
      titulo: e.titulo,
      slug: e.slug,
      startsAt: e.startsAt,
      local: e.local,
      confirmados: confirmadosR.length,
      capacidade: e.capacidade,
      fila: doEvento.filter((r) => r.status === "lista_espera").length,
      primeiraVez: confirmadosR.filter((r) => !veteranos.has(r.email.toLowerCase())).length,
    };
  });

  // Chaves (grade, data) já materializadas em evento — a ocorrência não se repete.
  const jaMaterializada = new Set<string>();
  for (const e of eventos) {
    if (e.horarioRecorrenteId) {
      jaMaterializada.add(`${e.horarioRecorrenteId}|${dataISOBrasilia(e.startsAt)}`);
    }
  }

  // ── Ocorrências da grade, por comunidade ────────────────────────────────
  const horarios = await prisma.horarioRecorrente.findMany({
    where: { communityId: { in: comIds }, ativo: true },
    select: { id: true, communityId: true, diaSemana: true, minutoInicio: true },
  });
  const excecoes = horarios.length
    ? await prisma.excecaoHorario.findMany({
        where: { horarioRecorrente: { communityId: { in: comIds } } },
      })
    : [];

  // Agrupa por comunidade pra manter o vínculo com o nome/local no resultado.
  const itensGrade: ItemGrade[] = [];
  for (const com of comunidades) {
    const doCom = horarios.filter((h) => h.communityId === com.id);
    if (doCom.length === 0) continue;
    const ocorrencias: OcorrenciaConcreta[] = montarOcorrencias(doCom, excecoes, agora, 3);
    for (const o of ocorrencias) {
      if (o.cancelada) continue;
      if (o.inicio > limite) continue;
      if (jaMaterializada.has(`${o.horarioId}|${o.dataISO}`)) continue;
      itensGrade.push({
        tipo: "grade",
        comunidadeSlug: com.slug,
        comunidadeNome: com.nome,
        comunidadeLocal: com.local,
        modalidade: com.modalidade,
        horarioId: o.horarioId,
        dataISO: o.dataISO,
        inicio: o.inicio,
        horaInicio: o.horaInicio,
        diaSemanaRotulo: o.diaSemanaRotulo,
        localAlterado: o.localAlterado,
      });
    }
  }

  const instante = (i: ItemSemana) => (i.tipo === "evento" ? i.startsAt : i.inicio).getTime();
  return [...itensEvento, ...itensGrade].sort((a, b) => instante(a) - instante(b));
}
