import { test, expect } from "@playwright/test";
import { DOMINIO_TESTE, PREFIXO, limparOrganizacoes, prisma } from "./fixtures";
import {
  TEXTO_AUTORIZACAO,
  criarComunidade,
  type ResultadoCadastro,
} from "@/lib/cadastro";
import {
  comunidadesDoUsuario,
  organizacoesDe,
  souOrganizador,
} from "@/lib/organizacao";
import { getCommunities, getCommunityBySlug } from "@/lib/communities";

/**
 * CADASTRO DE COMUNIDADE — STORY-009, frente A.
 *
 * Três invariantes carregam esta frente inteira, e cada uma falha em silêncio
 * se ninguém testar:
 *
 *   1. nasce `pendente` — se quebrar, cadastro público vira publicação direta
 *      e ninguém percebe até um parceiro real aparecer no site sem autorização;
 *   2. quem cadastra vira organizador na MESMA transação — se quebrar, sobra
 *      comunidade órfã que só o admin destrava no banco;
 *   3. o texto de autorização gravado é o do servidor — se quebrar, a prova
 *      documental da regra 3 passa a ser o que o cliente disser que é.
 *
 * Testa a camada lib direto, como `escopo-painel.spec.ts`: a suíte roda com a
 * auth DESLIGADA de propósito, então não há sessão pra exercitar o formulário
 * pelo navegador. O que dá pra provar pelo navegador — que a página não cai
 * sem auth — está no fim do arquivo.
 */

/** Nome que vira slug com o prefixo da suíte, pra `limparOrganizacoes` levar. */
const NOME = "zzt Corrida Noturna";
const SLUG = "zzt-corrida-noturna";

const VALIDO = {
  nome: NOME,
  modalidade: "Corrida",
  regiao: "Asa Norte",
  city: "",
  descricao: "Treino leve, todo mundo termina junto.",
  horarios: "Ter e qui, 19h",
  local: "Parque Olhos d'Água",
  nivel: "Todos os níveis",
  autorizacao: true,
};

let userId: string;

async function novoUsuario(sufixo: string): Promise<string> {
  const u = await prisma.user.create({
    data: {
      name: `Organizador ${sufixo}`,
      email: `${PREFIXO}${sufixo}${DOMINIO_TESTE}`,
      emailVerified: true,
    },
  });
  return u.id;
}

/** Estreita o union pra poder ler `.slug` sem `!` espalhado pelos testes. */
function sucesso(r: ResultadoCadastro) {
  expect(r.ok, r.ok ? "" : `cadastro falhou: ${r.error}`).toBe(true);
  return r as Extract<ResultadoCadastro, { ok: true }>;
}

test.beforeEach(async () => {
  await limparOrganizacoes();
  userId = await novoUsuario("dono");
});

test.afterAll(async () => {
  await limparOrganizacoes();
  await prisma.$disconnect();
});

// ─── 1. Nasce pendente ──────────────────────────────────────────────────────

test("a comunidade nasce PENDENTE, não aprovada", async () => {
  const r = sucesso(await criarComunidade(userId, VALIDO));
  expect(r.slug).toBe(SLUG);

  const c = await prisma.community.findUnique({ where: { slug: SLUG } });
  // O default da COLUNA é `aprovada` de propósito. Se este teste ficar verde
  // com o valor do default, a regra saiu da aplicação sem ninguém notar.
  expect(c?.statusPublicacao).toBe("pendente");
});

test("cadastrada pelo painel, ela não existe pro mundo", async () => {
  await criarComunidade(userId, VALIDO);

  // As mesmas portas de `aprovacao.spec.ts`, agora contra o que o CADASTRO
  // produziu — e não contra uma linha empurrada pra `pendente` na mão.
  expect(await getCommunityBySlug(SLUG)).toBeNull();
  expect((await getCommunities()).map((c) => c.slug)).not.toContain(SLUG);
});

test("não nasce como conteúdo ilustrativo — tem organizador real por trás", async () => {
  await criarComunidade(userId, VALIDO);
  const c = await prisma.community.findUnique({ where: { slug: SLUG } });
  // `demo: true` esconde do sitemap e marca como exemplo. Comunidade com dono
  // que assinou autorização não é exemplo.
  expect(c?.demo).toBe(false);
});

// ─── 2. Quem cadastra vira organizador, atomicamente ────────────────────────

test("quem cadastra é organizador dela desde o primeiro segundo", async () => {
  const r = sucesso(await criarComunidade(userId, VALIDO));

  expect(await souOrganizador(userId, r.organizationId)).toBe(true);

  const orgs = await organizacoesDe(userId);
  expect(orgs.map((o) => o.id)).toEqual([r.organizationId]);

  // E chega pelo caminho que o painel vai usar de verdade.
  const minhas = await comunidadesDoUsuario(userId);
  expect(minhas.map((c) => c.slug)).toEqual([SLUG]);
  expect(minhas[0].statusPublicacao).toBe("pendente");
});

test("a comunidade de um não aparece pro outro", async () => {
  await criarComunidade(userId, VALIDO);
  const outro = await novoUsuario("outro");

  // Sem isto, o teste acima passaria com uma consulta sem filtro de dono.
  expect(await comunidadesDoUsuario(outro)).toEqual([]);
  expect(await organizacoesDe(outro)).toEqual([]);
});

test("nome repetido é recusado e NÃO deixa organização órfã", async () => {
  sucesso(await criarComunidade(userId, VALIDO));

  const segundo = await novoUsuario("segundo");
  const r = await criarComunidade(segundo, VALIDO);

  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toMatch(/já existe/i);

  // O ponto do teste: a organização do segundo não pode ter sobrado. Se ela
  // sobrar, a pessoa fica dona de uma organização vazia que ninguém entende.
  expect(
    await prisma.organization.count({ where: { slug: { startsWith: PREFIXO } } }),
  ).toBe(1);
  expect(await organizacoesDe(segundo)).toEqual([]);
});

test("duas tentativas simultâneas com o mesmo nome: uma comunidade, uma organização", async () => {
  const b = await novoUsuario("corrida-b");

  // A corrida real: as duas passam pela checagem de slug antes de qualquer
  // uma gravar. Quem perde tem que desfazer a organização junto — é pra isso
  // que os três `create` estão na mesma transação.
  const [r1, r2] = await Promise.all([
    criarComunidade(userId, VALIDO),
    criarComunidade(b, VALIDO),
  ]);

  expect([r1.ok, r2.ok].filter(Boolean)).toHaveLength(1);
  expect(
    await prisma.community.count({ where: { slug: { startsWith: PREFIXO } } }),
  ).toBe(1);
  expect(
    await prisma.organization.count({ where: { slug: { startsWith: PREFIXO } } }),
  ).toBe(1);
});

// ─── 3. A autorização é prova documental ────────────────────────────────────

test("grava o TEXTO da autorização e a hora, não um booleano", async () => {
  const antes = new Date();
  await criarComunidade(userId, VALIDO);

  const c = await prisma.community.findUnique({ where: { slug: SLUG } });
  expect(c?.autorizacaoTexto).toBe(TEXTO_AUTORIZACAO);
  // Um booleano não prova nada sobre o que foi prometido. O texto, sim.
  expect(c?.autorizacaoTexto?.length ?? 0).toBeGreaterThan(80);
  expect(c?.autorizacaoEm).not.toBeNull();
  expect(c!.autorizacaoEm!.getTime()).toBeGreaterThanOrEqual(antes.getTime() - 1000);
});

test("o texto gravado é o do servidor — mandar outro pelo formulário não adianta", async () => {
  await criarComunidade(userId, {
    ...VALIDO,
    // Cliente adulterado tentando plantar a própria versão do aceite.
    autorizacaoTexto: "eu autorizo tudo, inclusive o que não li",
  });

  const c = await prisma.community.findUnique({ where: { slug: SLUG } });
  expect(c?.autorizacaoTexto).toBe(TEXTO_AUTORIZACAO);
  expect(c?.autorizacaoTexto).not.toContain("não li");
});

test("sem aceitar a autorização não cadastra nada", async () => {
  const r = await criarComunidade(userId, { ...VALIDO, autorizacao: false });

  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toMatch(/confirmação|responde por ela/i);

  // Nem comunidade, nem organização, nem vínculo.
  expect(await prisma.community.findUnique({ where: { slug: SLUG } })).toBeNull();
  expect(await organizacoesDe(userId)).toEqual([]);
});

test("checkbox ausente no POST é o mesmo que recusado", async () => {
  // Checkbox desmarcado simplesmente não é enviado — o schema não pode
  // interpretar ausência como aceite.
  const { autorizacao: _, ...semCampo } = VALIDO;
  const r = await criarComunidade(userId, semCampo);
  expect(r.ok).toBe(false);
});

// ─── 4. Validação de entrada ────────────────────────────────────────────────

test("recusa nome curto, modalidade e região vazias", async () => {
  for (const [campo, valor] of [
    ["nome", "x"],
    ["modalidade", ""],
    ["regiao", ""],
  ] as const) {
    const r = await criarComunidade(userId, { ...VALIDO, [campo]: valor });
    expect(r.ok, `${campo}='${valor}' deveria ser recusado`).toBe(false);
  }
});

test("nome que não vira endereço é recusado com mensagem clara", async () => {
  // Passa no `min(2)` e mesmo assim gera slug vazio. Sem esta guarda, viraria
  // erro de banco (slug "") em vez de mensagem pra pessoa.
  const r = await criarComunidade(userId, { ...VALIDO, nome: "!!! ???" });
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toMatch(/endereço válido/i);
});

test("campo opcional vazio vira null, não string vazia", async () => {
  await criarComunidade(userId, {
    ...VALIDO,
    descricao: "",
    horarios: "",
    local: "",
    nivel: "",
    city: "",
  });

  const c = await prisma.community.findUnique({ where: { slug: SLUG } });
  expect(c?.descricao).toBeNull();
  expect(c?.horarios).toBeNull();
  expect(c?.local).toBeNull();
  expect(c?.nivel).toBeNull();
  // `city` vazia cai no default, igual ao schema do admin.
  expect(c?.city).toBe("Brasília");
});

// ─── 5. A página ────────────────────────────────────────────────────────────

test("sem sessão, /painel/nova manda pro /entrar — e não responde 500", async ({
  page,
}) => {
  // A suíte roda sem `BETTER_AUTH_SECRET` de propósito. Este teste é a prova
  // de que a página nova respeita a regra do `sessaoAtual()`: uma chamada a
  // `auth.api.getSession()` direto aqui derrubaria a rota com 500.
  const resposta = await page.goto("/painel/nova");
  expect(resposta?.status()).toBeLessThan(400);
  await expect(page).toHaveURL(/\/entrar/);
});

test("a página não vaza no sitemap", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).not.toContain("/painel");
});
