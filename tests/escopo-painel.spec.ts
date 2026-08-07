import { test, expect } from "@playwright/test";
import {
  criarOrganizacao,
  limparOrganizacoes,
  prisma,
  type OrgDeTeste,
} from "./fixtures";
import {
  comunidadeDoUsuario,
  comunidadesDoUsuario,
  eventoDoUsuario,
  eventosDoUsuario,
  inscritosDoEvento,
  marcarPresenca,
  organizacoesDe,
  souOrganizador,
} from "@/lib/organizacao";

/**
 * ESCOPO DO PAINEL — o coração da STORY-009. Sem estes testes a story não sobe.
 *
 * O que se testa aqui não é funcionalidade, é **contenção**. Duas organizações
 * são semeadas e a pergunta é sempre a mesma: A consegue tocar em algo de B?
 * Testar com um dono só não prova nada — o vazamento precisa de um segundo
 * dono pra ter pra onde vazar.
 *
 * E a resposta certa pra "não é seu" é sempre **null**, nunca um erro que
 * diferencie de "não existe". 403 confirma que o recurso existe, e isso já
 * entrega o mapa: dá pra varrer IDs e descobrir a base de quem é concorrente.
 */

let A: OrgDeTeste;
let B: OrgDeTeste;

test.beforeAll(async () => {
  await limparOrganizacoes();
  A = await criarOrganizacao("orgA");
  B = await criarOrganizacao("orgB");
});

test.afterAll(async () => {
  await limparOrganizacoes();
  await prisma.$disconnect();
});

test("cada um enxerga a própria organização, e só ela", async () => {
  const deA = await organizacoesDe(A.userId);
  expect(deA).toHaveLength(1);
  expect(deA[0].id).toBe(A.organizationId);
  expect(deA.map((o) => o.id)).not.toContain(B.organizationId);

  expect(await souOrganizador(A.userId, A.organizationId)).toBe(true);
  expect(await souOrganizador(A.userId, B.organizationId)).toBe(false);
});

test("A pede a comunidade de B pelo slug e recebe null, não a comunidade", async () => {
  expect(await comunidadeDoUsuario(A.userId, A.communitySlug)).not.toBeNull();
  // O slug existe e está certo. O que falta é ser dele.
  expect(await comunidadeDoUsuario(A.userId, B.communitySlug)).toBeNull();
});

test("A pede o evento de B pelo ID direto e recebe null — vira 404, não 403", async () => {
  // Este é o teste que a spec chama de obrigatório. O ID é real e válido:
  // o que impede é o dono, não a existência.
  expect(await eventoDoUsuario(A.userId, A.eventId)).not.toBeNull();
  expect(await eventoDoUsuario(A.userId, B.eventId)).toBeNull();
});

test("a lista do painel de A nunca traz uma linha de B", async () => {
  const comunidades = await comunidadesDoUsuario(A.userId);
  expect(comunidades.map((c) => c.id)).toEqual([A.communityId]);

  const eventos = await eventosDoUsuario(A.userId);
  expect(eventos.map((e) => e.id)).toEqual([A.eventId]);

  // E o inverso também, senão o teste passaria com um filtro que só funciona
  // num sentido.
  const doB = await comunidadesDoUsuario(B.userId);
  expect(doB.map((c) => c.id)).toEqual([B.communityId]);
});

test("A NÃO alcança a lista de inscritos de B — é aqui que vazaria dado pessoal", async () => {
  const meus = await inscritosDoEvento(A.userId, A.eventId);
  expect(meus).not.toBeNull();
  expect(meus!.inscritos).toHaveLength(1);
  // Confirma que o dado sensível existe mesmo, pra o teste abaixo ter peso.
  expect(meus!.inscritos[0].email).toContain("@teste.invalid");
  expect(meus!.inscritos[0].whatsapp).toBeTruthy();

  // O evento de B tem inscrito com nome, e-mail e WhatsApp. A não vê nada.
  expect(await inscritosDoEvento(A.userId, B.eventId)).toBeNull();
});

test("A não marca presença em inscrito de B", async () => {
  expect(await marcarPresenca(A.userId, A.rsvpId, true)).toBe(true);
  expect(await marcarPresenca(A.userId, B.rsvpId, true)).toBe(false);

  const doB = await prisma.rsvp.findUnique({ where: { id: B.rsvpId } });
  expect(doB?.checkinEm, "B foi marcado por A").toBeNull();
});

test("marcar presença duas vezes é o mesmo que marcar uma", async () => {
  await marcarPresenca(A.userId, A.rsvpId, true);
  const primeira = (await prisma.rsvp.findUnique({ where: { id: A.rsvpId } }))
    ?.checkinEm;
  expect(primeira).not.toBeNull();

  await marcarPresenca(A.userId, A.rsvpId, true);
  const segunda = (await prisma.rsvp.findUnique({ where: { id: A.rsvpId } }))
    ?.checkinEm;

  // Não é só "continua marcado": o horário do primeiro check-in tem que
  // sobreviver. Sobrescrever perderia a hora real da chegada.
  expect(segunda?.toISOString()).toBe(primeira?.toISOString());
});

test("desmarcar volta ao estado limpo, e desmarcar de novo é inofensivo", async () => {
  await marcarPresenca(A.userId, A.rsvpId, false);
  expect(
    (await prisma.rsvp.findUnique({ where: { id: A.rsvpId } }))?.checkinEm,
  ).toBeNull();
  expect(await marcarPresenca(A.userId, A.rsvpId, false)).toBe(true);
});

test("conta sem organização não é erro — é lista vazia", async () => {
  const solitario = await prisma.user.create({
    data: {
      name: "Sem organização",
      email: "zzt-sozinho@teste.invalid",
      emailVerified: true,
    },
  });
  expect(await organizacoesDe(solitario.id)).toEqual([]);
  expect(await comunidadesDoUsuario(solitario.id)).toEqual([]);
  expect(await eventosDoUsuario(solitario.id)).toEqual([]);
});
