// Usa o MESMO client do app (`lib/db.ts`), não um segundo `new
// PrismaClient()`. Dois clients significam duas configurações que divergem
// em silêncio — e o teste passaria a validar uma conexão que a aplicação
// não usa.
export { prisma } from "@/lib/db";
import { prisma } from "@/lib/db";

/**
 * Fixtures da suíte.
 *
 * REGRA: teste NUNCA depende do seed demo. O seed muda quando alguém edita
 * `prisma/seed.ts`, e teste que quebra por causa de dado de exemplo ensina o
 * time a ignorar teste vermelho.
 *
 * Tudo que a suíte cria carrega o prefixo `zzt-` no slug e `@teste.invalid`
 * no e-mail, e é apagado antes e depois. `.invalid` é TLD reservado pela
 * RFC 2606 — não existe e nunca vai existir, então nenhum e-mail de teste
 * escapa pra alguém de verdade.
 */

export const PREFIXO = "zzt-";
export const DOMINIO_TESTE = "@teste.invalid";

export type EventoDeTeste = {
  communityId: string;
  eventId: string;
  slug: string;
  comunidadeSlug: string;
};

/** Apaga tudo que a suíte já criou. Idempotente, seguro de rodar sempre. */
export async function limparFixtures() {
  await prisma.rsvp.deleteMany({ where: { email: { endsWith: DOMINIO_TESTE } } });
  await prisma.lead.deleteMany({ where: { email: { endsWith: DOMINIO_TESTE } } });
  await prisma.event.deleteMany({ where: { slug: { startsWith: PREFIXO } } });
  await prisma.community.deleteMany({ where: { slug: { startsWith: PREFIXO } } });
}

/**
 * Cria uma comunidade + evento isolados.
 *
 * `capacidade` default 1 porque o comportamento que mais importa testar é a
 * fila de espera, e ela só aparece quando a vaga acaba.
 */
export async function criarEvento(opts: {
  nome: string;
  modalidade?: string;
  regiao?: string;
  capacidade?: number | null;
  demo?: boolean;
  ativo?: boolean;
  diasNoFuturo?: number;
}): Promise<EventoDeTeste> {
  const base = `${PREFIXO}${opts.nome}`;
  const comunidade = await prisma.community.create({
    data: {
      slug: `${base}-com`,
      nome: `Comunidade ${opts.nome}`,
      modalidade: opts.modalidade ?? "Corrida",
      regiao: opts.regiao ?? "Ceilândia",
      demo: opts.demo ?? true,
      ativo: opts.ativo ?? true,
      descricao: "fixture de teste",
    },
  });

  const evento = await prisma.event.create({
    data: {
      communityId: comunidade.id,
      slug: `${base}-ev`,
      titulo: `Treino ${opts.nome}`,
      startsAt: new Date(
        Date.now() + (opts.diasNoFuturo ?? 10) * 24 * 60 * 60 * 1000,
      ),
      local: "Parque da Cidade",
      capacidade: opts.capacidade === undefined ? 1 : opts.capacidade,
      demo: opts.demo ?? true,
      ativo: opts.ativo ?? true,
    },
  });

  return {
    communityId: comunidade.id,
    eventId: evento.id,
    slug: evento.slug,
    comunidadeSlug: comunidade.slug,
  };
}

/** Cria N leads com datas escalonadas — pra exercitar paginação e período. */
export async function criarLeads(quantidade: number) {
  await prisma.lead.createMany({
    data: Array.from({ length: quantidade }, (_, i) => ({
      tipo: i % 2 === 0 ? ("participante" as const) : ("organizador" as const),
      nome: `Pessoa ${i + 1}`,
      email: `zzt-lead-${i + 1}${DOMINIO_TESTE}`,
      // i dias atrás: garante que o recorte de 7 dias corte de verdade
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      origem: "site",
    })),
    skipDuplicates: true,
  });
}

/** Header de Basic Auth do /admin, com as credenciais do webServer. */
export const AUTH_ADMIN = {
  Authorization:
    "Basic " +
    Buffer.from("teste:senha-de-teste-longa-o-suficiente").toString("base64"),
};

export type OrgDeTeste = {
  userId: string;
  email: string;
  organizationId: string;
  communityId: string;
  communitySlug: string;
  eventId: string;
  rsvpId: string;
};

/**
 * Uma organização completa e ISOLADA: conta + organização + comunidade +
 * evento + um inscrito.
 *
 * Existe pra semear DUAS e provar que uma não enxerga a outra. Testar escopo
 * com um dono só não prova nada — o vazamento só aparece quando há um
 * segundo dono pra vazar.
 */
export async function criarOrganizacao(nome: string): Promise<OrgDeTeste> {
  const base = `${PREFIXO}${nome}`;
  const email = `${base}${DOMINIO_TESTE}`;

  const user = await prisma.user.create({
    data: { name: `Dono ${nome}`, email, emailVerified: true },
  });

  const org = await prisma.organization.create({
    data: {
      nome: `Organização ${nome}`,
      slug: `${base}-org`,
      membros: { create: { userId: user.id } },
    },
  });

  const comunidade = await prisma.community.create({
    data: {
      slug: `${base}-com`,
      nome: `Comunidade ${nome}`,
      modalidade: "Corrida",
      regiao: "Ceilândia",
      demo: true,
      organizationId: org.id,
      descricao: "fixture de escopo",
    },
  });

  const evento = await prisma.event.create({
    data: {
      communityId: comunidade.id,
      slug: `${base}-ev`,
      titulo: `Treino ${nome}`,
      startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      capacidade: 10,
      demo: true,
    },
  });

  const rsvp = await prisma.rsvp.create({
    data: {
      eventId: evento.id,
      nome: `Inscrito de ${nome}`,
      email: `${base}-inscrito${DOMINIO_TESTE}`,
      whatsapp: "61999990000",
    },
  });

  return {
    userId: user.id,
    email,
    organizationId: org.id,
    communityId: comunidade.id,
    communitySlug: comunidade.slug,
    eventId: evento.id,
    rsvpId: rsvp.id,
  };
}

/** Limpa o que `criarOrganizacao` cria. Rodar ANTES de `limparFixtures`. */
export async function limparOrganizacoes() {
  await prisma.rsvp.deleteMany({ where: { email: { endsWith: DOMINIO_TESTE } } });
  await prisma.event.deleteMany({ where: { slug: { startsWith: PREFIXO } } });
  await prisma.community.deleteMany({ where: { slug: { startsWith: PREFIXO } } });
  await prisma.organization.deleteMany({ where: { slug: { startsWith: PREFIXO } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMINIO_TESTE } } });
}
