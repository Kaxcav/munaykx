import { test, expect } from "@playwright/test";

// Espelha o PORTA do playwright.config.ts — em worktree paralela a suite
// sobe noutra porta, e Origin cravado faria o teste falhar por ambiente.
const BASE = `http://127.0.0.1:${process.env.PW_PORTA ?? "3100"}`;
import { criarEvento, limparFixtures, prisma, DOMINIO_TESTE } from "./fixtures";

/**
 * O ciclo de inscrição — a única coisa no site que envolve disputa por um
 * recurso escasso (a vaga) e, por isso, a única que pode quebrar de um jeito
 * que ninguém vê: duas pessoas confirmadas na mesma vaga, ou fila que não
 * anda quando alguém desiste.
 */

let evento: Awaited<ReturnType<typeof criarEvento>>;

test.beforeAll(async () => {
  await limparFixtures();
  evento = await criarEvento({ nome: "rsvp", capacidade: 1 });
});

test.afterAll(async () => {
  await limparFixtures();
  await prisma.$disconnect();
});

const inscrever = (request: import("@playwright/test").APIRequestContext, nome: string, email: string) =>
  request.post("/api/rsvps", {
    data: { eventSlug: evento.slug, nome, email },
    headers: { Origin: BASE },
  });

test("primeira pessoa confirma, segunda entra na fila", async ({ request }) => {
  const a = await (await inscrever(request, "Ana", `zzt-a${DOMINIO_TESTE}`)).json();
  expect(a.status).toBe("confirmado");
  expect(a.token).toBeTruthy();

  const b = await (await inscrever(request, "Bia", `zzt-b${DOMINIO_TESTE}`)).json();
  expect(b.status).toBe("lista_espera");
});

test("inscrição repetida não duplica nem devolve o token", async ({ request }) => {
  const r = await (await inscrever(request, "Ana de novo", `zzt-a${DOMINIO_TESTE}`)).json();
  expect(r.jaExistia).toBe(true);
  // Anti-sequestro: quem já tem inscrição não recebe o token de volta pela
  // resposta HTTP — senão qualquer um que saiba o e-mail alheio cancela a
  // inscrição da pessoa. O link chega por e-mail, que é caixa de quem é dono.
  expect(r.token ?? null).toBeNull();

  const quantos = await prisma.rsvp.count({
    where: { eventId: evento.eventId, email: `zzt-a${DOMINIO_TESTE}` },
  });
  expect(quantos).toBe(1);
});

test("cancelar promove quem estava na fila, na mesma transação", async ({ request }) => {
  const a = await prisma.rsvp.findFirstOrThrow({
    where: { eventId: evento.eventId, email: `zzt-a${DOMINIO_TESTE}` },
  });

  const resp = await request.post("/api/rsvps/cancel", {
    data: { token: a.token },
    headers: { Origin: BASE },
  });
  expect(resp.ok()).toBeTruthy();

  const b = await prisma.rsvp.findFirstOrThrow({
    where: { eventId: evento.eventId, email: `zzt-b${DOMINIO_TESTE}` },
  });
  expect(b.status).toBe("confirmado");
  expect(b.canceledAt).toBeNull();

  // A vaga é UMA. Se o cancelamento promovesse sem liberar, existiriam dois
  // confirmados — o bug clássico de capacidade sob concorrência.
  const confirmados = await prisma.rsvp.count({
    where: { eventId: evento.eventId, status: "confirmado", canceledAt: null },
  });
  expect(confirmados).toBe(1);
});

test("cancelar duas vezes com o mesmo token é inofensivo", async ({ request }) => {
  const b = await prisma.rsvp.findFirstOrThrow({
    where: { eventId: evento.eventId, email: `zzt-b${DOMINIO_TESTE}` },
  });
  await request.post("/api/rsvps/cancel", {
    data: { token: b.token },
    headers: { Origin: BASE },
  });
  const antes = await prisma.rsvp.count({ where: { eventId: evento.eventId } });

  await request.post("/api/rsvps/cancel", {
    data: { token: b.token },
    headers: { Origin: BASE },
  });
  const depois = await prisma.rsvp.count({ where: { eventId: evento.eventId } });
  expect(depois).toBe(antes);
});

test("token inventado não cancela nada", async ({ request }) => {
  const resp = await request.post("/api/rsvps/cancel", {
    data: { token: "token-que-nao-existe-em-lugar-nenhum" },
    headers: { Origin: BASE },
  });
  expect(resp.status()).toBeGreaterThanOrEqual(400);
});

test("honeypot: bot preenchido recebe ok falso e nada é gravado", async ({ request }) => {
  const antes = await prisma.rsvp.count({ where: { eventId: evento.eventId } });
  const r = await request.post("/api/rsvps", {
    data: {
      eventSlug: evento.slug,
      nome: "Robô",
      email: `zzt-bot${DOMINIO_TESTE}`,
      site: "https://spam.example",
    },
    headers: { Origin: BASE },
  });
  const corpo = await r.json();
  // Responde sucesso de propósito: bot que recebe erro tenta de novo.
  expect(corpo.ok).toBe(true);
  const depois = await prisma.rsvp.count({ where: { eventId: evento.eventId } });
  expect(depois).toBe(antes);
});

test("sem provedor de e-mail, a página não promete aviso por e-mail", async ({ page }) => {
  const cheio = await criarEvento({ nome: "semmail", capacidade: 0 });
  await page.goto(`/eventos/${cheio.slug}`);
  // A regra de copy: só promete e-mail quando emailConfigurado() é true.
  // O webServer da suíte roda sem EMAIL_PROVIDER de propósito.
  await expect(page.locator("body")).not.toContainText("a gente te avisa por e-mail");
});
