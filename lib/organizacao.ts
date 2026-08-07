import { prisma } from "@/lib/db";

/**
 * ESCOPO DE DADO DO PAINEL — fonte única (STORY-009, decisão 4).
 *
 * Toda consulta do `/painel` passa por aqui. **Nenhuma página do painel fala
 * com o Prisma direto.** Não é preferência de arquitetura: é onde o filtro de
 * dono vive e onde o teste consegue bater.
 *
 * O incidente que isto evita tem forma concreta: um `findMany` de RSVP sem
 * `where` de organização entrega nome, e-mail e WhatsApp da base inteira de
 * participantes pro primeiro organizador que abrir a tela. Isso é incidente
 * de LGPD, não bug de listagem.
 *
 * DUAS REGRAS QUE NÃO SE NEGOCIAM AQUI:
 *
 * 1. **Toda função recebe `userId` como primeiro argumento.** Não existe
 *    "pega por id" sem dono nesta camada. Se um dia precisar, cria em outro
 *    arquivo com outro nome — a assinatura é a barreira.
 *
 * 2. **Não existe nem existe-mas-não-é-seu: os dois devolvem `null`.** A
 *    página chama `notFound()` e a resposta é 404. Um 403 confirmaria que o
 *    recurso existe, e isso já é vazamento: dá pra varrer IDs e mapear a
 *    base de quem é concorrente. A spec exige 404, e é por isso.
 */

/** Sessão sem dono de nada. Não é erro — é o estado de quem acabou de criar conta. */
export type Organizacao = { id: string; nome: string; slug: string };

/**
 * As organizações da pessoa. Lista vazia = ela não administra nada, e o
 * painel mostra o convite pra cadastrar comunidade, nunca um erro.
 */
export async function organizacoesDe(userId: string): Promise<Organizacao[]> {
  const vinculos = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organization: { select: { id: true, nome: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });
  return vinculos.map((v) => v.organization);
}

/** A pessoa administra esta organização? */
export async function souOrganizador(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const vinculo = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { id: true },
  });
  return vinculo !== null;
}

/**
 * O FILTRO. Toda consulta de comunidade do painel usa este `where`.
 *
 * Ler em voz alta: "comunidade cuja organização tem, entre os membros, um
 * vínculo com este usuário". Se esta expressão sumir de alguma query, o
 * painel vaza — é a linha mais importante do arquivo.
 */
const daPessoa = (userId: string) => ({
  organization: { membros: { some: { userId } } },
});

/** Comunidades que a pessoa administra. */
export async function comunidadesDoUsuario(userId: string) {
  return prisma.community.findMany({
    where: daPessoa(userId),
    orderBy: { nome: "asc" },
    select: {
      id: true,
      slug: true,
      nome: true,
      modalidade: true,
      regiao: true,
      ativo: true,
      statusPublicacao: true,
      codigoConvite: true,
      _count: { select: { events: true, membros: true } },
    },
  });
}

/**
 * Uma comunidade da pessoa, por slug. `null` quando não existe **ou** quando
 * existe e é de outro — de propósito (ver regra 2 no topo).
 */
export async function comunidadeDoUsuario(userId: string, slug: string) {
  return prisma.community.findFirst({
    where: { slug, ...daPessoa(userId) },
  });
}

/**
 * Um evento da pessoa, por id. Usa `findFirst` e não `findUnique` porque
 * `findUnique` não aceita filtro por relação — e sem o filtro por relação
 * qualquer id de evento abre a lista de inscritos de qualquer comunidade.
 */
export async function eventoDoUsuario(userId: string, eventId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, community: daPessoa(userId) },
    include: { community: { select: { id: true, slug: true, nome: true } } },
  });
}

/** Próximos eventos das comunidades da pessoa. */
export async function eventosDoUsuario(
  userId: string,
  opts: { comunidadeSlug?: string; incluirPassados?: boolean } = {},
) {
  return prisma.event.findMany({
    where: {
      community: {
        ...daPessoa(userId),
        ...(opts.comunidadeSlug ? { slug: opts.comunidadeSlug } : {}),
      },
      ...(opts.incluirPassados ? {} : { startsAt: { gte: new Date() } }),
    },
    orderBy: { startsAt: "asc" },
    include: {
      community: { select: { slug: true, nome: true } },
      _count: { select: { rsvps: { where: { canceledAt: null } } } },
    },
  });
}

/**
 * Inscritos de UM evento da pessoa. `null` quando o evento não é dela — e a
 * página vira 404 sem nunca ter tocado em Rsvp.
 *
 * A ordem importa: primeiro confirma o dono, depois lista. Listar e filtrar
 * depois é como esse tipo de bug nasce.
 *
 * O organizador vê nome, e-mail e WhatsApp de quem se inscreveu NOS EVENTOS
 * DELE — finalidade legítima, declarada na política de privacidade (avisar
 * mudança de local, confirmar presença). Nunca vê participante de outra
 * comunidade nem agregado da base (STORY-009, decisão 5).
 */
export async function inscritosDoEvento(userId: string, eventId: string) {
  const evento = await eventoDoUsuario(userId, eventId);
  if (!evento) return null;

  const inscritos = await prisma.rsvp.findMany({
    where: { eventId: evento.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nome: true,
      email: true,
      whatsapp: true,
      status: true,
      createdAt: true,
      canceledAt: true,
      checkinEm: true,
    },
  });

  return { evento, inscritos };
}

/**
 * Marca presença. Idempotente por construção: se já tem `checkinEm`, não
 * sobrescreve. A tela é otimista e a rede de quadra e parque cai no meio da
 * lista — marcar duas vezes tem que ser igual a marcar uma.
 *
 * Devolve `false` quando o RSVP não pertence a um evento da pessoa. Mesmo
 * princípio do resto: sem dono, não acontece.
 */
export async function marcarPresenca(
  userId: string,
  rsvpId: string,
  presente: boolean,
): Promise<boolean> {
  const rsvp = await prisma.rsvp.findFirst({
    where: { id: rsvpId, event: { community: daPessoa(userId) } },
    select: { id: true, checkinEm: true },
  });
  if (!rsvp) return false;

  const jaEstaComoQueremos = presente
    ? rsvp.checkinEm !== null
    : rsvp.checkinEm === null;
  if (jaEstaComoQueremos) return true;

  await prisma.rsvp.update({
    where: { id: rsvp.id },
    data: { checkinEm: presente ? new Date() : null },
  });
  return true;
}
