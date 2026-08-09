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
  gerarCodigoConvite,
  revogarCodigoConvite,
  comunidadePorCodigo,
  entrarPorCodigo,
} from "@/lib/convite-aberto";
import { segue } from "@/lib/membership";

/**
 * Frente D — metade do LINK ABERTO (RODADA-painel §D).
 *
 * A invariante que estes testes existem pra proteger é UMA, e ela é a
 * segurança inteira do produto: **o link aberto concede `Membership`
 * (seguir) e NUNCA `OrganizationMember` (poder)**. Se um dia alguém "unificar
 * os convites" pra simplificar, é aqui que fica vermelho — porque quem tem o
 * link encaminhado passaria a ver nome, e-mail e WhatsApp de gente real na
 * lista de inscritos.
 */

let A: OrgDeTeste;
let B: OrgDeTeste;

async function criarUsuario(email: string) {
  return prisma.user.create({
    data: { name: `Pessoa ${email}`, email, emailVerified: true },
  });
}

async function codigoDe(org: OrgDeTeste): Promise<string> {
  const r = await gerarCodigoConvite(org.userId, org.communitySlug);
  if (!r.ok) throw new Error(`não gerou o código: ${r.motivo}`);
  return r.dados.codigo;
}

test.beforeEach(async () => {
  await limparOrganizacoes();
  A = await criarOrganizacao("cona");
  B = await criarOrganizacao("conb");
});

test.afterAll(async () => {
  await limparOrganizacoes();
  await prisma.$disconnect();
});

// ── A invariante ───────────────────────────────────────────────────────────

test("entrar pelo link cria Membership e NÃO cria OrganizationMember", async () => {
  const u = await criarUsuario(`${PREFIXO}convidado${DOMINIO_TESTE}`);
  const codigo = await codigoDe(A);

  const antes = await prisma.organizationMember.count({
    where: { organizationId: A.organizationId },
  });

  const com = await entrarPorCodigo(u.id, codigo);
  expect(com?.slug).toBe(A.communitySlug);

  // ganhou o vínculo de SEGUIR...
  expect(await segue(u.id, A.communityId)).toBe(true);

  // ...e NENHUM poder: a contagem de organizadores não mudou, e esta pessoa
  // não está entre eles.
  expect(
    await prisma.organizationMember.count({ where: { organizationId: A.organizationId } }),
  ).toBe(antes);
  expect(
    await prisma.organizationMember.count({ where: { userId: u.id } }),
  ).toBe(0);
});

test("quem entrou pelo link NÃO consegue agir como dono da comunidade", async () => {
  const u = await criarUsuario(`${PREFIXO}semdono${DOMINIO_TESTE}`);
  await entrarPorCodigo(u.id, await codigoDe(A));

  // a barreira do painel continua de pé pra ele: não é dono, então nem o
  // próprio link de convite ele consegue mexer.
  expect(await gerarCodigoConvite(u.id, A.communitySlug)).toMatchObject({
    ok: false,
    motivo: "nao-dono",
  });
  expect(await revogarCodigoConvite(u.id, A.communitySlug)).toMatchObject({
    ok: false,
    motivo: "nao-dono",
  });
});

// ── Escopo de quem gera ────────────────────────────────────────────────────

test("só o dono gera/revoga; comunidade alheia devolve nao-dono", async () => {
  expect(await gerarCodigoConvite(A.userId, A.communitySlug)).toMatchObject({ ok: true });
  expect(await gerarCodigoConvite(A.userId, B.communitySlug)).toMatchObject({
    ok: false,
    motivo: "nao-dono",
  });
  expect(await revogarCodigoConvite(A.userId, B.communitySlug)).toMatchObject({
    ok: false,
    motivo: "nao-dono",
  });

  // e a comunidade do outro seguiu sem link nenhum
  const b = await prisma.community.findUnique({
    where: { id: B.communityId },
    select: { codigoConvite: true },
  });
  expect(b?.codigoConvite).toBeNull();
});

test("comunidade não aprovada não gera link (não é caminho lateral pra furar a moderação)", async () => {
  await prisma.community.update({
    where: { id: A.communityId },
    data: { statusPublicacao: "pendente" },
  });
  expect(await gerarCodigoConvite(A.userId, A.communitySlug)).toMatchObject({
    ok: false,
    motivo: "nao-publicavel",
  });
});

// ── Ciclo de vida do código ────────────────────────────────────────────────

test("gerar de novo INVALIDA o código anterior", async () => {
  const antigo = await codigoDe(A);
  const novo = await codigoDe(A);
  expect(novo).not.toBe(antigo);

  expect(await comunidadePorCodigo(antigo)).toBeNull();
  expect((await comunidadePorCodigo(novo))?.id).toBe(A.communityId);
});

test("revogar desliga o link, mas quem já entrou continua seguindo", async () => {
  const u = await criarUsuario(`${PREFIXO}jaentrou${DOMINIO_TESTE}`);
  const codigo = await codigoDe(A);
  await entrarPorCodigo(u.id, codigo);

  expect(await revogarCodigoConvite(A.userId, A.communitySlug)).toMatchObject({ ok: true });

  // ninguém novo entra...
  expect(await comunidadePorCodigo(codigo)).toBeNull();
  const outro = await criarUsuario(`${PREFIXO}tarde${DOMINIO_TESTE}`);
  expect(await entrarPorCodigo(outro.id, codigo)).toBeNull();
  expect(await segue(outro.id, A.communityId)).toBe(false);

  // ...e quem entrou antes não é expulso: revogar link não desfaz vínculo.
  expect(await segue(u.id, A.communityId)).toBe(true);
});

test("entrar duas vezes é idempotente e não reseta a preferência de aviso", async () => {
  const u = await criarUsuario(`${PREFIXO}duasvezes${DOMINIO_TESTE}`);
  const codigo = await codigoDe(A);

  await entrarPorCodigo(u.id, codigo);
  // a pessoa desliga o aviso...
  await prisma.membership.updateMany({
    where: { userId: u.id, communityId: A.communityId },
    data: { avisarEventos: false },
  });
  // ...e abre o link de novo
  await entrarPorCodigo(u.id, codigo);

  expect(
    await prisma.membership.count({ where: { userId: u.id, communityId: A.communityId } }),
  ).toBe(1);
  expect(
    (
      await prisma.membership.findUnique({
        where: { userId_communityId: { userId: u.id, communityId: A.communityId } },
        select: { avisarEventos: true },
      })
    )?.avisarEventos,
  ).toBe(false); // continua desligado — abrir o link não religa aviso
});

// ── Resolução do código ────────────────────────────────────────────────────

test("código vazio, em branco ou inventado não casa com comunidade nenhuma", async () => {
  await codigoDe(A); // existe UM código válido no banco

  expect(await comunidadePorCodigo("")).toBeNull();
  expect(await comunidadePorCodigo("   ")).toBeNull();
  expect(await comunidadePorCodigo("nao-existe-esse-codigo")).toBeNull();
});

test("comunidade despublicada depois some do link, mesmo com o código certo", async () => {
  const codigo = await codigoDe(A);
  expect(await comunidadePorCodigo(codigo)).not.toBeNull();

  await prisma.community.update({
    where: { id: A.communityId },
    data: { ativo: false },
  });
  expect(await comunidadePorCodigo(codigo)).toBeNull();
});

test("o código não vaza dado de inscrito — só o que a página pública já mostra", async () => {
  const com = await comunidadePorCodigo(await codigoDe(A));
  expect(Object.keys(com ?? {}).sort()).toEqual(
    ["id", "modalidade", "nome", "regiao", "slug"].sort(),
  );
});

// ── Superfícies HTTP ───────────────────────────────────────────────────────

test("deslogado, o link válido manda pro /entrar preservando a intenção", async ({
  request,
}) => {
  const codigo = await codigoDe(A);
  const resp = await request.get(`/c/${encodeURIComponent(codigo)}`, {
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  // A suíte roda com auth DESLIGADA (playwright.config), então ninguém está
  // logado: o caminho exercido aqui é exatamente o de quem clica no link do
  // WhatsApp sem conta.
  expect([302, 307]).toContain(resp.status());
  const destino = resp.headers()["location"] ?? "";
  expect(destino).toContain("/entrar");
  expect(decodeURIComponent(destino)).toContain(`/c/${codigo}`);
});

test("link inválido responde 200 com explicação, não 404 nem erro", async ({ request }) => {
  const resp = await request.get("/c/codigo-que-nao-existe");
  expect(resp.status()).toBe(200);
  const html = await resp.text();
  expect(html).toContain("Convite inválido");
  // e não cria vínculo nenhum, obviamente
  expect(await prisma.membership.count()).toBe(0);
});

test("a rota de convite é noindex e não entra no sitemap", async ({ request }) => {
  const html = await (await request.get("/c/codigo-que-nao-existe")).text();
  expect(html).toMatch(/<meta name="robots"[^>]*noindex/i);

  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).not.toMatch(/\/c\//);
});

test("a tela de link no painel exige sessão: deslogado vai pro /entrar", async ({
  request,
}) => {
  const resp = await request.get(
    `/painel/comunidades/${A.communitySlug}/convite`,
    { maxRedirects: 0, failOnStatusCode: false },
  );
  expect([302, 307]).toContain(resp.status());
  expect(resp.headers()["location"]).toContain("/entrar");
});
