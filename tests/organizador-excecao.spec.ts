import { test, expect } from "@playwright/test";
import {
  criarOrganizacao,
  limparOrganizacoes,
  prisma,
  type OrgDeTeste,
} from "./fixtures";
import {
  proximasDatas,
  montarOcorrencias,
  dataISOBrasilia,
  isoParaDataBanco,
  cancelarOcorrencia,
  alterarLocalOcorrencia,
  desfazerExcecao,
  proximasDaComunidade,
} from "@/lib/ocorrencias";

/**
 * FRENTE 1 — EXCEÇÃO DE OCORRÊNCIA (PR2): a "sexta chuvosa".
 *
 * O que os testes provam:
 *  1. `proximasDatas` puro: gera o dia certo (Brasília), pula pro próximo quando
 *     a hora de hoje já passou, espaça de 7 em 7, e a hora sai no fuso certo.
 *  2. `montarOcorrencias` aplica a exceção: cancela, troca local, muda a hora.
 *  3. CRUD owner-scoped: SÓ o dono cancela/altera/desfaz; não-dono barrado
 *     (`nao-dono`) sem criar nada; cancelar é idempotente (upsert).
 */

// Terça, 01/09/2026, 10:00 em Brasília (offset fixo −03:00).
const AGORA = new Date("2026-09-01T10:00:00-03:00");
const DOW_AGORA = new Date(AGORA.getTime() - 3 * 3600 * 1000).getUTCDay();

// ─── 1. proximasDatas (puro) ─────────────────────────────────────────────

test.describe("proximasDatas — geração pura", () => {
  test("hoje, com a hora ainda por vir: a primeira é hoje", () => {
    const [d] = proximasDatas(DOW_AGORA, 23 * 60, AGORA, 1); // 23:00 > 10:00
    expect(dataISOBrasilia(d)).toBe("2026-09-01");
  });

  test("hoje, mas a hora já passou: pula pra semana que vem", () => {
    const [d] = proximasDatas(DOW_AGORA, 8 * 60, AGORA, 1); // 08:00 < 10:00
    expect(dataISOBrasilia(d)).toBe("2026-09-08"); // +7 dias
  });

  test("espaça de 7 em 7 e mantém o dia da semana", () => {
    const datas = proximasDatas(DOW_AGORA, 8 * 60, AGORA, 3);
    expect(datas.map(dataISOBrasilia)).toEqual([
      "2026-09-08",
      "2026-09-15",
      "2026-09-22",
    ]);
  });

  test("a hora sai no fuso de Brasília (06:15 → 09:15 UTC)", () => {
    const [d] = proximasDatas(DOW_AGORA, 375, AGORA, 1); // 06:15
    expect(d.getUTCHours()).toBe(9);
    expect(d.getUTCMinutes()).toBe(15);
  });
});

// ─── 2. montarOcorrencias (puro) ─────────────────────────────────────────

test.describe("montarOcorrencias — aplica exceções", () => {
  const horario = { id: "h1", diaSemana: DOW_AGORA, minutoInicio: 375 };
  const primeiraISO = dataISOBrasilia(proximasDatas(DOW_AGORA, 375, AGORA, 1)[0]);

  test("sem exceção: ocorrência normal", () => {
    const [o] = montarOcorrencias([horario], [], AGORA, 1);
    expect(o.cancelada).toBe(false);
    expect(o.horaInicio).toBe("06:15");
    expect(o.excecaoId).toBeNull();
  });

  test("exceção cancelada: marca cancelada e traz o excecaoId", () => {
    const ex = {
      id: "e1",
      horarioRecorrenteId: "h1",
      data: isoParaDataBanco(primeiraISO)!,
      cancelada: true,
      localAlterado: null,
      minutoInicioAlterado: null,
      observacao: "chuva",
    };
    const [o] = montarOcorrencias([horario], [ex], AGORA, 1);
    expect(o.cancelada).toBe(true);
    expect(o.excecaoId).toBe("e1");
    expect(o.observacao).toBe("chuva");
  });

  test("exceção de local: mostra o local alterado, sem cancelar", () => {
    const ex = {
      id: "e2",
      horarioRecorrenteId: "h1",
      data: isoParaDataBanco(primeiraISO)!,
      cancelada: false,
      localAlterado: "Portão 3",
      minutoInicioAlterado: null,
      observacao: null,
    };
    const [o] = montarOcorrencias([horario], [ex], AGORA, 1);
    expect(o.cancelada).toBe(false);
    expect(o.localAlterado).toBe("Portão 3");
  });

  test("exceção de hora: a hora efetiva muda", () => {
    const ex = {
      id: "e3",
      horarioRecorrenteId: "h1",
      data: isoParaDataBanco(primeiraISO)!,
      cancelada: false,
      localAlterado: null,
      minutoInicioAlterado: 7 * 60, // 07:00
      observacao: null,
    };
    const [o] = montarOcorrencias([horario], [ex], AGORA, 1);
    expect(o.horaInicio).toBe("07:00");
    expect(o.inicio.getUTCHours()).toBe(10); // 07:00 Brasília = 10:00 UTC
  });
});

// ─── 3. CRUD owner-scoped (com banco) ────────────────────────────────────

test.describe("exceção — só o dono edita (contenção)", () => {
  let A: OrgDeTeste;
  let B: OrgDeTeste;
  let horarioId: string;
  let dataISO: string;

  test.beforeAll(async () => {
    await limparOrganizacoes();
    A = await criarOrganizacao("excA");
    B = await criarOrganizacao("excB");
    const h = await prisma.horarioRecorrente.create({
      data: { communityId: A.communityId, diaSemana: 2, minutoInicio: 375 },
    });
    horarioId = h.id;
    const proximas = (await proximasDaComunidade(A.userId, A.communitySlug))!;
    dataISO = proximas[0].dataISO;
  });
  test.afterAll(async () => {
    await limparOrganizacoes();
    await prisma.$disconnect();
  });

  test("o DONO cancela um dia e a ocorrência vira cancelada", async () => {
    const r = await cancelarOcorrencia(A.userId, A.communitySlug, horarioId, dataISO, "chuva");
    expect(r.ok).toBe(true);
    const proximas = (await proximasDaComunidade(A.userId, A.communitySlug))!;
    const alvo = proximas.find((o) => o.dataISO === dataISO);
    expect(alvo?.cancelada).toBe(true);
    expect(alvo?.excecaoId).toBeTruthy();
  });

  test("cancelar de novo é idempotente (um registro só)", async () => {
    await cancelarOcorrencia(A.userId, A.communitySlug, horarioId, dataISO);
    const n = await prisma.excecaoHorario.count({ where: { horarioRecorrenteId: horarioId } });
    expect(n).toBe(1);
  });

  test("NÃO-dono é barrado e não cria exceção", async () => {
    const outraData = (await proximasDaComunidade(A.userId, A.communitySlug))!.find(
      (o) => o.dataISO !== dataISO,
    )!.dataISO;
    const antes = await prisma.excecaoHorario.count({ where: { horarioRecorrenteId: horarioId } });
    const r = await cancelarOcorrencia(B.userId, A.communitySlug, horarioId, outraData);
    expect(r).toMatchObject({ ok: false, motivo: "nao-dono" });
    const depois = await prisma.excecaoHorario.count({ where: { horarioRecorrenteId: horarioId } });
    expect(depois).toBe(antes); // nada criado
  });

  test("data inválida é invalido (não 500)", async () => {
    const r = await cancelarOcorrencia(A.userId, A.communitySlug, horarioId, "não-é-data");
    expect(r).toMatchObject({ ok: false, motivo: "invalido" });
  });

  test("alterar local não cancela; desfazer volta ao normal; não-dono não desfaz", async () => {
    const data2 = (await proximasDaComunidade(A.userId, A.communitySlug))!.find(
      (o) => !o.cancelada,
    )!.dataISO;
    const r = await alterarLocalOcorrencia(A.userId, A.communitySlug, horarioId, data2, "Portão 3");
    expect(r.ok).toBe(true);
    let alvo = (await proximasDaComunidade(A.userId, A.communitySlug))!.find(
      (o) => o.dataISO === data2,
    );
    expect(alvo?.cancelada).toBe(false);
    expect(alvo?.localAlterado).toBe("Portão 3");

    const excecaoId = alvo!.excecaoId!;
    // não-dono não desfaz
    expect(await desfazerExcecao(B.userId, A.communitySlug, excecaoId)).toMatchObject({
      ok: false,
      motivo: "nao-dono",
    });
    // dono desfaz
    expect((await desfazerExcecao(A.userId, A.communitySlug, excecaoId)).ok).toBe(true);
    alvo = (await proximasDaComunidade(A.userId, A.communitySlug))!.find(
      (o) => o.dataISO === data2,
    );
    expect(alvo?.localAlterado).toBeNull();
    expect(alvo?.excecaoId).toBeNull();
  });
});
