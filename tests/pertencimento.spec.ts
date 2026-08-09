import { test, expect } from "@playwright/test";
import {
  criarOrganizacao,
  limparOrganizacoes,
  prisma,
  PREFIXO,
  DOMINIO_TESTE,
  type OrgDeTeste,
} from "./fixtures";
import {
  seguir,
  deixarDeSeguir,
  segue,
  definirAviso,
  comunidadesDeUsuario,
  agenda,
} from "@/lib/membership";

/**
 * PERTENCIMENTO (STORY-008 · C3).
 *
 * Seguir é idempotente; deixar de seguir não toca em RSVP; a agenda dos dois
 * caminhos (comunidade seguida sem RSVP, e RSVP de comunidade não seguida);
 * apagar conta apaga os vínculos.
 */

let A: OrgDeTeste;
let B: OrgDeTeste;

async function criarUsuario(email: string) {
  return prisma.user.create({
    data: { name: `Pessoa ${email}`, email, emailVerified: true },
  });
}

test.beforeEach(async () => {
  await limparOrganizacoes();
  A = await criarOrganizacao("alfa");
  B = await criarOrganizacao("beta");
});

test.afterAll(async () => {
  await limparOrganizacoes();
  await prisma.$disconnect();
});

test("sem sessão, /minhas-comunidades e /agenda mandam pro /entrar", async ({
  request,
}) => {
  expect((await request.get("/minhas-comunidades")).url()).toContain("/entrar");
  expect((await request.get("/agenda")).url()).toContain("/entrar");
});

test("a página da comunidade mostra o botão Seguir mesmo deslogado", async ({
  request,
}) => {
  const resp = await request.get(`/comunidades/${A.communitySlug}`);
  expect(resp.status()).toBe(200);
  expect(await resp.text()).toContain("Seguir comunidade");
});

test("seguir é idempotente; deixar de seguir desfaz", async () => {
  const u = await criarUsuario(`${PREFIXO}u1${DOMINIO_TESTE}`);

  await seguir(u.id, A.communityId);
  await seguir(u.id, A.communityId); // clique duplo
  expect(
    await prisma.membership.count({
      where: { userId: u.id, communityId: A.communityId },
    }),
  ).toBe(1);
  expect(await segue(u.id, A.communityId)).toBe(true);

  await deixarDeSeguir(u.id, A.communityId);
  expect(await segue(u.id, A.communityId)).toBe(false);
  // deixar de seguir o que já não segue é inofensivo
  await deixarDeSeguir(u.id, A.communityId);
});

test("deixar de seguir NÃO apaga a inscrição (RSVP)", async () => {
  const u = await criarUsuario(`${PREFIXO}u2${DOMINIO_TESTE}`);
  const rsvp = await prisma.rsvp.create({
    data: {
      eventId: A.eventId,
      nome: "U2",
      email: `${PREFIXO}u2${DOMINIO_TESTE}`,
      userId: u.id,
      status: "confirmado",
    },
  });

  await seguir(u.id, A.communityId);
  await deixarDeSeguir(u.id, A.communityId);

  expect(await prisma.rsvp.findUnique({ where: { id: rsvp.id } })).not.toBeNull();
});

test("agenda de quem não segue nada (e não tem RSVP) é vazia, não quebra", async () => {
  const u = await criarUsuario(`${PREFIXO}u3${DOMINIO_TESTE}`);
  expect(await agenda(u.id)).toEqual([]);
});

test("agenda: evento de comunidade seguida (sem RSVP) E RSVP de comunidade não seguida", async () => {
  const u = await criarUsuario(`${PREFIXO}u4${DOMINIO_TESTE}`);

  // segue A (não tem RSVP em A) → evento de A entra como "só seguindo"
  await seguir(u.id, A.communityId);
  // tem RSVP em B, mas NÃO segue B → evento de B entra como "inscrito"
  await prisma.rsvp.create({
    data: {
      eventId: B.eventId,
      nome: "U4",
      email: `${PREFIXO}u4${DOMINIO_TESTE}`,
      userId: u.id,
      status: "confirmado",
    },
  });

  const itens = await agenda(u.id);
  const porId = new Map(itens.map((i) => [i.eventId, i]));

  expect(porId.has(A.eventId)).toBe(true);
  expect(porId.get(A.eventId)!.inscrito).toBe(false); // só seguindo
  expect(porId.has(B.eventId)).toBe(true);
  expect(porId.get(B.eventId)!.inscrito).toBe(true); // inscrito, sem seguir
});

test("apagar a conta apaga os vínculos de seguir (cascade)", async () => {
  const u = await criarUsuario(`${PREFIXO}u5${DOMINIO_TESTE}`);
  await seguir(u.id, A.communityId);
  expect(await prisma.membership.count({ where: { userId: u.id } })).toBe(1);

  await prisma.user.delete({ where: { id: u.id } });
  expect(await prisma.membership.count({ where: { userId: u.id } })).toBe(0);
});

test("definir aviso reflete em minhas-comunidades", async () => {
  const u = await criarUsuario(`${PREFIXO}u6${DOMINIO_TESTE}`);
  await seguir(u.id, A.communityId);

  await definirAviso(u.id, A.communityId, false);
  const lista = await comunidadesDeUsuario(u.id);
  const daA = lista.find((c) => c.comunidade.id === A.communityId);
  expect(daA?.avisarEventos).toBe(false);
});
