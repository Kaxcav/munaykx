import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { prisma, PREFIXO, DOMINIO_TESTE } from "./fixtures";
import {
  DURACAO_PADRAO_MIN,
  acesaEm,
  adicionarHorario,
  hhmmParaMinutos,
  horariosDaComunidade,
  marcarHoras,
  matrizTemporal,
  minutosParaHHMM,
  removerHorario,
  rotularHorario,
  temEixoDeTempo,
} from "@/lib/horarios";

/**
 * EIXO DE TEMPO — FASE 0 do mapa.
 *
 * O que estes testes protegem, em ordem de importância:
 *
 *  1. **A migration é aditiva.** Ela roda sozinha no boot do Railway, sem
 *     ninguém olhando. Um `DROP`/`ALTER` que vazasse pra lá custaria dado de
 *     produção — então isso é verificado no ARQUIVO, não na intenção.
 *  2. **Só o dono mexe no horário da comunidade dele.** Horário alimenta o mapa
 *     público; escrever no da concorrente seria vandalismo com efeito visível.
 *  3. **O scrubber acende as RAs certas** — e isso é exercitado no navegador de
 *     verdade, não só na função pura.
 *  4. **Comunidade sem horário estruturado não quebra nada.** É a degradação
 *     graciosa que permitiu construir a Fase 0 sem migrar dado existente.
 *
 * Helpers locais de propósito: `tests/fixtures.ts` é arquivo-gargalo do projeto
 * (várias frentes querem editar) e o CLAUDE.md manda preferir arquivo novo.
 */

// ─── helpers locais ───────────────────────────────────────────────────────

async function limpar() {
  // `horarios_recorrentes` cai por CASCADE junto com a comunidade — apagar a
  // comunidade basta, e isso também PROVA o cascade na prática.
  await prisma.community.deleteMany({ where: { slug: { startsWith: PREFIXO } } });
  await prisma.organization.deleteMany({ where: { slug: { startsWith: PREFIXO } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMINIO_TESTE } } });
}

/** Uma organização com dono e uma comunidade REAL (não demo) na região dada. */
async function criarDono(nome: string, regiao: string, demo = false) {
  const base = `${PREFIXO}h-${nome}`;
  const user = await prisma.user.create({
    data: { name: `Dono ${nome}`, email: `${base}${DOMINIO_TESTE}`, emailVerified: true },
  });
  const org = await prisma.organization.create({
    data: { nome: `Org ${nome}`, slug: `${base}-org`, membros: { create: { userId: user.id } } },
  });
  const com = await prisma.community.create({
    data: {
      slug: `${base}-com`,
      nome: `Comunidade ${nome}`,
      modalidade: "Corrida",
      regiao,
      demo,
      organizationId: org.id,
    },
  });
  return { userId: user.id, communityId: com.id, slug: com.slug };
}

test.beforeEach(limpar);
test.afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

// ─── 1. a migration é aditiva ─────────────────────────────────────────────

test("a migration do eixo de tempo é ADITIVA: nada de DROP, ALTER destrutivo ou RENAME", () => {
  const dir = path.join(process.cwd(), "prisma", "migrations");
  const pasta = readdirSync(dir).find((d) => d.includes("horario_recorrente"));
  expect(pasta, "a migration do horário recorrente precisa existir").toBeTruthy();

  const bruto = readFileSync(path.join(dir, pasta!, "migration.sql"), "utf8");
  // Só o SQL EXECUTÁVEL: o cabeçalho de comentário do arquivo explica como
  // reverter ("DROP TABLE ..."), e comentário não roda no banco. Sem tirar os
  // comentários, este teste reprovaria a própria documentação da migration.
  const sql = bruto
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("--"))
    .join("\n");

  // Cria a tabela nova — é o que a migration DEVE fazer.
  expect(sql).toMatch(/CREATE TABLE "horarios_recorrentes"/);

  // E nada que destrua o que já está em produção. Este teste é a barreira que
  // deixa o deploy automático do Railway ser seguro.
  expect(sql).not.toMatch(/\bDROP\b/i);
  expect(sql).not.toMatch(/\bRENAME\b/i);
  expect(sql).not.toMatch(/\bTRUNCATE\b/i);
  // O único ALTER tolerado é o ADD CONSTRAINT da FK da própria tabela nova.
  for (const alter of sql.match(/ALTER TABLE[^;]*/gi) ?? []) {
    expect(alter).toMatch(/ALTER TABLE "horarios_recorrentes" ADD CONSTRAINT/);
  }
});

test("a migration não tem BOM (o Postgres recusa com 'syntax error at or near')", () => {
  const dir = path.join(process.cwd(), "prisma", "migrations");
  const pasta = readdirSync(dir).find((d) => d.includes("horario_recorrente"))!;
  const bruto = readFileSync(path.join(dir, pasta, "migration.sql"));
  expect(bruto[0]).not.toBe(0xef); // EF BB BF = BOM do UTF-8
});

// ─── 2. funções puras ─────────────────────────────────────────────────────

test("HH:MM ↔ minutos, incluindo o 6h15 que é o caso real", () => {
  expect(hhmmParaMinutos("06:15")).toBe(375);
  expect(minutosParaHHMM(375)).toBe("06:15");
  expect(hhmmParaMinutos("00:00")).toBe(0);
  expect(hhmmParaMinutos("23:59")).toBe(1439);
  // Lixo não vira 0 nem NaN: vira `null`, que a validação rejeita.
  expect(hhmmParaMinutos("24:00")).toBeNull();
  expect(hhmmParaMinutos("06:60")).toBeNull();
  expect(hhmmParaMinutos("seis horas")).toBeNull();
  expect(hhmmParaMinutos("")).toBeNull();
});

test("um treino de 06:15 às 07:30 acende as horas 6 E 7", () => {
  const m = marcarHoras(0, 375, 450);
  expect((m >> 5) & 1).toBe(0);
  expect((m >> 6) & 1).toBe(1);
  expect((m >> 7) & 1).toBe(1);
  expect((m >> 8) & 1).toBe(0);
});

test("sem hora de fim, vale a duração padrão — não some do mapa", () => {
  const m = marcarHoras(0, 6 * 60, null);
  expect((m >> 6) & 1).toBe(1);
  expect((m >> 7) & 1).toBe(1); // 06:00 + 60min alcança o topo da hora 7
  expect(DURACAO_PADRAO_MIN).toBe(60);
});

test("fim antes do início NÃO dá a volta no dia (acenderia a madrugada inteira)", () => {
  const m = marcarHoras(0, 22 * 60, 1 * 60); // 22:00 → 01:00
  expect((m >> 22) & 1).toBe(1);
  expect((m >> 23) & 1).toBe(1);
  // O que não pode acontecer de jeito nenhum: a manhã acesa.
  for (const h of [0, 1, 2, 6, 12, 18]) {
    expect((m >> h) & 1, `hora ${h} não podia acender`).toBe(0);
  }
});

test("23:40 sem fim não estoura pra uma hora 24 que não existe", () => {
  const m = marcarHoras(0, 23 * 60 + 40, null);
  expect((m >> 23) & 1).toBe(1);
  expect(m >> 24).toBe(0);
});

test("rótulo legível, com e sem hora de fim", () => {
  expect(rotularHorario({ diaSemana: 2, minutoInicio: 375, minutoFim: 450 })).toBe(
    "Terça, 06:15 às 07:30",
  );
  expect(rotularHorario({ diaSemana: 6, minutoInicio: 480, minutoFim: null })).toBe(
    "Sábado, 08:00",
  );
});

// ─── 3. contenção: só o dono ──────────────────────────────────────────────

test("dono adiciona horário na comunidade dele", async () => {
  const a = await criarDono("dono", "Ceilândia");
  const r = await adicionarHorario(a.userId, a.slug, {
    diaSemana: 2,
    horaInicio: "06:15",
    horaFim: "07:30",
  });
  expect(r.ok).toBe(true);

  const lista = await horariosDaComunidade(a.userId, a.slug);
  expect(lista).toHaveLength(1);
  expect(lista![0].minutoInicio).toBe(375);
  expect(lista![0].minutoFim).toBe(450);
});

test("estranho NÃO adiciona horário na comunidade alheia (nao-dono → 404)", async () => {
  const a = await criarDono("alfa", "Ceilândia");
  const b = await criarDono("beta", "Gama");

  const r = await adicionarHorario(b.userId, a.slug, {
    diaSemana: 2,
    horaInicio: "06:15",
  });
  expect(r.ok).toBe(false);
  expect(r.ok === false && r.motivo).toBe("nao-dono");

  // E o banco não foi tocado.
  expect(await prisma.horarioRecorrente.count({ where: { communityId: a.communityId } })).toBe(0);
});

test("estranho NÃO lê os horários da comunidade alheia", async () => {
  const a = await criarDono("alfa", "Ceilândia");
  const b = await criarDono("beta", "Gama");
  await adicionarHorario(a.userId, a.slug, { diaSemana: 2, horaInicio: "06:15" });

  expect(await horariosDaComunidade(b.userId, a.slug)).toBeNull();
});

test("estranho NÃO remove horário alheio nem sabendo o id dele", async () => {
  const a = await criarDono("alfa", "Ceilândia");
  const b = await criarDono("beta", "Gama");
  await adicionarHorario(a.userId, a.slug, { diaSemana: 2, horaInicio: "06:15" });
  const [h] = await prisma.horarioRecorrente.findMany({ where: { communityId: a.communityId } });

  // O ataque completo: id certo do horário alheio, mas passando o PRÓPRIO slug
  // (é dono dele) — o `where` tem que amarrar as duas coisas.
  const r = await removerHorario(b.userId, b.slug, h.id);
  expect(r.ok).toBe(false);
  expect(await prisma.horarioRecorrente.count({ where: { id: h.id } })).toBe(1);
});

test("validação: hora de fim antes do início é recusada com mensagem", async () => {
  const a = await criarDono("val", "Ceilândia");
  const r = await adicionarHorario(a.userId, a.slug, {
    diaSemana: 2,
    horaInicio: "07:00",
    horaFim: "06:00",
  });
  expect(r.ok).toBe(false);
  expect(r.ok === false && r.motivo).toBe("invalido");
  expect(r.ok === false && r.erro).toContain("depois");
});

test("validação: dia fora de 0–6 não entra", async () => {
  const a = await criarDono("dia", "Ceilândia");
  for (const diaSemana of [-1, 7, 99]) {
    const r = await adicionarHorario(a.userId, a.slug, { diaSemana, horaInicio: "06:00" });
    expect(r.ok, `dia ${diaSemana} não podia passar`).toBe(false);
  }
});

// ─── 4. a matriz temporal (o que acende o mapa) ───────────────────────────

test("a matriz acende a RA no dia×hora certo, e só nele", async () => {
  const a = await criarDono("matriz", "Ceilândia");
  await adicionarHorario(a.userId, a.slug, {
    diaSemana: 2, // terça
    horaInicio: "06:15",
    horaFim: "07:30",
  });

  const m = await matrizTemporal();
  expect(acesaEm(m["Ceilândia"]?.reais, 2, 6)).toBe(true);
  expect(acesaEm(m["Ceilândia"]?.reais, 2, 7)).toBe(true);
  // Mesma RA, hora errada.
  expect(acesaEm(m["Ceilândia"]?.reais, 2, 5)).toBe(false);
  expect(acesaEm(m["Ceilândia"]?.reais, 2, 8)).toBe(false);
  // Mesma hora, dia errado.
  expect(acesaEm(m["Ceilândia"]?.reais, 3, 6)).toBe(false);
  // RA sem nada.
  expect(acesaEm(m["Gama"]?.reais, 2, 6)).toBe(false);
});

test("comunidade DEMO acende na faixa de exemplo, nunca na de real (regra 3)", async () => {
  const d = await criarDono("demo", "Sobradinho", true);
  await adicionarHorario(d.userId, d.slug, { diaSemana: 4, horaInicio: "19:00" });

  const m = await matrizTemporal();
  expect(acesaEm(m["Sobradinho"]?.demo, 4, 19)).toBe(true);
  expect(acesaEm(m["Sobradinho"]?.reais, 4, 19)).toBe(false);
});

test("comunidade pendente ou pausada NÃO acende o mapa (grounded)", async () => {
  const p = await criarDono("pendente", "Gama");
  await adicionarHorario(p.userId, p.slug, { diaSemana: 1, horaInicio: "06:00" });
  await prisma.community.update({
    where: { id: p.communityId },
    data: { statusPublicacao: "pendente" },
  });
  expect(acesaEm((await matrizTemporal())["Gama"]?.reais, 1, 6)).toBe(false);

  // Aprovada mas pausada pelo organizador: mesmo resultado.
  await prisma.community.update({
    where: { id: p.communityId },
    data: { statusPublicacao: "aprovada", ativo: false },
  });
  expect(acesaEm((await matrizTemporal())["Gama"]?.reais, 1, 6)).toBe(false);

  // E aprovada + ativa acende — senão o teste acima passaria por acidente.
  await prisma.community.update({
    where: { id: p.communityId },
    data: { ativo: true },
  });
  expect(acesaEm((await matrizTemporal())["Gama"]?.reais, 1, 6)).toBe(true);
});

test("horário pausado (ativo=false) não acende, e não precisou ser apagado", async () => {
  const a = await criarDono("pausa", "Taguatinga");
  await adicionarHorario(a.userId, a.slug, { diaSemana: 5, horaInicio: "20:00" });
  await prisma.horarioRecorrente.updateMany({
    where: { communityId: a.communityId },
    data: { ativo: false },
  });
  expect(acesaEm((await matrizTemporal())["Taguatinga"]?.reais, 5, 20)).toBe(false);
  expect(await prisma.horarioRecorrente.count({ where: { communityId: a.communityId } })).toBe(1);
});

test("região da OCORRÊNCIA ganha da região da comunidade (grupo itinerante)", async () => {
  const a = await criarDono("itin", "Ceilândia");
  await adicionarHorario(a.userId, a.slug, { diaSemana: 6, horaInicio: "08:00" });
  await prisma.horarioRecorrente.updateMany({
    where: { communityId: a.communityId },
    data: { regiao: "Plano Piloto" },
  });

  const m = await matrizTemporal();
  expect(acesaEm(m["Plano Piloto"]?.reais, 6, 8)).toBe(true);
  expect(acesaEm(m["Ceilândia"]?.reais, 6, 8)).toBe(false);
});

test("sem nenhum horário estruturado, a matriz é vazia e o eixo não aparece", async () => {
  await criarDono("sem-horario", "Ceilândia");
  const m = await matrizTemporal();
  expect(temEixoDeTempo(m)).toBe(false);
});

// ─── 5. o mapa no navegador ───────────────────────────────────────────────

test("comunidade SEM horário estruturado não quebra o /mapa (degrada graciosamente)", async ({
  page,
}) => {
  await criarDono("sem-eixo", "Ceilândia");

  const resposta = await page.goto("/mapa");
  expect(resposta?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: /região por região/i })).toBeVisible();
  // Sem dado de horário, o controle nem existe — nada de scrubber que não filtra.
  await expect(page.getByRole("button", { name: /filtrar por horário/i })).toHaveCount(0);
});

test("o scrubber acende as RAs certas para um dia×hora, no navegador", async ({ page }) => {
  // Duas comunidades reais em horários DIFERENTES: é a diferença entre elas que
  // prova que o filtro filtra, em vez de só mostrar tudo.
  const manha = await criarDono("manha", "Ceilândia");
  await adicionarHorario(manha.userId, manha.slug, {
    diaSemana: 2, // terça 06:15–07:30
    horaInicio: "06:15",
    horaFim: "07:30",
  });
  const noite = await criarDono("noite", "Gama");
  await adicionarHorario(noite.userId, noite.slug, {
    diaSemana: 6, // sábado 20:00
    horaInicio: "20:00",
  });

  await page.goto("/mapa");
  await page.getByRole("button", { name: /filtrar por horário/i }).click();

  // Clica no PILL (o label), não no `<input>` — o input é `sr-only` de
  // propósito (rádio nativo pro leitor de tela, aparência de pill pro olho), e
  // ele tem tamanho zero. Clicar no label é o que a pessoa realmente faz.
  const dia = (curto: string) =>
    page.locator("label").filter({ hasText: new RegExp(`^${curto}$`) });

  // Terça, 06h → só Ceilândia.
  await dia("ter").click();
  await page.locator("#hora-do-dia").fill("6");
  const resumo = page.locator("[aria-live='polite']");
  await expect(resumo).toContainText("1 região acesa");
  await expect(resumo).toContainText("Ceilândia");
  await expect(resumo).not.toContainText("Gama");

  // Mesma terça, 20h → ninguém (a de Gama é sábado).
  await page.locator("#hora-do-dia").fill("20");
  await expect(resumo).toContainText(/ninguém cadastrado nesse horário/i);

  // Sábado, 20h → só Gama.
  await dia("sáb").click();
  await expect(resumo).toContainText("1 região acesa");
  await expect(resumo).toContainText("Gama");
  await expect(resumo).not.toContainText("Ceilândia");

  // E "ver a semana toda" devolve o mapa inteiro.
  await page.getByRole("button", { name: /ver a semana toda/i }).click();
  await expect(resumo).toHaveCount(0);
});

test("o mapa não expõe coordenada nenhuma — é região, nunca ponto (§H da pesquisa)", async ({
  page,
}) => {
  const a = await criarDono("privacidade", "Ceilândia");
  await adicionarHorario(a.userId, a.slug, { diaSemana: 2, horaInicio: "06:15" });

  await page.goto("/mapa");
  const html = await page.content();
  // A defesa real é estrutural (a tabela não tem lat/lng), mas se alguém um dia
  // adicionar coordenada e vazar pro HTML público, este teste fica vermelho.
  expect(html).not.toMatch(/\blatitude\b|\blongitude\b/i);
  expect(html).not.toMatch(/-1[45]\.\d{4,}/); // latitude de Brasília com precisão fina
});
