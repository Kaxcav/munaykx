import { test, expect } from "@playwright/test";
import {
  PREFIXO,
  criarOrganizacao,
  limparOrganizacoes,
  limparFixtures,
  prisma,
  type OrgDeTeste,
} from "./fixtures";
import { criarEvento, editarEvento } from "@/lib/painel";
import { textoCompartilharEvento } from "@/lib/compartilhar";

/**
 * FRENTE 1 — MODO ROTA (evento): pedal/corrida/trilha com SAÍDA e CHEGADA.
 *
 * CRÍTICO: rota é TEXTO (origem/destino), nunca coordenada/geojson/linha no
 * mapa. O que os testes provam:
 *  1. criarEvento no modo rota grava origem/destino/percurso e ANULA `local`;
 *     fora do modo rota, grava `local` e anula os campos de rota.
 *  2. modo rota SEM saída/chegada é `invalido` (não meio-trajeto).
 *  3. editar liga e desliga o modo rota trocando os campos, sem deixar resíduo.
 *  4. owner-scoped: não-dono não edita.
 *  5. página pública mostra Saída/Chegada (rota) ou Onde (local).
 *  6. texto do WhatsApp usa a saída no modo rota (puro).
 */

const baseEvento = (slug: string, over: Record<string, unknown> = {}) => ({
  communityId: "",
  titulo: "Pedal de domingo",
  slug,
  startsAt: "2026-09-06T06:00",
  city: "Brasília",
  local: "",
  capacidade: "",
  duracaoMin: "",
  gratuito: true,
  demo: false,
  ativo: true,
  modoRota: false,
  origem: "",
  destino: "",
  percursoObs: "",
  ...over,
});

test.describe("modo rota — escrita owner-scoped", () => {
  let A: OrgDeTeste;
  let B: OrgDeTeste;

  test.beforeAll(async () => {
    await limparOrganizacoes();
    A = await criarOrganizacao("rotaA");
    B = await criarOrganizacao("rotaB");
  });
  test.afterAll(async () => {
    await limparOrganizacoes();
    await prisma.$disconnect();
  });

  test("modo rota grava origem/destino/percurso e ANULA o local", async () => {
    const r = await criarEvento(
      A.userId,
      baseEvento(`${PREFIXO}rota-liga`, {
        communityId: A.communityId,
        local: "isto deve sumir",
        modoRota: true,
        origem: "Portão do Parque da Cidade",
        destino: "Torre de TV",
        percursoObs: "~8 km pela orla",
      }),
    );
    expect(r.ok).toBe(true);
    const ev = await prisma.event.findFirst({ where: { slug: `${PREFIXO}rota-liga` } });
    expect(ev?.modoRota).toBe(true);
    expect(ev?.origem).toBe("Portão do Parque da Cidade");
    expect(ev?.destino).toBe("Torre de TV");
    expect(ev?.percursoObs).toBe("~8 km pela orla");
    expect(ev?.local).toBeNull(); // local não coexiste com rota
  });

  test("sem modo rota grava o local e anula os campos de rota", async () => {
    const r = await criarEvento(
      A.userId,
      baseEvento(`${PREFIXO}rota-off`, {
        communityId: A.communityId,
        local: "Quadra central",
        modoRota: false,
        origem: "não deve gravar",
      }),
    );
    expect(r.ok).toBe(true);
    const ev = await prisma.event.findFirst({ where: { slug: `${PREFIXO}rota-off` } });
    expect(ev?.modoRota).toBe(false);
    expect(ev?.local).toBe("Quadra central");
    expect(ev?.origem).toBeNull();
    expect(ev?.destino).toBeNull();
  });

  test("modo rota SEM saída/chegada é invalido", async () => {
    const semSaida = await criarEvento(
      A.userId,
      baseEvento(`${PREFIXO}rota-incompleta`, {
        communityId: A.communityId,
        modoRota: true,
        origem: "",
        destino: "Torre",
      }),
    );
    expect(semSaida).toMatchObject({ ok: false, motivo: "invalido" });
    const nada = await prisma.event.findFirst({ where: { slug: `${PREFIXO}rota-incompleta` } });
    expect(nada).toBeNull();
  });

  test("editar liga e desliga o modo rota sem deixar resíduo", async () => {
    const criado = await criarEvento(
      A.userId,
      baseEvento(`${PREFIXO}rota-edit`, {
        communityId: A.communityId,
        local: "Local inicial",
      }),
    );
    expect(criado.ok).toBe(true);
    const ev = await prisma.event.findFirst({ where: { slug: `${PREFIXO}rota-edit` } });

    // liga rota
    await editarEvento(
      A.userId,
      ev!.id,
      baseEvento(`${PREFIXO}rota-edit`, {
        communityId: A.communityId,
        modoRota: true,
        origem: "Saída A",
        destino: "Chegada B",
      }),
    );
    let dep = await prisma.event.findFirst({ where: { slug: `${PREFIXO}rota-edit` } });
    expect(dep?.modoRota).toBe(true);
    expect(dep?.local).toBeNull();
    expect(dep?.origem).toBe("Saída A");

    // desliga rota
    await editarEvento(
      A.userId,
      ev!.id,
      baseEvento(`${PREFIXO}rota-edit`, {
        communityId: A.communityId,
        local: "De volta ao local",
        modoRota: false,
      }),
    );
    dep = await prisma.event.findFirst({ where: { slug: `${PREFIXO}rota-edit` } });
    expect(dep?.modoRota).toBe(false);
    expect(dep?.local).toBe("De volta ao local");
    expect(dep?.origem).toBeNull(); // resíduo limpo
    expect(dep?.destino).toBeNull();
  });

  test("não-dono não edita (nao-dono)", async () => {
    const ev = await prisma.event.findFirst({ where: { slug: `${PREFIXO}rota-off` } });
    const r = await editarEvento(
      B.userId,
      ev!.id,
      baseEvento(`${PREFIXO}rota-off`, { communityId: A.communityId, modoRota: true, origem: "x", destino: "y" }),
    );
    expect(r).toMatchObject({ ok: false, motivo: "nao-dono" });
  });
});

test.describe("modo rota — texto do WhatsApp (puro)", () => {
  const startsAt = new Date("2026-09-06T09:00:00Z");
  test("rota usa a saída como ponto de encontro", () => {
    const t = textoCompartilharEvento({
      titulo: "Pedal",
      startsAt,
      local: null,
      modoRota: true,
      origem: "Portão 3",
      community: { regiao: "Plano Piloto" },
    });
    expect(t).toContain("Portão 3");
  });
  test("sem rota usa o local", () => {
    const t = textoCompartilharEvento({
      titulo: "Treino",
      startsAt,
      local: "Quadra 2",
      community: { regiao: "Plano Piloto" },
    });
    expect(t).toContain("Quadra 2");
  });
});

test.describe("modo rota — página pública (e2e)", () => {
  test.beforeAll(async () => {
    await limparFixtures();
    const com = await prisma.community.create({
      data: {
        slug: `${PREFIXO}rota-com`,
        nome: "Comunidade Zzt Rota",
        modalidade: "Pedal",
        regiao: "Plano Piloto",
        demo: false,
      },
    });
    await prisma.event.create({
      data: {
        communityId: com.id,
        slug: `${PREFIXO}ev-rota`,
        titulo: "Pedal Zzt",
        startsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        modoRota: true,
        origem: "Saída Zzt Portão 3",
        destino: "Chegada Zzt Torre",
        percursoObs: "8 km Zzt",
      },
    });
    await prisma.event.create({
      data: {
        communityId: com.id,
        slug: `${PREFIXO}ev-local`,
        titulo: "Treino Zzt",
        startsAt: new Date(Date.now() + 6 * 24 * 3600 * 1000),
        local: "Quadra Zzt Central",
      },
    });
  });
  test.afterAll(async () => {
    await limparFixtures();
    await prisma.$disconnect();
  });

  test("evento rota mostra Saída e Chegada, não 'Onde'", async ({ page }) => {
    await page.goto(`/eventos/${PREFIXO}ev-rota`);
    await expect(page.getByText("Saída Zzt Portão 3")).toBeVisible();
    await expect(page.getByText("Chegada Zzt Torre")).toBeVisible();
    await expect(page.getByText("8 km Zzt")).toBeVisible();
  });

  test("evento de local único mostra 'Onde', não rota", async ({ page }) => {
    await page.goto(`/eventos/${PREFIXO}ev-local`);
    await expect(page.getByText("Quadra Zzt Central")).toBeVisible();
    await expect(page.getByText("Saída Zzt")).toHaveCount(0);
  });
});
