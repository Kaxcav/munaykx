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
  convidar,
  listarPendentes,
  revogar,
  aceitar,
  convitePorToken,
} from "@/lib/convites";
import { conteudoConvite, emailConvite } from "@/lib/emails-convite";

/**
 * CONVITES NOMINAIS (STORY-009, frente D).
 *
 * Contenção, de novo: A não convida pra org de B, não lista/revoga convite de
 * B, e ninguém aceita convite que não é do seu e-mail. Aceitar é transacional
 * e de uso único; convite vencido não vira membro.
 */

let A: OrgDeTeste;
let B: OrgDeTeste;

async function criarUsuario(email: string) {
  return prisma.user.create({
    data: { name: `Convidado ${email}`, email, emailVerified: true },
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

test("sem sessão, /painel/convites e /convite mandam pro /entrar", async ({
  request,
}) => {
  const a = await request.get("/painel/convites");
  expect(a.url()).toContain("/entrar");
  const b = await request.get("/convite/um-token-qualquer");
  expect(b.url()).toContain("/entrar");
});

test("só o dono da org convida; convite fica escopado à org", async () => {
  const email = `${PREFIXO}c1${DOMINIO_TESTE}`;

  // A convida na própria org → ok
  const meu = await convidar(A.userId, A.organizationId, email);
  expect(meu.ok).toBe(true);
  if (meu.ok) {
    const conv = await convitePorToken(meu.dados.token);
    expect(conv?.organization.id).toBe(A.organizationId); // escopado à org de A
  }

  // A tenta convidar pra org de B → nao-dono
  const invasor = await convidar(A.userId, B.organizationId, `${PREFIXO}c2${DOMINIO_TESTE}`);
  expect(invasor.ok).toBe(false);
  if (!invasor.ok) expect(invasor.motivo).toBe("nao-dono");

  // e nada foi criado na org de B
  const naB = await prisma.organizationInvite.count({
    where: { organizationId: B.organizationId },
  });
  expect(naB).toBe(0);
});

test("listar e revogar são escopados ao dono", async () => {
  const email = `${PREFIXO}rev${DOMINIO_TESTE}`;
  const conv = await convidar(A.userId, A.organizationId, email);
  expect(conv.ok).toBe(true);
  const id = conv.ok ? conv.dados.id : "";

  // A vê o próprio pendente; B não enxerga a lista de A
  expect((await listarPendentes(A.userId, A.organizationId)).map((c) => c.email)).toContain(email);
  expect(await listarPendentes(B.userId, A.organizationId)).toEqual([]); // nao-dono → vazio

  // B não revoga convite de A
  const cross = await revogar(B.userId, A.organizationId, id);
  expect(cross.ok).toBe(false);
  expect(await prisma.organizationInvite.count({ where: { id } })).toBe(1);

  // A revoga o próprio
  const meu = await revogar(A.userId, A.organizationId, id);
  expect(meu.ok).toBe(true);
  expect(await prisma.organizationInvite.count({ where: { id } })).toBe(0);
});

test("aceitar exige o e-mail do convite; convite alheio não entra", async () => {
  const email = `${PREFIXO}aceite${DOMINIO_TESTE}`;
  const conv = await convidar(A.userId, A.organizationId, email);
  const token = conv.ok ? conv.dados.token : "";
  const u = await criarUsuario(email);

  // e-mail da sessão diferente do convite → nao-e-seu, e ninguém vira membro
  const alheio = await aceitar(u.id, `${PREFIXO}outro${DOMINIO_TESTE}`, token);
  expect(alheio.ok).toBe(false);
  if (!alheio.ok) expect(alheio.motivo).toBe("nao-e-seu");
  expect(
    await prisma.organizationMember.findFirst({
      where: { userId: u.id, organizationId: A.organizationId },
    }),
  ).toBeNull();

  // e-mail certo → vira OrganizationMember (transacional) e marca o aceite
  const certo = await aceitar(u.id, email, token);
  expect(certo.ok).toBe(true);
  expect(
    await prisma.organizationMember.findFirst({
      where: { userId: u.id, organizationId: A.organizationId },
    }),
  ).not.toBeNull();
  expect((await convitePorToken(token))?.aceitoEm).not.toBeNull();

  // uso único: aceitar de novo não repete
  const denovo = await aceitar(u.id, email, token);
  expect(denovo.ok).toBe(false);
  if (!denovo.ok) expect(denovo.motivo).toBe("ja-usado");
});

test("convite expirado não vira membro", async () => {
  const email = `${PREFIXO}exp${DOMINIO_TESTE}`;
  const conv = await convidar(A.userId, A.organizationId, email);
  const token = conv.ok ? conv.dados.token : "";
  // força o vencimento
  await prisma.organizationInvite.update({
    where: { token },
    data: { expiraEm: new Date(Date.now() - 1000) },
  });
  const u = await criarUsuario(email);

  const r = await aceitar(u.id, email, token);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.motivo).toBe("expirado");
  expect(
    await prisma.organizationMember.findFirst({
      where: { userId: u.id, organizationId: A.organizationId },
    }),
  ).toBeNull();
});

test("o e-mail de convite carrega a org e o link, e não sai de verdade", async () => {
  const { html, text } = conteudoConvite({ organizacao: "Corrida Sudoeste", token: "tok-abc-123" });
  expect(html).toContain("Corrida Sudoeste");
  expect(html).toContain("/convite/tok-abc-123");
  expect(text).toContain("/convite/tok-abc-123");

  // sem EMAIL_PROVIDER (suíte com e-mail desligado): no-op, nada sai
  const r = await emailConvite({
    para: `${PREFIXO}dest${DOMINIO_TESTE}`,
    organizacao: "Corrida Sudoeste",
    token: "tok-abc-123",
  });
  expect(r.ok).toBe(false);
});
