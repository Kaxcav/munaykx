import { test, expect } from "@playwright/test";
import { criarEvento, limparFixtures, prisma } from "./fixtures";
import { esquecerFornecedor } from "@/lib/ai";
import {
  validarRecomendacoes,
  recomendar,
  candidatas,
  zerarTetosDaDescoberta,
  QUANTAS,
  type Candidata,
} from "@/lib/ai/recomendacao";

/**
 * DESCOBERTA POR INTENÇÃO — o que estes testes protegem.
 *
 * A feature devolve comunidades REAIS com uma justificativa escrita pela IA.
 * O risco óbvio é a IA inventar uma comunidade que soa perfeita e não existe —
 * e numa plataforma de descoberta isso não é um bug de exibição: é mandar
 * alguém pra um treino que não acontece.
 *
 * Por isso a guarda é testada com as três personas do produto E com o caso que
 * mais importa: quando nada existe, a resposta certa é uma lista vazia com
 * explicação, nunca uma sugestão plausível.
 */

const CATALOGO: Candidata[] = [
  {
    slug: "corrida-sudoeste",
    nome: "Corrida Sudoeste",
    modalidade: "Corrida",
    regiao: "Sudoeste/Octogonal",
    descricao: "Saímos do Parque da Cidade.",
    nivel: "Iniciante",
    horarios: "Terças e quintas, 6h",
  },
  {
    slug: "jiu-ceilandia",
    nome: "Jiu-jítsu Ceilândia",
    modalidade: "Jiu-jítsu",
    regiao: "Ceilândia",
    descricao: null,
    nivel: "Todos os níveis",
    horarios: "Seg a sex, 19h",
  },
  {
    slug: "volei-taguatinga",
    nome: "Vôlei Taguatinga",
    modalidade: "Vôlei",
    regiao: "Taguatinga",
    descricao: null,
    nivel: null,
    horarios: "Sábados, 8h",
  },
];

const resposta = (o: Record<string, unknown>) => JSON.stringify(o);

test.beforeEach(() => zerarTetosDaDescoberta());

test.afterAll(async () => {
  await limparFixtures();
  await prisma.$disconnect();
});

// ── As três personas ───────────────────────────────────────────────────────

test("persona 1 — iniciante que quer correr de manhã", () => {
  const r = validarRecomendacoes(
    resposta({
      escolhas: [
        { slug: "corrida-sudoeste", porque: "Sai cedo e recebe quem está começando." },
      ],
      observacao: null,
    }),
    CATALOGO,
  );
  expect(r?.recomendacoes).toHaveLength(1);
  expect(r?.recomendacoes[0]).toMatchObject({
    slug: "corrida-sudoeste",
    nome: "Corrida Sudoeste", // do BANCO, não do modelo
    modalidade: "Corrida",
    regiao: "Sudoeste/Octogonal",
  });
  expect(r?.recomendacoes[0].porque).toContain("começando");
});

test("persona 2 — quem mora longe do Plano e quer luta", () => {
  const r = validarRecomendacoes(
    resposta({
      escolhas: [{ slug: "jiu-ceilandia", porque: "É em Ceilândia e treina todo dia útil." }],
      observacao: null,
    }),
    CATALOGO,
  );
  expect(r?.recomendacoes[0].regiao).toBe("Ceilândia");
});

test("persona 3 — quem só tem sábado livre", () => {
  const r = validarRecomendacoes(
    resposta({
      escolhas: [{ slug: "volei-taguatinga", porque: "Acontece sábado de manhã." }],
      observacao: null,
    }),
    CATALOGO,
  );
  expect(r?.recomendacoes[0].slug).toBe("volei-taguatinga");
});

// ── Não inventa ────────────────────────────────────────────────────────────

test("NADA EXISTE → lista vazia com explicação, jamais uma sugestão inventada", () => {
  const r = validarRecomendacoes(
    resposta({
      escolhas: [],
      observacao: "Ainda não temos escalada mapeada. O mais próximo é o vôlei em Taguatinga.",
    }),
    CATALOGO,
  );
  expect(r?.recomendacoes).toHaveLength(0);
  expect(r?.observacao).toContain("mais próximo");
});

test("slug inventado é DESCARTADO — mesmo com justificativa convincente", () => {
  const r = validarRecomendacoes(
    resposta({
      escolhas: [
        { slug: "escalada-lago-norte", porque: "Perfeita pro que você descreveu!" },
        { slug: "corrida-sudoeste", porque: "Sai cedo." },
      ],
      observacao: null,
    }),
    CATALOGO,
  );
  // A inventada some; a real fica. Mandar alguém pra uma comunidade que não
  // existe é o pior resultado possível de uma plataforma de descoberta.
  expect(r?.recomendacoes.map((x) => x.slug)).toEqual(["corrida-sudoeste"]);
});

test("o nome exibido vem do BANCO, mesmo se o modelo mandar outro", () => {
  // O modelo só contribui a justificativa; nome/modalidade/região são nossos.
  const r = validarRecomendacoes(
    resposta({
      escolhas: [{ slug: "corrida-sudoeste", porque: "ok" }],
      observacao: null,
    }),
    CATALOGO,
  );
  expect(r?.recomendacoes[0].nome).toBe("Corrida Sudoeste");
  expect(Object.keys(r?.recomendacoes[0] ?? {}).sort()).toEqual(
    ["modalidade", "nome", "porque", "regiao", "slug"].sort(),
  );
});

test("escolha sem justificativa não entra — a frase É a feature", () => {
  const r = validarRecomendacoes(
    resposta({
      escolhas: [
        { slug: "corrida-sudoeste", porque: "   " },
        { slug: "jiu-ceilandia", porque: "Treina todo dia útil." },
      ],
      observacao: null,
    }),
    CATALOGO,
  );
  expect(r?.recomendacoes.map((x) => x.slug)).toEqual(["jiu-ceilandia"]);
});

test("duplicata é ignorada e o teto de 3 é respeitado", () => {
  const r = validarRecomendacoes(
    resposta({
      escolhas: [
        { slug: "corrida-sudoeste", porque: "a" },
        { slug: "corrida-sudoeste", porque: "b" },
        { slug: "jiu-ceilandia", porque: "c" },
        { slug: "volei-taguatinga", porque: "d" },
        { slug: "corrida-sudoeste", porque: "e" },
      ],
      observacao: null,
    }),
    CATALOGO,
  );
  expect(r?.recomendacoes).toHaveLength(3);
  expect(new Set(r?.recomendacoes.map((x) => x.slug)).size).toBe(3);
  expect(r!.recomendacoes.length).toBeLessThanOrEqual(QUANTAS);
});

test("menos de três é resposta válida — não se enche a lista", () => {
  const r = validarRecomendacoes(
    resposta({
      escolhas: [{ slug: "jiu-ceilandia", porque: "É perto de você." }],
      observacao: "Só uma bate com o que você pediu.",
    }),
    CATALOGO,
  );
  expect(r?.recomendacoes).toHaveLength(1);
  expect(r?.observacao).toContain("Só uma");
});

test("JSON quebrado devolve null, não explode", () => {
  for (const lixo of ["", "não sou json", "{quebrado", "[]", "null"]) {
    expect(validarRecomendacoes(lixo, CATALOGO), lixo).toBeNull();
  }
});

test("aguenta markdown em volta", () => {
  const r = validarRecomendacoes(
    '```json\n{"escolhas":[{"slug":"jiu-ceilandia","porque":"perto"}],"observacao":null}\n```',
    CATALOGO,
  );
  expect(r?.recomendacoes[0].slug).toBe("jiu-ceilandia");
});

// ── Contra o banco de verdade ──────────────────────────────────────────────

test("as candidatas saem do banco e só trazem o que é público", async () => {
  await limparFixtures();
  const publica = await criarEvento({ nome: "publica" });
  const escondida = await criarEvento({ nome: "escondida", ativo: false });

  const lista = await candidatas();
  const slugs = lista.map((c) => c.slug);
  expect(slugs).toContain(`${publica.comunidadeSlug}`);
  expect(slugs).not.toContain(`${escondida.comunidadeSlug}`);
});

test("com a IA desligada a feature simplesmente não existe (null, sem erro)", async () => {
  // É o estado da suíte e o de qualquer ambiente sem chave: a busca por
  // filtro continua, a recomendação some. Nunca um erro na cara da pessoa.
  expect(await recomendar("quero correr de manhã", "1.1.1.1")).toBeNull();
});

test("banco sem comunidade nenhuma: diz que não tem, e nem chama o modelo", async () => {
  await limparFixtures();

  const antes = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "sk-ant-chave-falsa-de-teste";
  esquecerFornecedor();
  try {
    // Catálogo vazio é respondido ANTES de qualquer chamada — se o modelo
    // fosse consultado aqui, este teste bateria na rede com uma chave falsa
    // e falharia. Passar é a prova de que não chamou.
    const r = await recomendar("quero correr de manhã", "1.1.1.1");
    expect(r?.recomendacoes).toHaveLength(0);
    expect(r?.observacao).toContain("Ainda não temos");
  } finally {
    if (antes === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = antes;
    esquecerFornecedor();
  }
});

test("entrada curta nem chega a gastar chamada", async () => {
  expect(await recomendar("a", "1.1.1.1")).toBeNull();
});

test("a descoberta tem teto SEPARADO das outras features", async () => {
  const { readFile } = await import("node:fs/promises");
  const fonte = await readFile("lib/ai/recomendacao.ts", "utf8");
  expect(fonte).toContain("new Balde(");
  expect(fonte).toContain("IA_LIMITE_DIA_DESCOBERTA");
});

// ── Superfície HTTP ────────────────────────────────────────────────────────

test("com a IA desligada o endpoint segue respondendo 503, não erro genérico", async ({
  request,
}) => {
  const r = await request.post("/api/busca-ia", {
    data: { texto: "corrida em taguatinga" },
    failOnStatusCode: false,
  });
  expect(r.status()).toBe(503);
});
