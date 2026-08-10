import { test, expect } from "@playwright/test";
import {
  PREFIXO,
  criarOrganizacao,
  limparFixtures,
  limparOrganizacoes,
  prisma,
  type OrgDeTeste,
} from "./fixtures";
import { editarComunidade, criarEvento, editarEvento } from "@/lib/painel";
import { parseDataBrasilia } from "@/lib/admin";
import { normalizarGuia, lerGuia, temGuia } from "@/lib/guia";

/**
 * FRENTE 1 — FUNDAÇÕES (PR1): duração de evento + guia de primeira vez.
 *
 * Aditivo e decision-free. O que os testes provam:
 *  1. `normalizarGuia`/`lerGuia` puros: vazio → null (não `{}`), descartam lixo.
 *  2. Guia é owner-scoped: SÓ o dono grava; não-dono barrado (`nao-dono`, nunca
 *     403) e a comunidade alheia fica intocada; campo grande é `invalido`.
 *  3. Duração vira `terminaEm = início + duração`; sem duração → `terminaEm`
 *     nulo; editar recompõe do início novo.
 *  4. O guia aparece na página pública SÓ quando acolhe iniciante E tem conteúdo.
 */

// ─── 1. Puros (sem banco) ────────────────────────────────────────────────

test.describe("guia — normalização pura", () => {
  test("vazio e só-brancos viram null (não guardam {} que finge conteúdo)", () => {
    expect(normalizarGuia({})).toBeNull();
    expect(normalizarGuia(undefined)).toBeNull();
    expect(
      normalizarGuia({ pontoEncontro: "   ", oQueLevar: "", quemProcurar: "" }),
    ).toBeNull();
  });

  test("mantém só os campos preenchidos, aparados", () => {
    const g = normalizarGuia({ pontoEncontro: "  Portão 3 ", observacao: "chega cedo" });
    expect(g).toEqual({ pontoEncontro: "Portão 3", observacao: "chega cedo" });
  });

  test("lerGuia descarta chave estranha e valor não-string", () => {
    const g = lerGuia({ pontoEncontro: "ok", lixo: 42, quemProcurar: { x: 1 } });
    expect(g).toEqual({ pontoEncontro: "ok" });
    expect(temGuia(g)).toBe(true);
    expect(temGuia(lerGuia(null))).toBe(false);
  });
});

// ─── 2. Guia owner-scoped ────────────────────────────────────────────────

test.describe("guia — só o dono edita (contenção)", () => {
  let A: OrgDeTeste;
  let B: OrgDeTeste;

  const comGuia = {
    descricao: "desc",
    horarios: "SEG 07h",
    local: "Parque",
    nivel: "Todos",
    ativo: true,
    acolheIniciante: true,
    guiaIniciante: { pontoEncontro: "Portão 3", quemProcurar: "Procure a Ana" },
  };

  test.beforeAll(async () => {
    await limparOrganizacoes();
    A = await criarOrganizacao("guiaA");
    B = await criarOrganizacao("guiaB");
  });
  test.afterAll(async () => {
    await limparOrganizacoes();
    await prisma.$disconnect();
  });

  test("o DONO grava o guia e ele volta legível", async () => {
    const r = await editarComunidade(A.userId, A.communitySlug, comGuia);
    expect(r.ok).toBe(true);
    const c = await prisma.community.findUnique({ where: { id: A.communityId } });
    expect(lerGuia(c?.guiaIniciante)).toEqual({
      pontoEncontro: "Portão 3",
      quemProcurar: "Procure a Ana",
    });
  });

  test("guia todo vazio apaga a coluna (vira NULL, não {})", async () => {
    await editarComunidade(A.userId, A.communitySlug, comGuia); // garante conteúdo
    const r = await editarComunidade(A.userId, A.communitySlug, {
      ...comGuia,
      guiaIniciante: { pontoEncontro: "", oQueLevar: "", quemProcurar: "", observacao: "" },
    });
    expect(r.ok).toBe(true);
    const c = await prisma.community.findUnique({ where: { id: A.communityId } });
    expect(c?.guiaIniciante).toBeNull();
  });

  test("NÃO-dono é barrado e não toca o guia alheio", async () => {
    await editarComunidade(A.userId, A.communitySlug, comGuia); // A tem guia
    const r = await editarComunidade(B.userId, A.communitySlug, {
      ...comGuia,
      guiaIniciante: { pontoEncontro: "invasão" },
    });
    expect(r).toMatchObject({ ok: false, motivo: "nao-dono" });
    const c = await prisma.community.findUnique({ where: { id: A.communityId } });
    expect(lerGuia(c?.guiaIniciante).pontoEncontro).toBe("Portão 3"); // intocado
  });

  test("campo grande demais é invalido (erro amigável, não 500)", async () => {
    const r = await editarComunidade(A.userId, A.communitySlug, {
      ...comGuia,
      guiaIniciante: { pontoEncontro: "x".repeat(201) },
    });
    expect(r).toMatchObject({ ok: false, motivo: "invalido" });
  });
});

// ─── 3. Duração → terminaEm ──────────────────────────────────────────────

test.describe("duração do evento → terminaEm", () => {
  let A: OrgDeTeste;

  const baseEvento = (slug: string) => ({
    communityId: "", // preenchido no teste
    titulo: "Treino teste",
    slug,
    startsAt: "2026-09-01T06:00",
    city: "Brasília",
    local: "Parque da Cidade",
    capacidade: "",
    gratuito: true,
    demo: false,
    ativo: true,
  });

  test.beforeAll(async () => {
    await limparOrganizacoes();
    A = await criarOrganizacao("duracaoA");
  });
  test.afterAll(async () => {
    await limparOrganizacoes();
    await prisma.$disconnect();
  });

  test("com duração: terminaEm = início + duração", async () => {
    const r = await criarEvento(A.userId, {
      ...baseEvento(`${PREFIXO}dur-com`),
      communityId: A.communityId,
      duracaoMin: "90",
    });
    expect(r.ok).toBe(true);
    const ev = await prisma.event.findFirst({ where: { slug: `${PREFIXO}dur-com` } });
    const inicio = parseDataBrasilia("2026-09-01T06:00")!;
    expect(ev?.terminaEm?.getTime()).toBe(inicio.getTime() + 90 * 60_000);
  });

  test("sem duração: terminaEm fica nulo (cai na duração padrão no mapa)", async () => {
    const r = await criarEvento(A.userId, {
      ...baseEvento(`${PREFIXO}dur-sem`),
      communityId: A.communityId,
      duracaoMin: "",
    });
    expect(r.ok).toBe(true);
    const ev = await prisma.event.findFirst({ where: { slug: `${PREFIXO}dur-sem` } });
    expect(ev?.terminaEm).toBeNull();
  });

  test("editar recompõe terminaEm a partir do início novo (sem drift)", async () => {
    const criado = await criarEvento(A.userId, {
      ...baseEvento(`${PREFIXO}dur-edit`),
      communityId: A.communityId,
      duracaoMin: "60",
    });
    expect(criado.ok).toBe(true);
    const ev = await prisma.event.findFirst({ where: { slug: `${PREFIXO}dur-edit` } });

    const r = await editarEvento(A.userId, ev!.id, {
      ...baseEvento(`${PREFIXO}dur-edit`),
      communityId: A.communityId,
      startsAt: "2026-09-02T20:00", // outro dia/hora
      duracaoMin: "60",
    });
    expect(r.ok).toBe(true);
    const dep = await prisma.event.findFirst({ where: { slug: `${PREFIXO}dur-edit` } });
    const novoInicio = parseDataBrasilia("2026-09-02T20:00")!;
    expect(dep?.startsAt.getTime()).toBe(novoInicio.getTime());
    expect(dep?.terminaEm?.getTime()).toBe(novoInicio.getTime() + 60 * 60_000);
  });

  test("não-dono não cria evento na comunidade alheia", async () => {
    const B = await criarOrganizacao("duracaoB");
    const r = await criarEvento(B.userId, {
      ...baseEvento(`${PREFIXO}dur-invasao`),
      communityId: A.communityId, // comunidade de A
      duracaoMin: "60",
    });
    expect(r).toMatchObject({ ok: false, motivo: "nao-dono" });
    const ev = await prisma.event.findFirst({ where: { slug: `${PREFIXO}dur-invasao` } });
    expect(ev).toBeNull();
  });
});

// ─── 4. Exibição pública do guia (e2e) ───────────────────────────────────

test.describe("guia — página pública (e2e)", () => {
  test.beforeAll(async () => {
    await limparFixtures();
    await prisma.community.createMany({
      data: [
        {
          slug: `${PREFIXO}guia-sim`,
          nome: "Comunidade Zzt Guia Sim",
          modalidade: "Corrida",
          regiao: "Asa Sul",
          demo: false,
          acolheIniciante: true,
          guiaIniciante: { pontoEncontro: "Portão 3 do Zzt Parque" },
        },
        {
          slug: `${PREFIXO}guia-oculto`,
          nome: "Comunidade Zzt Guia Oculto",
          modalidade: "Corrida",
          regiao: "Asa Sul",
          demo: false,
          acolheIniciante: false, // guia existe mas NÃO acolhe → não mostra
          guiaIniciante: { pontoEncontro: "Portão secreto Zzt" },
        },
      ],
    });
  });
  test.afterAll(async () => {
    await limparFixtures();
    await prisma.$disconnect();
  });

  test("acolhe + guia: a seção aparece com o conteúdo", async ({ page }) => {
    await page.goto(`/comunidades/${PREFIXO}guia-sim`);
    await expect(page.getByText("É sua primeira vez?")).toBeVisible();
    await expect(page.getByText("Portão 3 do Zzt Parque")).toBeVisible();
  });

  test("guia sem acolher: a seção NÃO aparece", async ({ page }) => {
    await page.goto(`/comunidades/${PREFIXO}guia-oculto`);
    await expect(page.getByText("Portão secreto Zzt")).toHaveCount(0);
    await expect(page.getByText("É sua primeira vez?")).toHaveCount(0);
  });
});
