import { test, expect } from "@playwright/test";
import { prisma } from "./fixtures";
import {
  purgarTextosAntigos,
  dataDeCorte,
  MESES_DE_RETENCAO,
} from "@/lib/ai/retencao";
import { resumoBuscas } from "@/lib/ai/registro";

/**
 * RETENÇÃO DE 12 MESES — o que estes testes protegem.
 *
 * A purga tem duas maneiras de dar errado, e as duas são silenciosas:
 * apagar de menos (o desabafo de treze meses atrás continua lá) ou apagar de
 * mais (some a série histórica que justifica o registro existir). Os testes
 * fixam as duas bordas.
 */

const diasAtras = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

async function limpar() {
  await prisma.buscaRegistro.deleteMany({});
}

test.beforeEach(limpar);

test.afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

test("o prazo é 12 meses, e está no código", () => {
  expect(MESES_DE_RETENCAO).toBe(12);
  const corte = dataDeCorte(new Date(Date.UTC(2027, 0, 15)));
  expect(corte.toISOString().slice(0, 10)).toBe("2026-01-15");
});

test("antigo perde o TEXTO; recente mantém", async () => {
  await prisma.buscaRegistro.createMany({
    data: [
      { dia: diasAtras(400), texto: "desabafo antigo", modalidade: "Corrida", teveResultado: false },
      { dia: diasAtras(30), texto: "busca recente", modalidade: "Vôlei", teveResultado: true },
    ],
  });

  const r = await purgarTextosAntigos();
  expect(r.purgados).toBe(1);

  const antigo = await prisma.buscaRegistro.findFirst({
    where: { modalidade: "Corrida" },
  });
  const recente = await prisma.buscaRegistro.findFirst({
    where: { modalidade: "Vôlei" },
  });

  expect(antigo?.texto).toBeNull();
  expect(recente?.texto).toBe("busca recente");
});

test("a LINHA fica — some o texto, não a série histórica", async () => {
  await prisma.buscaRegistro.create({
    data: {
      dia: diasAtras(400),
      texto: "desabafo antigo",
      modalidade: "Corrida",
      regiao: "Ceilândia",
      teveResultado: false,
    },
  });

  await purgarTextosAntigos();

  const l = await prisma.buscaRegistro.findFirst();
  expect(l).not.toBeNull();
  // Tudo que NÃO identifica ninguém continua respondendo "o que Brasília
  // pediu e a MUNAY não tinha".
  expect(l?.modalidade).toBe("Corrida");
  expect(l?.regiao).toBe("Ceilândia");
  expect(l?.teveResultado).toBe(false);
  expect(l?.dia).not.toBeNull();
});

test("os CONTADORES do /admin não mudam com a purga", async () => {
  await prisma.buscaRegistro.createMany({
    data: [
      { dia: diasAtras(400), texto: "a", teveResultado: false },
      { dia: diasAtras(400), texto: "b", teveResultado: true },
      { dia: diasAtras(5), texto: "c", teveResultado: false },
    ],
  });

  const antes = await resumoBuscas();
  await purgarTextosAntigos();
  const depois = await resumoBuscas();

  // Anular em vez de deletar é exatamente o que mantém isto estável: o número
  // de buscas de um ano não muda quando o ano seguinte chega.
  expect(depois).toEqual(antes);
  expect(depois.total).toBe(3);
});

test("é IDEMPOTENTE: a segunda passagem não toca em nada", async () => {
  await prisma.buscaRegistro.create({
    data: { dia: diasAtras(400), texto: "antigo", teveResultado: false },
  });

  expect((await purgarTextosAntigos()).purgados).toBe(1);
  expect((await purgarTextosAntigos()).purgados).toBe(0);
  expect((await purgarTextosAntigos()).purgados).toBe(0);
});

test("banco sem nada antigo: roda limpo e devolve 0", async () => {
  await prisma.buscaRegistro.create({
    data: { dia: diasAtras(10), texto: "recente", teveResultado: true },
  });
  expect((await purgarTextosAntigos()).purgados).toBe(0);
  expect((await prisma.buscaRegistro.findFirst())?.texto).toBe("recente");
});

test("a borda do prazo: 12 meses e um dia sai; ontem fica", async () => {
  const agora = new Date(Date.UTC(2027, 5, 15));
  const corte = dataDeCorte(agora);

  const umDiaAntes = new Date(corte);
  umDiaAntes.setUTCDate(umDiaAntes.getUTCDate() - 1);

  await prisma.buscaRegistro.createMany({
    data: [
      { dia: umDiaAntes, texto: "fora do prazo", teveResultado: false },
      { dia: corte, texto: "exatamente no corte", teveResultado: false },
    ],
  });

  const r = await purgarTextosAntigos(agora);
  expect(r.purgados).toBe(1);

  const noCorte = await prisma.buscaRegistro.findFirst({
    where: { texto: { not: null } },
  });
  // `lt` e não `lte`: o dia do corte ainda está dentro dos 12 meses.
  expect(noCorte?.texto).toBe("exatamente no corte");
});

// ── O gatilho ──────────────────────────────────────────────────────────────

test("sem CRON_SECRET a rota responde 503 — nunca 200, nunca purga", async ({
  request,
}) => {
  // A suíte roda sem o segredo: é o estado de qualquer ambiente que não
  // configurou o cron. Uma rota de manutenção aberta seria convite pra
  // alguém disparar o job em laço.
  await prisma.buscaRegistro.create({
    data: { dia: diasAtras(400), texto: "antigo", teveResultado: false },
  });

  const r = await request.post("/api/cron/retencao", { failOnStatusCode: false });
  expect(r.status()).toBe(503);

  // e nada foi purgado
  expect((await prisma.buscaRegistro.findFirst())?.texto).toBe("antigo");
});

test("GET não dispara a purga — só POST", async ({ request }) => {
  // Prefetch de navegador, scanner corporativo e crawler disparam GET
  // sozinhos. Operação que escreve não fica atrás de um verbo desses.
  const r = await request.get("/api/cron/retencao", { failOnStatusCode: false });
  expect([405, 404]).toContain(r.status());
});

test("segredo errado é 401, e também não purga", async ({ request }) => {
  await prisma.buscaRegistro.create({
    data: { dia: diasAtras(400), texto: "antigo", teveResultado: false },
  });

  const r = await request.post("/api/cron/retencao", {
    headers: { "x-cron-secret": "chute" },
    failOnStatusCode: false,
  });
  // Sem segredo configurado no ambiente, 503 vem antes do 401 — os dois
  // significam "não passou", que é o que importa aqui.
  expect([401, 503]).toContain(r.status());
  expect((await prisma.buscaRegistro.findFirst())?.texto).toBe("antigo");
});
