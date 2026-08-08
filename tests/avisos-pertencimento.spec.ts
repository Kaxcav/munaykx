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
  avisarSeguidoresDeEventoNovo,
  tokenDescadastro,
  lerTokenDescadastro,
} from "@/lib/avisos-evento";
import { conteudoEventoNovo, emailEventoNovo } from "@/lib/emails-pertencimento";
import { seguir, definirAviso } from "@/lib/membership";

/**
 * STORY-008 slice 2 — avisos de evento novo, teto e descadastro assinado.
 *
 * Envio mockado (a suíte roda com e-mail desligado → no-op); o que se testa é a
 * ORQUESTRAÇÃO: quem entra no aviso, o teto por dia, e a assinatura do link.
 */

let A: OrgDeTeste;

async function criarUsuario(email: string) {
  return prisma.user.create({
    data: { name: `Seguidor ${email}`, email, emailVerified: true },
  });
}

test.beforeEach(async () => {
  await limparOrganizacoes();
  A = await criarOrganizacao("alfa");
});

test.afterAll(async () => {
  await limparOrganizacoes();
  await prisma.$disconnect();
});

test("avisa os seguidores UMA vez; teto de 1/comunidade/dia (5 eventos = 1)", async () => {
  const u = await criarUsuario(`${PREFIXO}seg1${DOMINIO_TESTE}`);
  await seguir(u.id, A.communityId);

  // primeiro evento → 1 e-mail
  expect(await avisarSeguidoresDeEventoNovo(A.eventId)).toBe(1);

  // segundo evento na MESMA comunidade, mesmo dia → teto segura: 0
  const ev2 = await prisma.event.create({
    data: {
      communityId: A.communityId,
      slug: `${PREFIXO}alfa-ev2`,
      titulo: "Segundo do dia",
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      capacidade: 10,
      demo: true,
    },
  });
  expect(await avisarSeguidoresDeEventoNovo(ev2.id)).toBe(0);
  // re-disparar o primeiro também não repete
  expect(await avisarSeguidoresDeEventoNovo(A.eventId)).toBe(0);
});

test("quem desligou o aviso (avisarEventos=false) não recebe", async () => {
  const u = await criarUsuario(`${PREFIXO}seg2${DOMINIO_TESTE}`);
  await seguir(u.id, A.communityId);
  await definirAviso(u.id, A.communityId, false);

  expect(await avisarSeguidoresDeEventoNovo(A.eventId)).toBe(0);
});

test("comunidade não aprovada não dispara aviso", async () => {
  const u = await criarUsuario(`${PREFIXO}seg3${DOMINIO_TESTE}`);
  await seguir(u.id, A.communityId);
  await prisma.community.update({
    where: { id: A.communityId },
    data: { statusPublicacao: "pendente" },
  });

  expect(await avisarSeguidoresDeEventoNovo(A.eventId)).toBe(0);
});

test("o e-mail carrega comunidade, evento e o link de descadastro; não sai de verdade", async () => {
  const { html, text } = conteudoEventoNovo({
    comunidade: "Corrida Sudoeste",
    evento: { titulo: "Treino de domingo", slug: "zzt-treino-dom", startsAt: new Date() },
    tokenDescadastro: "tok.abc",
  });
  expect(html).toContain("Corrida Sudoeste");
  expect(html).toContain("/eventos/zzt-treino-dom");
  expect(html).toContain("/descadastrar/tok.abc");
  expect(text).toContain("/descadastrar/tok.abc"); // URL sobrevive no texto

  const r = await emailEventoNovo({
    para: `${PREFIXO}dest${DOMINIO_TESTE}`,
    comunidade: "Corrida Sudoeste",
    evento: { titulo: "Treino", slug: "zzt-treino-dom", startsAt: new Date() },
    tokenDescadastro: "tok.abc",
  });
  expect(r.ok).toBe(false); // sem provider → no-op
});

test("token de descadastro: válido volta os dados; adulterado é null", async () => {
  const t = tokenDescadastro("user-123", "com-456");
  expect(lerTokenDescadastro(t)).toEqual({ userId: "user-123", communityId: "com-456" });
  expect(lerTokenDescadastro(t + "x")).toBeNull(); // assinatura adulterada
  expect(lerTokenDescadastro("lixo")).toBeNull();
});

test("descadastro pelo link (deslogado): assinatura válida desliga; forjada não", async ({
  request,
}) => {
  const u = await criarUsuario(`${PREFIXO}seg4${DOMINIO_TESTE}`);
  await seguir(u.id, A.communityId); // avisarEventos nasce true

  // token válido → GET desliga o aviso, sem login
  const t = tokenDescadastro(u.id, A.communityId);
  const resp = await request.get(`/descadastrar/${t}`);
  expect(resp.status()).toBe(200);
  expect(
    (
      await prisma.membership.findUnique({
        where: { userId_communityId: { userId: u.id, communityId: A.communityId } },
        select: { avisarEventos: true },
      })
    )?.avisarEventos,
  ).toBe(false);

  // token forjado → não desliga quem estava ligado
  const u2 = await criarUsuario(`${PREFIXO}seg5${DOMINIO_TESTE}`);
  await seguir(u2.id, A.communityId);
  const forjado = tokenDescadastro(u2.id, A.communityId) + "x";
  const resp2 = await request.get(`/descadastrar/${forjado}`, {
    failOnStatusCode: false,
  });
  expect(resp2.status()).toBe(200);
  expect(
    (
      await prisma.membership.findUnique({
        where: { userId_communityId: { userId: u2.id, communityId: A.communityId } },
        select: { avisarEventos: true },
      })
    )?.avisarEventos,
  ).toBe(true);
});
