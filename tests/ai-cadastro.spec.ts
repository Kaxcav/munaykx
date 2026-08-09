import { test, expect } from "@playwright/test";
import { AUTH_ADMIN, limparFixtures, prisma } from "./fixtures";
import {
  validarSugestao,
  extrairComunidade,
  zerarTetosDoCadastro,
} from "@/lib/ai/extracao";

/**
 * CADASTRO DE PARCEIRO EM 30s — o que estes testes protegem.
 *
 * Duas invariantes, e as duas são de segurança de produto, não de UX:
 *
 * 1. **A IA propõe, a pessoa decide.** Nada no caminho da extração escreve no
 *    banco. Se um dia alguém "agilizar" fazendo a análise já criar a
 *    comunidade, a regra 3 do projeto (nunca publicar parceiro real sem
 *    autorização assinada) cai junto — e um texto colado da internet vira
 *    afirmação pública da MUNAY.
 * 2. **Grounded.** Modalidade e região só saem das listas reais. Um chute
 *    plausível é pior que um campo vazio: o vazio pede revisão, o chute passa.
 */

const FACETAS = { modalidades: ["Corrida", "Jiu-jítsu", "Vôlei"] };
const resposta = (o: Record<string, unknown>) => JSON.stringify(o);

const COMPLETA = {
  nome: "Corrida Sudoeste",
  modalidade: "Corrida",
  regiao: "Plano Piloto",
  descricao: "Grupo de corrida que sai do Parque da Cidade.",
  horarios: "Terças e quintas, 6h",
  local: "Parque da Cidade, entrada 3",
  nivel: "Iniciante",
  observacao: null,
};

test.beforeEach(() => zerarTetosDoCadastro());

test.afterAll(async () => {
  await limparFixtures();
  await prisma.$disconnect();
});

// ── Grounded ───────────────────────────────────────────────────────────────

test("extrai de um texto REAL de convite de WhatsApp", () => {
  const s = validarSugestao(resposta(COMPLETA), FACETAS);
  expect(s).toMatchObject({
    nome: "Corrida Sudoeste",
    modalidade: "Corrida",
    regiao: "Plano Piloto",
    horarios: "Terças e quintas, 6h",
    local: "Parque da Cidade, entrada 3",
    nivel: "Iniciante",
  });
});

test("modalidade fora do catálogo vira VAZIO, não chute", () => {
  const s = validarSugestao(
    resposta({ ...COMPLETA, modalidade: "Crossfit" }),
    FACETAS,
  );
  // "Crossfit" num banco que só tem "Funcional" criaria uma modalidade órfã
  // que não aparece em filtro nenhum — o mesmo bug da busca, do outro lado.
  expect(s?.modalidade).toBeNull();
  expect(s?.nome).toBe("Corrida Sudoeste"); // o resto sobrevive
});

test("região fora das 35 RAs vira VAZIO", () => {
  const s = validarSugestao(
    resposta({ ...COMPLETA, regiao: "Copacabana" }),
    FACETAS,
  );
  expect(s?.regiao).toBeNull();
});

test("grafia quase certa não passa — acento e hífen contam", () => {
  for (const errado of ["corrida", "CEILÂNDIA", "jiu jitsu"]) {
    const s = validarSugestao(
      resposta({ ...COMPLETA, modalidade: errado, regiao: errado }),
      FACETAS,
    );
    expect(s?.modalidade, errado).toBeNull();
    expect(s?.regiao, errado).toBeNull();
  }
});

test("texto sem informação devolve campos nulos, não invenções", () => {
  const s = validarSugestao(
    resposta({
      nome: null, modalidade: null, regiao: null, descricao: null,
      horarios: null, local: null, nivel: null,
      observacao: "O texto não diz onde nem quando acontece.",
    }),
    FACETAS,
  );
  expect(s?.nome).toBeNull();
  expect(s?.horarios).toBeNull();
  expect(s?.observacao).toContain("não diz onde");
});

test("JSON quebrado devolve null, não explode", () => {
  for (const lixo of ["", "não sou json", "{quebrado", "[]", "null"]) {
    expect(validarSugestao(lixo, FACETAS), lixo).toBeNull();
  }
});

test("aguenta markdown em volta e corta texto longo demais pro campo", () => {
  const s = validarSugestao(
    "```json\n" + resposta({ ...COMPLETA, nivel: "x".repeat(200) }) + "\n```",
    FACETAS,
  );
  expect(s?.modalidade).toBe("Corrida");
  expect((s?.nivel ?? "").length).toBeLessThanOrEqual(80); // teto da coluna
});

// ── Humano no meio ─────────────────────────────────────────────────────────

test("a EXTRAÇÃO não cria comunidade nenhuma — nem com texto perfeito", async () => {
  const antes = await prisma.community.count();

  // Sem chave a extração devolve null; com chave devolveria uma sugestão.
  // Nos DOIS caminhos o banco não é tocado — é o ponto.
  const r = await extrairComunidade(
    "Corrida no Parque da Cidade toda terça e quinta às 6h, iniciantes bem-vindos.",
    FACETAS,
    "1.1.1.1",
  );
  expect(r === null || typeof r === "object").toBe(true);

  expect(await prisma.community.count()).toBe(antes);
});

test("o módulo de extração não tem caminho de escrita no banco", async () => {
  // Estrutural de propósito: com a IA desligada nenhuma requisição exercita o
  // caminho de gravação, então só o fonte prova que ele não existe. Se alguém
  // "agilizar" fazendo a análise já cadastrar, isto fica vermelho.
  const { readFile } = await import("node:fs/promises");
  const fonte = await readFile("lib/ai/extracao.ts", "utf8");
  expect(fonte).not.toMatch(/prisma\.|\.create\(|\.upsert\(|\.update\(/);
});

test("entrada curta nem chega a gastar chamada", async () => {
  expect(await extrairComunidade("oi", FACETAS, "1.1.1.1")).toBeNull();
});

// ── Teto próprio ───────────────────────────────────────────────────────────

test("o cadastro tem teto SEPARADO da busca", async () => {
  const { readFile } = await import("node:fs/promises");
  const [cadastro, busca] = await Promise.all([
    readFile("lib/ai/extracao.ts", "utf8"),
    readFile("lib/ia.ts", "utf8"),
  ]);
  // Cada um instancia o próprio Balde — nada compartilhado.
  expect(cadastro).toContain("new Balde(");
  expect(busca).toContain("new Balde(");
  expect(cadastro).toContain("IA_LIMITE_DIA_CADASTRO");
});

// ── Gate ───────────────────────────────────────────────────────────────────

test("sem credencial, a tela assistida é barrada", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: {}, baseURL });
  const r = await ctx.request.get("/admin/comunidades/assistido", {
    failOnStatusCode: false,
  });
  expect([401, 404]).toContain(r.status());
  await ctx.close();
});

test.describe("com credencial de admin", () => {
  test.use({ extraHTTPHeaders: AUTH_ADMIN });

  test("a tela existe e diz que a IA está desligada neste ambiente", async ({
    page,
  }) => {
    // A suíte roda sem ANTHROPIC_API_KEY: a página não pode prometer o que o
    // ambiente não entrega — mesma regra do e-mail.
    await page.goto("/admin/comunidades/assistido");
    await expect(
      page.getByRole("heading", { name: "Cadastro assistido" }),
    ).toBeVisible();
    await expect(page.getByText(/IA está desligada/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Cadastrar manualmente/i })).toBeVisible();
  });

  test("o /admin/comunidades oferece o caminho de colar texto", async ({ page }) => {
    await page.goto("/admin/comunidades");
    await expect(page.getByRole("link", { name: /Colar texto/i })).toBeVisible();
  });
});
