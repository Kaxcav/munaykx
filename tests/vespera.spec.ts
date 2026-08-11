import { test, expect } from "@playwright/test";
import { PREFIXO, DOMINIO_TESTE, limparOrganizacoes, prisma } from "./fixtures";
import { avisarVespera, janelaDeAmanha } from "@/lib/vespera";
import { conteudoVespera, blocoOnde, type DadosVespera } from "@/lib/emails-vespera";

/**
 * LEMBRETE DE VÉSPERA — o que estes testes protegem.
 *
 * 1. Só evento de AMANHÃ (não hoje, não depois de amanhã).
 * 2. Só inscrito CONFIRMADO e OPT-IN (fila, cancelado e opt-out fora).
 * 3. NÃO reenvia (idempotência atômica em `avisadoVesperaEm`).
 * 4. Erro/ausência de e-mail não derruba o lote (marca e segue).
 * 5. O endpoint exige segredo (503 sem `CRON_SECRET`).
 * 6. O conteúdo é grounded: guia quando existe, genérico quando não.
 */

const AGORA = new Date("2026-09-10T15:00:00Z");

/** Um instante DENTRO da janela de amanhã (meio do dia seguinte). */
function amanhaMeioDia(): Date {
  const { inicio } = janelaDeAmanha(AGORA);
  return new Date(inicio.getTime() + 12 * 3600 * 1000);
}
function hojeMeioDia(): Date {
  const { inicio } = janelaDeAmanha(AGORA);
  return new Date(inicio.getTime() - 12 * 3600 * 1000); // 12h antes do início de amanhã = hoje
}
function depoisDeAmanha(): Date {
  const { fim } = janelaDeAmanha(AGORA);
  return new Date(fim.getTime() + 12 * 3600 * 1000);
}

async function comunidade(slug: string, over: Record<string, unknown> = {}) {
  return prisma.community.create({
    data: { slug: `${PREFIXO}${slug}`, nome: `Com ${slug}`, modalidade: "Corrida", regiao: "Plano Piloto", ...over },
  });
}
async function evento(communityId: string, slug: string, startsAt: Date, over: Record<string, unknown> = {}) {
  return prisma.event.create({
    data: { communityId, slug: `${PREFIXO}${slug}`, titulo: `Ev ${slug}`, startsAt, ...over },
  });
}
async function rsvp(eventId: string, nome: string, over: Record<string, unknown> = {}) {
  // E-mails com DOMINIO_TESTE de propósito: é o que limparOrganizacoes varre.
  // Usar outro domínio deixa User/Rsvp órfãos que vazam entre rodadas e colidem
  // no @unique (o bug que me pegou aqui).
  return prisma.rsvp.create({
    data: { eventId, nome, email: `${PREFIXO}${nome}${DOMINIO_TESTE}`, status: "confirmado", ...over },
  });
}

test.beforeEach(() => limparOrganizacoes());
test.afterAll(async () => {
  await limparOrganizacoes();
  await prisma.$disconnect();
});

// ── Pura ────────────────────────────────────────────────────────────────────

test("janelaDeAmanha é o dia seguinte inteiro em Brasília (24h)", () => {
  const { inicio, fim } = janelaDeAmanha(AGORA);
  expect(fim.getTime() - inicio.getTime()).toBe(24 * 3600 * 1000);
  // 00:00 BRT = 03:00 UTC.
  expect(inicio.getUTCHours()).toBe(3);
});

// ── Batch ────────────────────────────────────────────────────────────────────

test("só avisa evento de AMANHÃ, confirmado, opt-in — e marca idempotência", async () => {
  const com = await comunidade("v1");
  const evAmanha = await evento(com.id, "amanha", amanhaMeioDia());
  const evHoje = await evento(com.id, "hoje", hojeMeioDia());
  const evDepois = await evento(com.id, "depois", depoisDeAmanha());

  const alvo = await rsvp(evAmanha.id, "confirma");
  await rsvp(evAmanha.id, "fila", { status: "lista_espera" });
  await rsvp(evAmanha.id, "cancelou", { canceledAt: new Date() });
  await rsvp(evHoje.id, "hoje-confirma");
  await rsvp(evDepois.id, "depois-confirma");

  const r = await avisarVespera(AGORA);
  expect(r.avisados).toBe(1); // só o confirmado de amanhã

  const marcado = await prisma.rsvp.findUnique({ where: { id: alvo.id } });
  expect(marcado?.avisadoVesperaEm).not.toBeNull();

  // fila / cancelado / hoje / depois seguem sem marca
  const naoAvisados = await prisma.rsvp.count({
    where: { avisadoVesperaEm: null, email: { startsWith: PREFIXO } },
  });
  expect(naoAvisados).toBe(4);
});

test("NÃO reenvia: rodar de novo avisa 0 (idempotência atômica)", async () => {
  const com = await comunidade("v2");
  const ev = await evento(com.id, "amanha2", amanhaMeioDia());
  await rsvp(ev.id, "alguem");

  expect((await avisarVespera(AGORA)).avisados).toBe(1);
  expect((await avisarVespera(AGORA)).avisados).toBe(0); // já avisado
});

test("respeita opt-out: seguidor com avisarEventos=false não recebe", async () => {
  const com = await comunidade("v3");
  const ev = await evento(com.id, "amanha3", amanhaMeioDia());

  // Uma pessoa com conta que SEGUE a comunidade com avisos DESLIGADOS.
  const user = await prisma.user.create({
    data: { name: "OptOut", email: `${PREFIXO}optout${DOMINIO_TESTE}`, emailVerified: true },
  });
  await prisma.membership.create({
    data: { userId: user.id, communityId: com.id, avisarEventos: false },
  });
  await rsvp(ev.id, "optout", { userId: user.id, email: `${PREFIXO}optout${DOMINIO_TESTE}` });
  // E uma pessoa sem conta (transacional) — recebe.
  await rsvp(ev.id, "anon");

  const r = await avisarVespera(AGORA);
  expect(r.avisados).toBe(1); // só o anônimo; o opt-out foi respeitado
});

test("evento de comunidade não aprovada não gera lembrete (grounded)", async () => {
  const com = await comunidade("v4", { statusPublicacao: "pendente" });
  const ev = await evento(com.id, "amanha4", amanhaMeioDia());
  await rsvp(ev.id, "pendente");

  expect((await avisarVespera(AGORA)).avisados).toBe(0);
});

test("evento cancelado/inativo não gera lembrete", async () => {
  const com = await comunidade("v5");
  const evCanc = await evento(com.id, "canc", amanhaMeioDia(), { canceladoEm: new Date() });
  const evInativo = await evento(com.id, "inativo", amanhaMeioDia(), { ativo: false });
  await rsvp(evCanc.id, "c1");
  await rsvp(evInativo.id, "c2");

  expect((await avisarVespera(AGORA)).avisados).toBe(0);
});

test("e-mail no-op (sem provider) não derruba o lote — marca e segue", async () => {
  // EMAIL_PROVIDER está vazio na suíte: dispararEmail é no-op. O lote tem que
  // completar e MARCAR mesmo assim (a prova de que o envio não é pré-requisito).
  const com = await comunidade("v6");
  const ev = await evento(com.id, "amanha6", amanhaMeioDia());
  const a = await rsvp(ev.id, "a");
  const b = await rsvp(ev.id, "b");

  const r = await avisarVespera(AGORA);
  expect(r.avisados).toBe(2);
  for (const x of [a, b]) {
    const m = await prisma.rsvp.findUnique({ where: { id: x.id } });
    expect(m?.avisadoVesperaEm).not.toBeNull();
  }
});

// ── Conteúdo (grounded) ──────────────────────────────────────────────────────

const BASE_CONTEUDO: DadosVespera = {
  evento: { titulo: "Pedal", slug: "pedal", startsAt: AGORA },
  comunidade: "Pedal DF",
  local: "Parque da Cidade",
  modoRota: false,
  origem: null,
  destino: null,
  percursoObs: null,
  nivel: "Iniciante",
  acolheIniciante: true,
  guia: { pontoEncontro: "Portão 3", oQueLevar: "Água e capacete" },
  tokenGestao: "tok-123",
};

test("conteúdo mostra o guia quando acolhe iniciante e tem guia", () => {
  const { html } = conteudoVespera(BASE_CONTEUDO);
  expect(html).toContain("Portão 3");
  expect(html).toContain("Água e capacete");
  expect(html).toContain("tok-123"); // link de gestão pra liberar vaga
});

test("conteúdo cai na versão genérica sem guia (não inventa ponto)", () => {
  const { html } = conteudoVespera({ ...BASE_CONTEUDO, acolheIniciante: false, guia: {} });
  expect(html).toContain("procura o pessoal do grupo");
  expect(html).not.toContain("Portão 3");
});

test("blocoOnde usa rota (saída→chegada) no modo rota, local fora dele", () => {
  expect(blocoOnde({ ...BASE_CONTEUDO, modoRota: true, origem: "A", destino: "B", local: "ignora" }))
    .toContain("Saída: A");
  expect(blocoOnde({ ...BASE_CONTEUDO, modoRota: false, local: "Quadra" })).toBe("Quadra");
});

// ── Endpoint ─────────────────────────────────────────────────────────────────

test("o endpoint responde 503 sem CRON_SECRET (rota de manutenção não fica aberta)", async ({ request }) => {
  const resp = await request.post("/api/cron/vespera");
  expect(resp.status()).toBe(503);
});
