import { test, expect } from "@playwright/test";
import {
  PREFIXO,
  criarOrganizacao,
  limparOrganizacoes,
  prisma,
  type OrgDeTeste,
} from "./fixtures";
import { criarEvento } from "@/lib/painel";
import { formatDatetimeLocal } from "@/lib/admin";
import { estaSemana, linkMarcarTreino, tituloSugerido } from "@/lib/painel-hoje";
import { isoParaDataBanco } from "@/lib/ocorrencias";

/**
 * FRENTE 1 — HOJE / ESTA SEMANA (PR3): a home por frequência de uso.
 *
 * O que os testes provam:
 *  1. `linkMarcarTreino` puro: monta o link pré-preenchido certo.
 *  2. `estaSemana`: ocorrência da grade entra; depois de virar evento
 *     (`horarioRecorrenteId` + data) some da lista (dedup) e aparece como
 *     evento; ocorrência cancelada não entra; conta confirmados/fila/1ª vez;
 *     é owner-scoped (a comunidade do outro não aparece).
 *  3. `criarEvento` grava o `horarioRecorrenteId` e recusa grade de outra
 *     comunidade (vira null, não vínculo forjado).
 */

// Terça, 01/09/2026, 09:00 em Brasília.
const AGORA = new Date("2026-09-01T09:00:00-03:00");

// ─── 1. linkMarcarTreino (puro) ──────────────────────────────────────────

test.describe("linkMarcarTreino — pré-preenchimento", () => {
  const item = {
    tipo: "grade" as const,
    comunidadeSlug: "run-asa-sul",
    comunidadeNome: "Run Asa Sul",
    comunidadeLocal: "Parque da Cidade",
    modalidade: "Corrida",
    horarioId: "h-123",
    dataISO: "2026-09-03",
    inicio: new Date("2026-09-03T06:15:00-03:00"),
    horaInicio: "06:15",
    diaSemanaRotulo: "Quinta",
    localAlterado: null,
  };

  test("monta o link com comunidade, título, horarioId e local padrão", () => {
    const url = new URL(`https://x${linkMarcarTreino(item)}`);
    expect(url.searchParams.get("comunidade")).toBe("run-asa-sul");
    expect(url.searchParams.get("titulo")).toBe(tituloSugerido(item));
    expect(url.searchParams.get("horarioId")).toBe("h-123");
    expect(url.searchParams.get("local")).toBe("Parque da Cidade");
    expect(url.searchParams.get("startsAt")).toBe(formatDatetimeLocal(item.inicio));
  });

  test("local alterado do dia vence o local padrão da comunidade", () => {
    const url = new URL(`https://x${linkMarcarTreino({ ...item, localAlterado: "Portão 3" })}`);
    expect(url.searchParams.get("local")).toBe("Portão 3");
  });
});

// ─── 2. estaSemana (com banco, owner-scoped) ─────────────────────────────

test.describe("estaSemana — linha do tempo do organizador", () => {
  let A: OrgDeTeste;
  let B: OrgDeTeste;
  let horarioId: string;

  test.beforeAll(async () => {
    await limparOrganizacoes();
    A = await criarOrganizacao("hojeA");
    B = await criarOrganizacao("hojeB");
    const h = await prisma.horarioRecorrente.create({
      data: { communityId: A.communityId, diaSemana: 4, minutoInicio: 375 }, // quinta 06:15
    });
    horarioId = h.id;
  });
  test.afterAll(async () => {
    await limparOrganizacoes();
    await prisma.$disconnect();
  });

  test("a ocorrência da grade entra na linha do tempo", async () => {
    const itens = await estaSemana(A.userId, AGORA);
    const grade = itens.find((i) => i.tipo === "grade" && i.horarioId === horarioId);
    expect(grade).toBeTruthy();
    expect(grade?.tipo === "grade" && grade.comunidadeSlug).toBe(A.communitySlug);
  });

  test("owner-scoped: a comunidade do outro NÃO aparece", async () => {
    const itens = await estaSemana(B.userId, AGORA);
    // B não tem grade nem evento futuro (o do fixture é passado vs AGORA).
    expect(itens.every((i) => i.tipo !== "grade")).toBe(true);
  });

  test("virou evento (marcar treino): some da grade, entra como evento (dedup)", async () => {
    // pega a 1ª ocorrência da grade
    const antes = await estaSemana(A.userId, AGORA);
    const occ = antes.find((i) => i.tipo === "grade" && i.horarioId === horarioId);
    if (!occ || occ.tipo !== "grade") throw new Error("sem ocorrência pra materializar");
    const dataISO = occ.dataISO;

    const r = await criarEvento(A.userId, {
      communityId: A.communityId,
      titulo: "Treino de quinta",
      slug: `${PREFIXO}treino-quinta`,
      startsAt: formatDatetimeLocal(occ.inicio),
      city: "Brasília",
      local: "Parque da Cidade",
      capacidade: "",
      duracaoMin: "60",
      horarioRecorrenteId: horarioId,
      gratuito: true,
      demo: false,
      ativo: true,
    });
    expect(r.ok).toBe(true);

    // guarda o vínculo
    const ev = await prisma.event.findFirst({ where: { slug: `${PREFIXO}treino-quinta` } });
    expect(ev?.horarioRecorrenteId).toBe(horarioId);

    const depois = await estaSemana(A.userId, AGORA);
    // a grade daquela data sumiu…
    const gradeNaData = depois.find(
      (i) => i.tipo === "grade" && i.horarioId === horarioId && i.dataISO === dataISO,
    );
    expect(gradeNaData).toBeUndefined();
    // …e virou evento
    const evItem = depois.find((i) => i.tipo === "evento" && i.slug === `${PREFIXO}treino-quinta`);
    expect(evItem).toBeTruthy();
  });

  test("conta confirmados, fila e de 1ª vez", async () => {
    const ev = await prisma.event.findFirst({ where: { slug: `${PREFIXO}treino-quinta` } });
    // 1 veterano (já teve checkin na comunidade, noutro evento) + 1 estreante
    const outroEvento = await prisma.event.create({
      data: {
        communityId: A.communityId,
        slug: `${PREFIXO}passado`,
        titulo: "passado",
        startsAt: new Date("2026-08-01T09:00:00Z"),
      },
    });
    await prisma.rsvp.create({
      data: { eventId: outroEvento.id, nome: "Vet", email: `${PREFIXO}vet@x.com`, checkinEm: new Date() },
    });
    await prisma.rsvp.createMany({
      data: [
        { eventId: ev!.id, nome: "Vet", email: `${PREFIXO}vet@x.com`, status: "confirmado" },
        { eventId: ev!.id, nome: "Novato", email: `${PREFIXO}novo@x.com`, status: "confirmado" },
        { eventId: ev!.id, nome: "Fila", email: `${PREFIXO}fila@x.com`, status: "lista_espera" },
      ],
    });

    const itens = await estaSemana(A.userId, AGORA);
    const evItem = itens.find((i) => i.tipo === "evento" && i.slug === `${PREFIXO}treino-quinta`);
    expect(evItem?.tipo === "evento" && evItem.confirmados).toBe(2);
    expect(evItem?.tipo === "evento" && evItem.fila).toBe(1);
    // só o novato é de 1ª vez (o vet já tinha checkin na comunidade)
    expect(evItem?.tipo === "evento" && evItem.primeiraVez).toBe(1);
  });

  test("ocorrência cancelada não entra na linha do tempo", async () => {
    // cancela a próxima ocorrência ainda em grade (uma futura, não a materializada)
    const itens = await estaSemana(A.userId, AGORA);
    const grade = itens.find((i) => i.tipo === "grade" && i.horarioId === horarioId);
    if (!grade || grade.tipo !== "grade") throw new Error("sem grade futura pra cancelar");
    await prisma.excecaoHorario.create({
      data: {
        horarioRecorrenteId: horarioId,
        data: isoParaDataBanco(grade.dataISO)!,
        cancelada: true,
      },
    });
    const depois = await estaSemana(A.userId, AGORA);
    const aindaLa = depois.find(
      (i) => i.tipo === "grade" && i.dataISO === grade.dataISO,
    );
    expect(aindaLa).toBeUndefined();
  });
});

// ─── 3. criarEvento — vínculo com a grade ────────────────────────────────

test.describe("criarEvento — vínculo com a grade", () => {
  let A: OrgDeTeste;
  let B: OrgDeTeste;

  test.beforeAll(async () => {
    await limparOrganizacoes();
    A = await criarOrganizacao("vincA");
    B = await criarOrganizacao("vincB");
  });
  test.afterAll(async () => {
    await limparOrganizacoes();
    await prisma.$disconnect();
  });

  test("grade de OUTRA comunidade é ignorada (vira null, não vínculo forjado)", async () => {
    // grade de B
    const gradeB = await prisma.horarioRecorrente.create({
      data: { communityId: B.communityId, diaSemana: 3, minutoInicio: 375 },
    });
    // A cria evento tentando linkar a grade de B
    const r = await criarEvento(A.userId, {
      communityId: A.communityId,
      titulo: "Tentativa",
      slug: `${PREFIXO}vinc-forjado`,
      startsAt: "2026-09-10T06:15",
      city: "Brasília",
      local: "x",
      capacidade: "",
      duracaoMin: "",
      horarioRecorrenteId: gradeB.id, // grade de OUTRA comunidade
      gratuito: true,
      demo: false,
      ativo: true,
    });
    expect(r.ok).toBe(true);
    const ev = await prisma.event.findFirst({ where: { slug: `${PREFIXO}vinc-forjado` } });
    expect(ev?.horarioRecorrenteId).toBeNull(); // vínculo forjado recusado
  });
});
