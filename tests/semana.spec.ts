import { test, expect } from "@playwright/test";
import { criarEvento, limparFixtures, prisma } from "./fixtures";
import {
  validarResumo,
  gerarResumoDaSemana,
  eventosDaSemana,
  resumoVigente,
  zerarTetoDaSemana,
  type EventoDaSemana,
} from "@/lib/ai/semana";

/**
 * "A SEMANA EM BRASÍLIA" — o que estes testes protegem.
 *
 * Esta é a feature de IA com a maior consequência de errar. A busca erra e a
 * pessoa refaz; aqui o texto é PUBLICADO numa página de SEO, afirmando em
 * nome da MUNAY que algo vai acontecer na cidade. Se não acontecer, alguém
 * sai de casa à toa.
 *
 * Por isso a guarda não filtra frase: ela CONFERE FATO. Todo título citado
 * tem que existir na semana, senão o resumo inteiro é descartado.
 */

const EVENTOS: EventoDaSemana[] = [
  {
    slug: "zzt-corrida-ev",
    titulo: "Treino de domingo",
    startsAt: new Date(Date.now() + 2 * 864e5),
    comunidade: "Corrida Sudoeste",
    regiao: "Sudoeste/Octogonal",
    local: "Parque da Cidade",
  },
  {
    slug: "zzt-volei-ev",
    titulo: "Vôlei no fim de tarde",
    startsAt: new Date(Date.now() + 4 * 864e5),
    comunidade: "Vôlei Taguatinga",
    regiao: "Taguatinga",
    local: null,
  },
];

async function limpar() {
  await prisma.resumoSemana.deleteMany({});
  await limparFixtures();
}

test.beforeEach(async () => {
  zerarTetoDaSemana();
  await limpar();
});

test.afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

// ── Grounded ───────────────────────────────────────────────────────────────

test("aceita resumo que fala dos eventos REAIS da semana", () => {
  const t = validarResumo(
    "Semana boa em Brasília. Domingo tem Treino de domingo saindo do Parque da Cidade, com a Corrida Sudoeste. Quinta, Vôlei no fim de tarde em Taguatinga. Dá uma conferida aí.",
    EVENTOS,
  );
  expect(t).toContain("Treino de domingo");
});

test("RECUSA resumo que inventa evento — nada citado existe", () => {
  const t = validarResumo(
    "Essa semana tem Yoga ao amanhecer no Lago Norte e Escalada no Parque Olhos d'Água. Bora?",
    EVENTOS,
  );
  // Nenhum dos dois está na lista. Publicar isso mandaria alguém pra um
  // treino que não existe.
  expect(t).toBeNull();
});

test("RECUSA texto genérico que não cita nenhum evento", () => {
  const t = validarResumo(
    "A semana promete muita coisa boa nas comunidades de Brasília. Vem com a gente aproveitar o melhor da cidade e movimentar o corpo!",
    EVENTOS,
  );
  // Texto genérico numa página de SEO não é curadoria — é enchimento.
  expect(t).toBeNull();
});

test("aceita quando cita ao menos um real, ignorando acento e caixa", () => {
  const t = validarResumo(
    "Destaque da semana: VOLEI NO FIM DE TARDE, em Taguatinga. Chega junto que tem espaço.",
    EVENTOS,
  );
  expect(t).not.toBeNull();
});

test("recusa texto curto demais e longo demais — é post, não artigo", () => {
  expect(validarResumo("Treino de domingo.", EVENTOS)).toBeNull();
  expect(
    validarResumo(`Treino de domingo. ${"x".repeat(1300)}`, EVENTOS),
  ).toBeNull();
});

test("aguenta o modelo embrulhar em markdown", () => {
  const t = validarResumo(
    "```\nDomingo tem Treino de domingo no Parque da Cidade, com a Corrida Sudoeste. Passa lá.\n```",
    EVENTOS,
  );
  expect(t).not.toBeNull();
  expect(t).not.toContain("```");
});

// ── Sem evento, sem resumo ─────────────────────────────────────────────────

test("semana vazia NÃO gera resumo e NÃO chama o modelo", async () => {
  // Chave falsa de propósito: se o modelo fosse consultado, bateria na rede e
  // o teste falharia. Passar é a prova de que nem tentou.
  const antes = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "sk-ant-chave-falsa-de-teste";
  try {
    expect(await gerarResumoDaSemana()).toBeNull();
    expect(await prisma.resumoSemana.count()).toBe(0);
  } finally {
    if (antes === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = antes;
  }
});

test("com a IA desligada não gera nada, e não é erro", async () => {
  await criarEvento({ nome: "semana", diasNoFuturo: 3 });
  expect(await gerarResumoDaSemana()).toBeNull();
  expect(await prisma.resumoSemana.count()).toBe(0);
});

// ── A janela ───────────────────────────────────────────────────────────────

test("a janela pega os próximos 7 dias — nem o de ontem, nem o do mês que vem", async () => {
  await criarEvento({ nome: "dentro", diasNoFuturo: 3 });
  await criarEvento({ nome: "fora", diasNoFuturo: 30 });
  await criarEvento({ nome: "passado", diasNoFuturo: -2 });

  const lista = await eventosDaSemana();
  const titulos = lista.map((e) => e.titulo);
  expect(titulos).toContain("Treino dentro");
  expect(titulos).not.toContain("Treino fora");
  expect(titulos).not.toContain("Treino passado");
});

test("evento de comunidade não pública fica fora da curadoria", async () => {
  await criarEvento({ nome: "escondido", diasNoFuturo: 2, ativo: false });
  expect(await eventosDaSemana()).toHaveLength(0);
});

// ── Resumo vigente ─────────────────────────────────────────────────────────

test("resumo com mais de uma semana não é servido como atual", async () => {
  const antigo = new Date();
  antigo.setUTCDate(antigo.getUTCDate() - 20);
  await prisma.resumoSemana.create({
    data: { inicio: antigo, texto: "curadoria velha", eventos: 3 },
  });
  // Melhor estado vazio honesto que curadoria vencida com cara de atual.
  expect(await resumoVigente()).toBeNull();
});

test("o resumo da semana atual é servido", async () => {
  const hoje = new Date();
  await prisma.resumoSemana.create({
    data: {
      inicio: new Date(
        Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()),
      ),
      texto: "curadoria desta semana",
      eventos: 2,
    },
  });
  expect((await resumoVigente())?.texto).toBe("curadoria desta semana");
});

// ── Superfícies HTTP ───────────────────────────────────────────────────────

test("sem evento, /semana mostra estado vazio e sai NOINDEX", async ({
  request,
}) => {
  const r = await request.get("/semana");
  expect(r.status()).toBe(200);
  const html = await r.text();

  expect(html).toContain("Nenhum encontro marcado");
  // Publicar "não tem nada" no Google é pagar SEO pra anunciar site vazio —
  // mesma regra que lib/descoberta.ts aplica a recorte sem dado.
  expect(html).toMatch(/<meta name="robots"[^>]*noindex/i);
});

test("com evento, /semana lista os encontros e volta a ser indexável", async ({
  request,
}) => {
  await criarEvento({ nome: "listado", diasNoFuturo: 3 });

  const html = await (await request.get("/semana")).text();
  expect(html).toContain("Treino listado");
  expect(html).not.toMatch(/<meta name="robots"[^>]*noindex/i);
});

test("a página nunca mostra evento que não está na janela", async ({ request }) => {
  await criarEvento({ nome: "proximo", diasNoFuturo: 2 });
  await criarEvento({ nome: "distante", diasNoFuturo: 40 });

  const html = await (await request.get("/semana")).text();
  expect(html).toContain("Treino proximo");
  expect(html).not.toContain("Treino distante");
});

test("o cron da semana exige segredo — e GET não dispara", async ({ request }) => {
  const post = await request.post("/api/cron/semana", { failOnStatusCode: false });
  expect(post.status()).toBe(503); // suíte roda sem CRON_SECRET

  const get = await request.get("/api/cron/semana", { failOnStatusCode: false });
  expect([405, 404]).toContain(get.status());

  expect(await prisma.resumoSemana.count()).toBe(0);
});
