import { test, expect } from "@playwright/test";
import {
  criarOrganizacao,
  limparOrganizacoes,
  prisma,
  PREFIXO,
  DOMINIO_TESTE,
  AUTH_ADMIN,
  type OrgDeTeste,
} from "./fixtures";
import {
  publicarAviso,
  avisosDaComunidade,
  avisosDaAgenda,
  avisosDoPainel,
  avisosDoAdmin,
  ocultarAviso,
  reexibirAviso,
  segmentarCorpo,
  corpoParaEmailHtml,
  escaparHtml,
  DIAS_FEED_COMUNIDADE,
  POSTS_POR_PAGINA,
} from "@/lib/posts";
import { seguir } from "@/lib/membership";

/**
 * STORY-010 — feed de avisos por comunidade.
 *
 * O que estes testes protegem, em ordem de gravidade:
 *  1. XSS — corpo é texto de terceiro publicado em página pública.
 *  2. Escopo — organizador só publica na PRÓPRIA comunidade.
 *  3. Vazamento — aviso oculto some de TODA superfície; comunidade pendente
 *     não publica nada visível.
 */

let A: OrgDeTeste;
let B: OrgDeTeste;

async function criarUsuario(email: string) {
  return prisma.user.create({
    data: { name: `Pessoa ${email}`, email, emailVerified: true },
  });
}

test.beforeEach(async () => {
  await limparOrganizacoes();
  A = await criarOrganizacao("posta");
  B = await criarOrganizacao("postb");
});

test.afterAll(async () => {
  await limparOrganizacoes();
  await prisma.$disconnect();
});

// ── Escopo ─────────────────────────────────────────────────────────────────

test("só o dono publica na comunidade; alheia devolve nao-dono", async () => {
  const meu = await publicarAviso(A.userId, A.communitySlug, {
    corpo: "Hoje o treino é no campo 2.",
  });
  expect(meu.ok).toBe(true);

  const alheio = await publicarAviso(A.userId, B.communitySlug, {
    corpo: "Invasão",
  });
  expect(alheio).toMatchObject({ ok: false, motivo: "nao-dono" });

  // e nada foi parar na comunidade do outro
  const feedB = await avisosDaComunidade(B.communityId);
  expect(feedB.avisos).toHaveLength(0);
});

test("corpo inválido é recusado com mensagem (curto demais e longo demais)", async () => {
  expect(await publicarAviso(A.userId, A.communitySlug, { corpo: "oi" })).toMatchObject({
    ok: false,
    motivo: "invalido",
  });
  expect(
    await publicarAviso(A.userId, A.communitySlug, { corpo: "x".repeat(1001) }),
  ).toMatchObject({ ok: false, motivo: "invalido" });
});

test("comunidade pendente não publica — e nada dela vaza no feed público", async () => {
  await prisma.community.update({
    where: { id: A.communityId },
    data: { statusPublicacao: "pendente" },
  });

  const r = await publicarAviso(A.userId, A.communitySlug, {
    corpo: "Aviso de comunidade em análise",
  });
  expect(r).toMatchObject({ ok: false, motivo: "nao-publicavel" });

  // defesa em profundidade: mesmo um aviso que existisse não sairia na listagem
  await prisma.post.create({
    data: { communityId: A.communityId, autorId: A.userId, corpo: "Escrito antes da análise" },
  });
  const feed = await avisosDaComunidade(A.communityId);
  expect(feed.avisos).toHaveLength(0);
});

// ── XSS (critério de pronto da spec) ───────────────────────────────────────

test("HTML no corpo NÃO é interpretado: sai escapado na página", async ({ request }) => {
  const payload = `<script>alert('xss')</script> e <img src=x onerror=alert(1)>`;
  const r = await publicarAviso(A.userId, A.communitySlug, { corpo: payload });
  expect(r.ok).toBe(true);

  const resp = await request.get(`/comunidades/${A.communitySlug}`);
  expect(resp.status()).toBe(200);
  const html = await resp.text();

  // A tag NÃO existe como marcação...
  expect(html).not.toContain("<script>alert('xss')</script>");
  expect(html).not.toContain("<img src=x onerror=alert(1)>");
  // ...e o texto aparece escapado, visível pro leitor.
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("onerror=alert(1)&gt;");
});

test("escape e linkificação do corpo pro e-mail: tag escapa, URL vira link nofollow ugc", () => {
  expect(escaparHtml(`<b>&"'`)).toBe("&lt;b&gt;&amp;&quot;&#39;");

  const html = corpoParaEmailHtml(
    "Olha <b>isso</b> em https://exemplo.test/a?b=1.\nAté amanhã",
  );
  expect(html).toContain("&lt;b&gt;isso&lt;/b&gt;");
  expect(html).toContain(
    '<a href="https://exemplo.test/a?b=1" rel="nofollow ugc noopener"',
  );
  // o ponto final não entra na URL, e a quebra de linha vira <br>
  expect(html).toContain("</a>.<br>Até amanhã");
});

test("segmentarCorpo não produz link de javascript: nem data:", () => {
  const segs = segmentarCorpo(
    "clique javascript:alert(1) ou data:text/html,<script>1</script> ou https://ok.test",
  );
  const links = segs.filter((s) => s.tipo === "link").map((s) => s.valor);
  expect(links).toEqual(["https://ok.test"]);
});

// ── Visibilidade e moderação ───────────────────────────────────────────────

test("aviso oculto some do feed público, da agenda e continua visível pro admin", async () => {
  const seguidor = await criarUsuario(`${PREFIXO}seguidor-post${DOMINIO_TESTE}`);
  await seguir(seguidor.id, A.communityId);

  const r = await publicarAviso(A.userId, A.communitySlug, {
    corpo: "Treino cancelado por chuva",
  });
  if (!r.ok) throw new Error("publicação falhou no setup");
  const id = r.dados.id;

  expect((await avisosDaComunidade(A.communityId)).avisos).toHaveLength(1);
  expect(await avisosDaAgenda(seguidor.id)).toHaveLength(1);

  const oculto = await ocultarAviso(id, { motivo: "dado pessoal de terceiro" }, "teste");
  expect(oculto.ok).toBe(true);

  // sumiu de TODA superfície pública, inclusive de quem já tinha visto
  expect((await avisosDaComunidade(A.communityId)).avisos).toHaveLength(0);
  expect(await avisosDaAgenda(seguidor.id)).toHaveLength(0);

  // mas o admin vê, com motivo e autor do registro
  const noAdmin = (await avisosDoAdmin({ apenasOcultos: true })).find((a) => a.id === id);
  expect(noAdmin?.ocultoMotivo).toBe("dado pessoal de terceiro");
  expect(noAdmin?.ocultoPor).toBe("teste");

  // e o organizador enxerga que foi ocultado (não descobre pela ausência)
  const noPainel = (await avisosDoPainel(A.userId, A.communitySlug))?.find((a) => a.id === id);
  expect(noPainel?.ocultoEm).not.toBeNull();

  // reexibir devolve pra todo mundo
  await reexibirAviso(id);
  expect((await avisosDaComunidade(A.communityId)).avisos).toHaveLength(1);
  expect(await avisosDaAgenda(seguidor.id)).toHaveLength(1);
});

test("ocultar sem motivo é recusado", async () => {
  const r = await publicarAviso(A.userId, A.communitySlug, { corpo: "Aviso qualquer" });
  if (!r.ok) throw new Error("publicação falhou no setup");
  expect(await ocultarAviso(r.dados.id, { motivo: "  " }, "teste")).toMatchObject({
    ok: false,
    motivo: "invalido",
  });
});

test("avisosDoPainel de comunidade alheia devolve null (vira 404, nunca 403)", async () => {
  expect(await avisosDoPainel(A.userId, B.communitySlug)).toBeNull();
});

// ── Janela de tempo e paginação ────────────────────────────────────────────

test("feed público corta em 30 dias; agenda corta em 7", async () => {
  const seguidor = await criarUsuario(`${PREFIXO}janela${DOMINIO_TESTE}`);
  await seguir(seguidor.id, A.communityId);

  const dias = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  await prisma.post.createMany({
    data: [
      { communityId: A.communityId, autorId: A.userId, corpo: "de hoje", createdAt: dias(0) },
      { communityId: A.communityId, autorId: A.userId, corpo: "de 10 dias", createdAt: dias(10) },
      { communityId: A.communityId, autorId: A.userId, corpo: "de 40 dias", createdAt: dias(40) },
    ],
  });

  const publico = (await avisosDaComunidade(A.communityId)).avisos.map((a) => a.corpo);
  expect(publico).toEqual(["de hoje", "de 10 dias"]); // 40 dias ficou fora
  expect(publico).not.toContain("de 40 dias");

  const naAgenda = (await avisosDaAgenda(seguidor.id)).map((a) => a.corpo);
  expect(naAgenda).toEqual(["de hoje"]); // janela de 7 dias
});

test("paginação: página 2 continua de onde a 1 parou e temMais fecha no fim", async () => {
  const total = POSTS_POR_PAGINA + 3;
  await prisma.post.createMany({
    data: Array.from({ length: total }, (_, i) => ({
      communityId: A.communityId,
      autorId: A.userId,
      corpo: `aviso ${i}`,
      // escalonado pra ordem ser determinística (createdAt desc)
      createdAt: new Date(Date.now() - i * 60 * 1000),
    })),
  });

  const p1 = await avisosDaComunidade(A.communityId, { pagina: 1 });
  expect(p1.avisos).toHaveLength(POSTS_POR_PAGINA);
  expect(p1.temMais).toBe(true);
  expect(p1.avisos[0].corpo).toBe("aviso 0"); // mais recente primeiro

  const p2 = await avisosDaComunidade(A.communityId, { pagina: 2 });
  expect(p2.avisos).toHaveLength(3);
  expect(p2.temMais).toBe(false);
  // sem sobreposição entre as páginas
  const ids = new Set(p1.avisos.map((a) => a.id));
  expect(p2.avisos.some((a) => ids.has(a.id))).toBe(false);
});

// ── Anonimização (LGPD × histórico) ────────────────────────────────────────

test("apagar a conta do autor ANONIMIZA o aviso — o texto fica, o nome sai", async () => {
  const r = await publicarAviso(A.userId, A.communitySlug, {
    corpo: "Amanhã tem treino às 7h",
  });
  if (!r.ok) throw new Error("publicação falhou no setup");

  const antes = (await avisosDaComunidade(A.communityId)).avisos[0];
  expect(antes.autorNome).not.toBeNull();

  // a comunidade tem `organizationId`; apagar o usuário não pode levar o aviso
  await prisma.organizationMember.deleteMany({ where: { userId: A.userId } });
  await prisma.user.delete({ where: { id: A.userId } });

  const depois = (await avisosDaComunidade(A.communityId)).avisos;
  expect(depois).toHaveLength(1);
  expect(depois[0].corpo).toBe("Amanhã tem treino às 7h");
  expect(depois[0].autorNome).toBeNull(); // vira "organizador da comunidade" na UI
});

// ── Superfícies HTTP ───────────────────────────────────────────────────────

test("página da comunidade mostra o aviso; página 2 do feed sai NOINDEX", async ({
  request,
}) => {
  await publicarAviso(A.userId, A.communitySlug, {
    corpo: "Aviso visível na página pública",
  });

  const p1 = await request.get(`/comunidades/${A.communitySlug}`);
  const html1 = await p1.text();
  expect(html1).toContain("Aviso visível na página pública");
  expect(html1).toContain("Avisos da comunidade");
  // página 1 continua indexável: ela É a comunidade
  expect(html1).not.toMatch(/<meta name="robots"[^>]*noindex/i);

  const p2 = await request.get(`/comunidades/${A.communitySlug}?avisos=2`);
  expect(p2.status()).toBe(200);
  expect(await p2.text()).toMatch(/<meta name="robots"[^>]*noindex/i);
});

test("o feed não entra no sitemap (nenhuma URL de avisos indexada)", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).not.toContain("?avisos=");
  expect(xml).not.toContain("/avisos");
});

test("/admin/avisos exige Basic Auth e lista o aviso quando autenticado", async ({
  request,
}) => {
  await publicarAviso(A.userId, A.communitySlug, { corpo: "Aviso pra moderar" });

  const semAuth = await request.get("/admin/avisos", { failOnStatusCode: false });
  expect(semAuth.status()).toBe(401);

  const comAuth = await request.get("/admin/avisos", { headers: AUTH_ADMIN });
  expect(comAuth.status()).toBe(200);
  expect(await comAuth.text()).toContain("Aviso pra moderar");
});

test("painel de avisos exige sessão: deslogado vai pro /entrar", async ({ request }) => {
  const resp = await request.get(
    `/painel/comunidades/${A.communitySlug}/avisos`,
    { maxRedirects: 0, failOnStatusCode: false },
  );
  // A suíte roda com auth DESLIGADA (playwright.config): ninguém está logado,
  // então a rota tem que empurrar pro /entrar — nunca renderizar o painel.
  expect([302, 307]).toContain(resp.status());
  expect(resp.headers()["location"]).toContain("/entrar");
});

test("a janela do feed público é a documentada (30 dias)", () => {
  expect(DIAS_FEED_COMUNIDADE).toBe(30);
});
