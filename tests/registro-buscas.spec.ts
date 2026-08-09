import { test, expect } from "@playwright/test";
import { AUTH_ADMIN, prisma } from "./fixtures";
import { registrarBusca, resumoBuscas } from "@/lib/ai/registro";

/**
 * REGISTRO ANÔNIMO DE BUSCAS — o que estes testes protegem.
 *
 * O dono autorizou guardar as buscas. A autorização foi para guardar o que a
 * cidade PROCURA, não para guardar quem procurou — e a diferença entre as duas
 * coisas é uma coluna. Estes testes existem para que essa coluna nunca apareça
 * por acidente.
 *
 * O anonimato aqui é estrutural: a função de gravar não recebe identidade e a
 * tabela não tem onde guardá-la. Os testes cobrem as duas camadas, porque
 * quebrar só uma delas seria suficiente para vazar.
 */

async function limparRegistros() {
  await prisma.buscaRegistro.deleteMany({});
}

/**
 * Lê um arquivo SEM os comentários.
 *
 * Mesma lição do teste de CPF da STORY-011: um teste que proíbe a string no
 * arquivo proíbe também DOCUMENTAR a decisão — e aí a próxima pessoa apaga o
 * comentário em vez do código. Estes testes checam o que executa, não o que
 * explica. (Pegou de primeira: o comentário "não recebe userId, IP, sessão"
 * fazia o teste acusar exatamente a ausência que ele celebra.)
 */
async function codigoSemComentarios(caminho: string): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const fonte = await readFile(caminho, "utf8");
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, "") // blocos /** … */
    .replace(/^\s*\/\/.*$/gm, ""); // linhas //
}

/** Espera o fire-and-forget chegar ao banco. */
async function assentar() {
  await new Promise((r) => setTimeout(r, 150));
}

test.beforeEach(limparRegistros);

test.afterAll(async () => {
  await limparRegistros();
  await prisma.$disconnect();
});

// ── Anonimato ──────────────────────────────────────────────────────────────

test("a TABELA não tem coluna de identidade — nem userId, nem IP, nem sessão", async () => {
  // A camada que vale: mesmo que um dia alguém passe identidade adiante, não
  // existe onde gravar. Lido do schema, que é a fonte da verdade da migration.
  const schema = await codigoSemComentarios("prisma/schema.prisma");
  const modelo = schema.slice(
    schema.indexOf("model BuscaRegistro"),
    schema.indexOf("}", schema.indexOf("model BuscaRegistro")),
  );
  expect(modelo).not.toMatch(/userId|user_id|User|ip\b|ipHash|sessao|session|cookie/i);
});

test("a FUNÇÃO de gravar não aceita identidade — nem por engano", async () => {
  // Se alguém adicionar `userId` ou `ip` na entrada, isto fica vermelho antes
  // de qualquer dado real ser gravado.
  const codigo = await codigoSemComentarios("lib/ai/registro.ts");
  expect(codigo).not.toMatch(/userId|ipHash|req\.headers|cookies\(/);
  expect(codigo).not.toMatch(/sessaoAtual|getSession/);
});

test("a ROTA não passa o IP adiante — ele existe só pro teto e morre lá", async () => {
  const rota = await codigoSemComentarios("app/api/busca-ia/route.ts");
  const chamada = rota.slice(
    rota.indexOf("registrarBusca({"),
    rota.indexOf("});", rota.indexOf("registrarBusca({")),
  );
  expect(chamada).not.toMatch(/\bip\b/);
});

test("uma linha gravada não tem como ser ligada a nenhuma conta", async () => {
  const u = await prisma.user.create({
    data: { name: "Alguém", email: "zzt-registro@teste.invalid", emailVerified: true },
  });
  try {
    registrarBusca({
      texto: "quero voltar a treinar",
      modalidade: null,
      regiao: null,
      teveResultado: false,
    });
    await assentar();

    const linha = await prisma.buscaRegistro.findFirst();
    expect(linha).not.toBeNull();
    // Nenhum campo do registro contém o id nem o e-mail de ninguém.
    const serializado = JSON.stringify(linha);
    expect(serializado).not.toContain(u.id);
    expect(serializado).not.toContain(u.email);
    expect(Object.keys(linha ?? {}).sort()).toEqual(
      ["dia", "id", "modalidade", "regiao", "teveResultado", "texto"].sort(),
    );
  } finally {
    await prisma.user.delete({ where: { id: u.id } });
  }
});

test("o dia é gravado SEM hora — hora + região vira rastro", async () => {
  registrarBusca({ texto: "corrida", modalidade: "Corrida", regiao: null, teveResultado: true });
  await assentar();

  const linha = await prisma.buscaRegistro.findFirst();
  const d = linha!.dia;
  expect(d.getUTCHours()).toBe(0);
  expect(d.getUTCMinutes()).toBe(0);
  expect(d.getUTCSeconds()).toBe(0);
});

// ── É só o gravador ────────────────────────────────────────────────────────

test("gravar não chama modelo nenhum — custo de IA zero", async () => {
  // Nada de fornecedor, nada de fetch, nada de prompt. Se a #5 inteligente
  // for construída um dia, ela nasce em outro arquivo.
  const codigo = await codigoSemComentarios("lib/ai/registro.ts");
  expect(codigo).not.toMatch(/fornecedor|gerar\(|fetch\(|anthropic/i);
});

test("nada de clusterização aqui — o resumo é contagem, não análise", async () => {
  const codigo = await codigoSemComentarios("lib/ai/registro.ts");
  expect(codigo).not.toMatch(/groupBy|cluster|embedding|similar/i);
});

// ── Comportamento ──────────────────────────────────────────────────────────

test("grava o que a IA entendeu, incluindo o null que é informação", async () => {
  registrarBusca({
    texto: "quero escalar",
    modalidade: null, // não entendeu — e esse null é o dado valioso
    regiao: null,
    teveResultado: false,
  });
  await assentar();

  const l = await prisma.buscaRegistro.findFirst();
  expect(l?.texto).toBe("quero escalar");
  expect(l?.modalidade).toBeNull();
  expect(l?.teveResultado).toBe(false);
});

test("texto vazio não vira linha", async () => {
  registrarBusca({ texto: "   ", modalidade: null, regiao: null, teveResultado: false });
  await assentar();
  expect(await prisma.buscaRegistro.count()).toBe(0);
});

test("texto gigante é cortado antes de gravar", async () => {
  registrarBusca({
    texto: "x".repeat(5000),
    modalidade: null,
    regiao: null,
    teveResultado: false,
  });
  await assentar();
  const l = await prisma.buscaRegistro.findFirst();
  expect((l?.texto ?? "").length).toBeLessThanOrEqual(300);
});

test("o resumo conta total, 30 dias e sem-resultado", async () => {
  const antigo = new Date();
  antigo.setUTCDate(antigo.getUTCDate() - 60);
  await prisma.buscaRegistro.createMany({
    data: [
      { dia: new Date(), texto: "a", teveResultado: true },
      { dia: new Date(), texto: "b", teveResultado: false },
      { dia: new Date(), texto: "c", teveResultado: false },
      { dia: antigo, texto: "antigo", teveResultado: false },
    ],
  });

  const r = await resumoBuscas();
  expect(r.total).toBe(4);
  expect(r.ultimos30).toBe(3);
  expect(r.semResultado30).toBe(2);
});

// ── Superfície ─────────────────────────────────────────────────────────────

test.describe("no /admin, só número — nunca o texto", () => {
  test.use({ extraHTTPHeaders: AUTH_ADMIN });

  test("o painel mostra a contagem e NÃO mostra o que foi buscado", async ({
    page,
  }) => {
    await prisma.buscaRegistro.create({
      data: {
        dia: new Date(),
        texto: "quero voltar a treinar depois da depressao",
        teveResultado: false,
      },
    });

    await page.goto("/admin");
    await expect(page.getByText("O que a cidade procura")).toBeVisible();
    // O desabafo NÃO pode aparecer na tela — é o ponto inteiro da trava.
    await expect(page.locator("body")).not.toContainText(/depress/i);
  });
});

test("a busca com a IA desligada não grava nada (não há busca a registrar)", async ({
  request,
}) => {
  // A suíte roda sem ANTHROPIC_API_KEY: a rota responde 503 antes de qualquer
  // processamento, então não existe busca pra registrar.
  const r = await request.post("/api/busca-ia", {
    data: { texto: "corrida em taguatinga" },
    failOnStatusCode: false,
  });
  expect(r.status()).toBe(503);
  await assentar();
  expect(await prisma.buscaRegistro.count()).toBe(0);
});
