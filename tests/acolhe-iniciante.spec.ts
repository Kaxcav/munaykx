import { test, expect } from "@playwright/test";
import {
  PREFIXO,
  criarOrganizacao,
  limparFixtures,
  limparOrganizacoes,
  prisma,
  type OrgDeTeste,
} from "./fixtures";
import { editarComunidade } from "@/lib/painel";
import { getCommunities } from "@/lib/communities";

/**
 * SINAL "ACOLHE INICIANTE" — o organizador liga um boolean explícito, o selo
 * aparece e o filtro `/comunidades?iniciantes=1` traz só as marcadas E reais.
 *
 * O que os testes contêm: (1) SÓ o dono liga o sinal; não-dono é barrado
 * (`nao-dono`, nunca 403 — 403 vaza existência) e não toca a comunidade alheia;
 * (2) o filtro é grounded — demo fora, não-marcada fora; (3) o selo renderiza
 * na descoberta quando ligado.
 */

const entrada = {
  descricao: "desc",
  horarios: "SEG 07h",
  local: "Parque",
  nivel: "Todos",
  ativo: true,
  acolheIniciante: true,
};

test.describe("acolhe iniciante — só o dono edita (contenção)", () => {
  let A: OrgDeTeste;
  let B: OrgDeTeste;

  test.beforeAll(async () => {
    await limparOrganizacoes();
    A = await criarOrganizacao("acolheA");
    B = await criarOrganizacao("acolheB");
  });
  test.afterAll(async () => {
    await limparOrganizacoes();
    await prisma.$disconnect();
  });

  test("o DONO liga o sinal e persiste", async () => {
    const r = await editarComunidade(A.userId, A.communitySlug, entrada);
    expect(r.ok).toBe(true);
    const c = await prisma.community.findUnique({ where: { id: A.communityId } });
    expect(c?.acolheIniciante).toBe(true);
  });

  test("NÃO-dono é barrado (nao-dono) e não altera a comunidade alheia", async () => {
    await prisma.community.update({
      where: { id: A.communityId },
      data: { acolheIniciante: false },
    });
    const r = await editarComunidade(B.userId, A.communitySlug, entrada);
    expect(r).toMatchObject({ ok: false, motivo: "nao-dono" });
    const c = await prisma.community.findUnique({ where: { id: A.communityId } });
    expect(c?.acolheIniciante).toBe(false); // intocado
  });
});

test.describe("acolhe iniciante — filtro grounded", () => {
  const base = { modalidade: "Corrida", regiao: "Plano Piloto" }; // city default = Brasília

  test.beforeAll(async () => {
    await limparFixtures();
    await prisma.community.createMany({
      data: [
        { slug: `${PREFIXO}real-marcada`, nome: "Real marcada", ...base, demo: false, acolheIniciante: true },
        { slug: `${PREFIXO}demo-marcada`, nome: "Demo marcada", ...base, demo: true, acolheIniciante: true },
        { slug: `${PREFIXO}real-nao`, nome: "Real nao", ...base, demo: false, acolheIniciante: false },
      ],
    });
  });
  test.afterAll(async () => {
    await limparFixtures();
    await prisma.$disconnect();
  });

  test("o filtro traz SÓ as marcadas E reais (demo fora, não-marcada fora)", async () => {
    const slugs = (await getCommunities({ acolheIniciante: true })).map((c) => c.slug);
    expect(slugs).toContain(`${PREFIXO}real-marcada`);
    expect(slugs).not.toContain(`${PREFIXO}demo-marcada`); // demo fora do índice
    expect(slugs).not.toContain(`${PREFIXO}real-nao`); // não marcada fora
  });

  test("sem o filtro, a listagem base não muda (não quebrei nada)", async () => {
    const slugs = (await getCommunities()).map((c) => c.slug);
    expect(slugs).toContain(`${PREFIXO}real-nao`); // não-marcada real segue aparecendo
    expect(slugs).toContain(`${PREFIXO}real-marcada`);
  });
});

test.describe("acolhe iniciante — selo na descoberta (e2e)", () => {
  test.beforeAll(async () => {
    await limparFixtures();
    await prisma.community.createMany({
      data: [
        { slug: `${PREFIXO}selo-sim`, nome: "Comunidade Zzt Selo Sim", modalidade: "Corrida", regiao: "Asa Sul", demo: false, acolheIniciante: true },
        { slug: `${PREFIXO}selo-nao`, nome: "Comunidade Zzt Selo Nao", modalidade: "Corrida", regiao: "Asa Sul", demo: false, acolheIniciante: false },
      ],
    });
  });
  test.afterAll(async () => {
    await limparFixtures();
    await prisma.$disconnect();
  });

  test("com iniciantes=1: selo visível, marcada aparece, não-marcada some", async ({ page }) => {
    await page.goto("/comunidades?iniciantes=1");
    await expect(page.getByText("Comunidade Zzt Selo Sim")).toBeVisible();
    await expect(page.getByText("Acolhe iniciantes").first()).toBeVisible();
    await expect(page.getByText("Comunidade Zzt Selo Nao")).toHaveCount(0);
  });

  test("sem o filtro: o toggle 'acolhem iniciantes' está na página", async ({ page }) => {
    await page.goto("/comunidades");
    await expect(page.getByText("Só as que acolhem iniciantes")).toBeVisible();
  });
});
