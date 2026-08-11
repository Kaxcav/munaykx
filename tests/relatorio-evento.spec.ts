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
  metricasDeRsvps,
  classificarPublico,
  relatorioPosEvento,
  type RsvpParaMetrica,
} from "@/lib/relatorio-evento";

/**
 * RELATÓRIO PÓS-EVENTO — o que estes testes prendem:
 *  1. OWNER-SCOPED: A nunca vê o relatório de B (null → 404).
 *  2. AGREGADO: o retorno é só número — nenhum nome/e-mail/WhatsApp escapa.
 *  3. GROUNDED: cada métrica sai do dado real (check-in, status, histórico) —
 *     nada inventado.
 */

// ── PURO: métricas de presença ──────────────────────────────────────────────
test.describe("metricasDeRsvps (puro)", () => {
  const r = (
    status: "confirmado" | "lista_espera",
    checkin: boolean,
    cancelado = false,
  ): RsvpParaMetrica => ({
    status,
    checkinEm: checkin ? new Date() : null,
    canceledAt: cancelado ? new Date() : null,
  });

  test("sem ninguém: tudo zero, taxa e lotação nulas, sem check-in", () => {
    const m = metricasDeRsvps([], null);
    expect(m).toMatchObject({
      confirmados: 0,
      presentes: 0,
      faltas: 0,
      taxaComparecimento: null,
      fila: 0,
      cancelados: 0,
      lotacao: null,
      houveCheckin: false,
    });
  });

  test("presença, faltas e taxa saem do check-in", () => {
    // 4 confirmados (2 presentes), 1 fila, 1 cancelado
    const m = metricasDeRsvps(
      [
        r("confirmado", true),
        r("confirmado", true),
        r("confirmado", false),
        r("confirmado", false),
        r("lista_espera", false),
        r("confirmado", false, true), // cancelado não conta como confirmado
      ],
      10,
    );
    expect(m.confirmados).toBe(4);
    expect(m.presentes).toBe(2);
    expect(m.faltas).toBe(2);
    expect(m.taxaComparecimento).toBeCloseTo(0.5);
    expect(m.fila).toBe(1);
    expect(m.cancelados).toBe(1);
    expect(m.lotacao).toBeCloseTo(0.4);
    expect(m.houveCheckin).toBe(true);
  });

  test("cancelado não vira confirmado nem presente, mesmo com check-in antigo", () => {
    const m = metricasDeRsvps([r("confirmado", true, true)], null);
    expect(m.confirmados).toBe(0);
    expect(m.presentes).toBe(0);
    expect(m.cancelados).toBe(1);
    // check-in existe na linha, mas ela está cancelada → não conta presença ativa
    expect(m.houveCheckin).toBe(true);
  });

  test("capacidade zero ou ausente → lotação nula (nunca divide por zero)", () => {
    expect(metricasDeRsvps([r("confirmado", false)], 0).lotacao).toBeNull();
    expect(metricasDeRsvps([r("confirmado", false)], null).lotacao).toBeNull();
  });
});

// ── PURO: classificação do público ──────────────────────────────────────────
test.describe("classificarPublico (puro)", () => {
  test("novo é quem não está entre os veteranos; case-insensitive", () => {
    const veteranos = new Set(["ana@x.com"]);
    const { novos, retornantes } = classificarPublico(
      ["ANA@x.com", "bruno@x.com", "caio@x.com"],
      veteranos,
    );
    expect(novos).toBe(2); // bruno, caio
    expect(retornantes).toBe(1); // ana (mesmo com caixa diferente)
  });

  test("sem veteranos: todos novos", () => {
    const { novos, retornantes } = classificarPublico(["a@x.com", "b@x.com"], new Set());
    expect(novos).toBe(2);
    expect(retornantes).toBe(0);
  });
});

// ── INTEGRAÇÃO: owner-scope, agregado, grounded ─────────────────────────────
let A: OrgDeTeste;
let B: OrgDeTeste;

async function criarEventoCom(
  communityId: string,
  slug: string,
  startsAt: Date,
  capacidade: number | null,
) {
  return prisma.event.create({
    data: { communityId, slug: `${PREFIXO}${slug}`, titulo: `Evento ${slug}`, startsAt, capacidade, demo: true },
  });
}

/** Comunidade nova dentro da org de A — isola testes sensíveis à ORDEM dos
 *  eventos (público/comparação), que a comunidade compartilhada bagunçaria. */
async function criarComunidade(organizationId: string, slug: string) {
  return prisma.community.create({
    data: {
      organizationId,
      slug: `${PREFIXO}${slug}`,
      nome: `Comunidade ${slug}`,
      modalidade: "Corrida",
      regiao: "Ceilândia",
      demo: true,
    },
  });
}

async function inscrever(
  eventId: string,
  apelido: string,
  opts: { status?: "confirmado" | "lista_espera"; checkin?: boolean; cancelado?: boolean } = {},
) {
  return prisma.rsvp.create({
    data: {
      eventId,
      nome: `Inscrito ${apelido}`,
      email: `${PREFIXO}${apelido}${DOMINIO_TESTE}`,
      status: opts.status ?? "confirmado",
      checkinEm: opts.checkin ? new Date() : null,
      canceledAt: opts.cancelado ? new Date() : null,
    },
  });
}

test.beforeAll(async () => {
  await limparOrganizacoes();
  A = await criarOrganizacao("relA");
  B = await criarOrganizacao("relB");
});

test.afterAll(async () => {
  await limparOrganizacoes();
  await prisma.$disconnect();
});

test("owner-scope: A vê o próprio relatório; o de B devolve null (404, não 403)", async () => {
  const ev = await criarEventoCom(A.communityId, "own", new Date(Date.now() - 86400000), 10);
  expect(await relatorioPosEvento(A.userId, ev.id)).not.toBeNull();
  // B pede o evento de A pelo ID direto → null
  expect(await relatorioPosEvento(B.userId, ev.id)).toBeNull();
  // A pede o evento de B → null
  expect(await relatorioPosEvento(A.userId, B.eventId)).toBeNull();
});

test("métricas saem do dado REAL de check-in/status", async () => {
  const ev = await criarEventoCom(A.communityId, "metricas", new Date(Date.now() - 86400000), 10);
  await inscrever(ev.id, "m-p1", { checkin: true });
  await inscrever(ev.id, "m-p2", { checkin: true });
  await inscrever(ev.id, "m-falta1");
  await inscrever(ev.id, "m-falta2");
  await inscrever(ev.id, "m-fila", { status: "lista_espera" });
  await inscrever(ev.id, "m-cancelou", { cancelado: true });

  const rel = await relatorioPosEvento(A.userId, ev.id);
  expect(rel).not.toBeNull();
  expect(rel!.metricas).toMatchObject({
    confirmados: 4,
    presentes: 2,
    faltas: 2,
    fila: 1,
    cancelados: 1,
    capacidade: 10,
    houveCheckin: true,
  });
  expect(rel!.metricas.taxaComparecimento).toBeCloseTo(0.5);
  expect(rel!.metricas.lotacao).toBeCloseTo(0.4);
  expect(rel!.passado).toBe(true);
});

test("AGREGADO: nenhum nome, e-mail ou WhatsApp escapa no relatório", async () => {
  const ev = await criarEventoCom(A.communityId, "sempii", new Date(Date.now() - 86400000), 5);
  await inscrever(ev.id, "pii-1", { checkin: true });
  await inscrever(ev.id, "pii-2");

  const rel = await relatorioPosEvento(A.userId, ev.id);
  const json = JSON.stringify(rel);
  // Nenhum e-mail dos inscritos, nenhum "@teste.invalid", nenhuma chave de PII.
  expect(json).not.toContain("@");
  expect(json.toLowerCase()).not.toContain("inscrito");
  expect(json).not.toMatch(/"(email|nome|whatsapp)"/);
});

test("público: quem já se inscreveu antes na comunidade conta como retornante", async () => {
  // Comunidade isolada: o cálculo de "1ª vez" depende do histórico da comunidade.
  const com = await criarComunidade(A.organizationId, "pubcom");
  const antigo = await criarEventoCom(com.id, "pub-antigo", new Date(Date.now() - 10 * 86400000), null);
  await inscrever(antigo.id, "pub-veterano", { checkin: true });

  const novo = await criarEventoCom(com.id, "pub-novo", new Date(Date.now() - 3 * 86400000), null);
  await inscrever(novo.id, "pub-veterano"); // mesmo e-mail, já veio antes
  await inscrever(novo.id, "pub-estreante"); // e-mail inédito na comunidade

  const rel = await relatorioPosEvento(A.userId, novo.id);
  expect(rel!.publico.novos).toBe(1); // estreante
  expect(rel!.publico.retornantes).toBe(1); // veterano
});

test("comparação: o relatório traz o evento anterior da comunidade; o 1º não tem anterior", async () => {
  // Comunidade isolada pra o "anterior" ser determinístico.
  const com = await criarComunidade(A.organizationId, "cmpcom");
  const primeiro = await criarEventoCom(com.id, "cmp-1", new Date(Date.now() - 20 * 86400000), 10);
  await inscrever(primeiro.id, "cmp-a", { checkin: true });
  await inscrever(primeiro.id, "cmp-b");

  const segundo = await criarEventoCom(com.id, "cmp-2", new Date(Date.now() - 2 * 86400000), 10);
  await inscrever(segundo.id, "cmp-c", { checkin: true });

  const relSeg = await relatorioPosEvento(A.userId, segundo.id);
  expect(relSeg!.anterior).not.toBeNull();
  expect(relSeg!.anterior!.titulo).toBe(primeiro.titulo);
  expect(relSeg!.anterior!.metricas.confirmados).toBe(2);

  // O primeiro evento da comunidade não tem anterior.
  const relPri = await relatorioPosEvento(A.userId, primeiro.id);
  expect(relPri!.anterior).toBeNull();
});
