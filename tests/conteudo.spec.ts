import { test, expect } from "@playwright/test";
import { AUTH_ADMIN, prisma } from "./fixtures";
import { REGISTRO, CHAVES, ehChave } from "@/lib/conteudo/registro";
import { conteudo, conteudoFresco } from "@/lib/conteudo";
import { publicar, salvarRascunho, historico, reverterPara } from "@/lib/conteudo/admin";

/**
 * ONDA 1 do ULTRAPLAN — conteúdo do site editável pelo /admin.
 *
 * O teste que justifica a onda inteira é o de CACHE (lá embaixo): publicar
 * tem de refletir no site SEM deploy. Sem ele, o CMS pode parecer funcionar e
 * não funcionar — o dono veria "publicado com sucesso" e o site continuaria
 * igual, porque a home é prerenderizada.
 */

const QUEM = "teste-admin";

async function limparConteudo() {
  await prisma.conteudoVersao.deleteMany({});
  await prisma.conteudoSite.deleteMany({});
}

test.beforeEach(limparConteudo);

test.afterAll(async () => {
  await limparConteudo();
  await prisma.$disconnect();
});

// ── Fundação: padrão, validação, fallback ──────────────────────────────────

test("com a tabela vazia, toda chave devolve o padrão do registro", async () => {
  for (const chave of CHAVES) {
    expect(await conteudo(chave)).toEqual(REGISTRO[chave].padrao);
  }
});

test("chave desconhecida é recusada na escrita, não gravada", async () => {
  expect(await salvarRascunho("nao.existe", "x", QUEM)).toMatchObject({
    ok: false,
    motivo: "chave-desconhecida",
  });
  expect(ehChave("nao.existe")).toBe(false);
  expect(await prisma.conteudoVersao.count()).toBe(0);
});

test("valor inválido é recusado com mensagem — e o site não muda", async () => {
  expect(await publicar("rodape.email", "nao-e-email", QUEM)).toMatchObject({
    ok: false,
    motivo: "invalido",
  });
  expect(await publicar("rodape.whatsapp", "61 99999-9999", QUEM)).toMatchObject({
    ok: false,
    motivo: "invalido",
  });
  // handle de Instagram não aceita nada que escape da URL
  expect(await publicar("rodape.instagram", "conta/../outra", QUEM)).toMatchObject({
    ok: false,
    motivo: "invalido",
  });
  expect(await prisma.conteudoSite.count()).toBe(0);
});

test("link de fundador só aceita https — javascript: não entra por construção", async () => {
  const base = { nome: "Fulano", papel: "faz coisas", instagram: "", autorizadoPor: "ele" };
  expect(
    await publicar("rodape.fundadores", [{ ...base, link: "javascript:alert(1)" }], QUEM),
  ).toMatchObject({ ok: false, motivo: "invalido" });
  expect(
    await publicar("rodape.fundadores", [{ ...base, link: "http://sem-tls.test" }], QUEM),
  ).toMatchObject({ ok: false, motivo: "invalido" });
  expect(
    await publicar("rodape.fundadores", [{ ...base, link: "https://ok.test/p" }], QUEM),
  ).toMatchObject({ ok: true });
});

test("fundador sem 'autorizado por' não publica — G5 do plano (LGPD)", async () => {
  const r = await publicar(
    "rodape.fundadores",
    [{ nome: "Fulano", papel: "faz coisas", instagram: "", link: "", autorizadoPor: "" }],
    QUEM,
  );
  expect(r).toMatchObject({ ok: false, motivo: "invalido" });
  expect(await prisma.conteudoSite.count()).toBe(0);
});

test("valor em formato inválido no banco cai no padrão em vez de derrubar", async () => {
  // simula rollback pra um formato antigo, ou edição manual no banco
  await prisma.conteudoSite.create({
    data: {
      chave: "rodape.fundadores",
      valor: { formato: "antigo" },
      atualizadoPor: QUEM,
    },
  });
  await expect(conteudoFresco("rodape.fundadores")).resolves.toEqual([]);
});

// ── Rascunho, publicação, audit log e rollback ─────────────────────────────

test("rascunho NÃO muda o site; publicar muda", async () => {
  expect(await salvarRascunho("rodape.telefone", "(61) 3333-3333", QUEM)).toMatchObject({
    ok: true,
  });
  expect(await conteudoFresco("rodape.telefone")).toBe(REGISTRO["rodape.telefone"].padrao);

  expect(await publicar("rodape.telefone", "(61) 4444-4444", QUEM)).toMatchObject({
    ok: true,
  });
  expect(await conteudoFresco("rodape.telefone")).toBe("(61) 4444-4444");
});

test("o histórico é o audit log: quem, quando e o quê, sem apagar nada", async () => {
  await publicar("rodape.telefone", "(61) 1111-1111", QUEM);
  await publicar("rodape.telefone", "(61) 2222-2222", "outro-admin");

  const h = await historico("rodape.telefone");
  expect(h).toHaveLength(2);
  expect(h[0].criadoPor).toBe("outro-admin"); // mais recente primeiro
  expect(h[1].criadoPor).toBe(QUEM);
  expect(h.every((v) => v.publicadoEm !== null)).toBe(true);
});

test("reverter republica o valor antigo criando versão NOVA (não apaga)", async () => {
  await publicar("rodape.telefone", "(61) 1111-1111", QUEM);
  await publicar("rodape.telefone", "(61) 2222-2222", QUEM);

  const antes = await historico("rodape.telefone");
  const primeira = antes[antes.length - 1];

  expect(await reverterPara(primeira.id, "quem-reverteu")).toMatchObject({ ok: true });
  expect(await conteudoFresco("rodape.telefone")).toBe("(61) 1111-1111");

  const depois = await historico("rodape.telefone");
  expect(depois).toHaveLength(3); // a reversão VIROU registro
  expect(depois[0].criadoPor).toBe("quem-reverteu");
});

// ── Gate: quem não é admin não edita ───────────────────────────────────────

test("sem credencial, a tela de conteúdo e as ações são barradas", async ({
  browser,
  baseURL,
}) => {
  // Contexto limpo: `test.use` global não vale aqui, senão o teste passaria
  // autenticado e não provaria nada.
  const ctx = await browser.newContext({ extraHTTPHeaders: {}, baseURL });
  const get = await ctx.request.get("/admin/conteudo", { failOnStatusCode: false });
  expect([401, 404]).toContain(get.status());

  // POST direto na rota (Server Action é endpoint HTTP como outro qualquer)
  const post = await ctx.request.post("/admin/conteudo", {
    failOnStatusCode: false,
    form: { chave: "rodape.telefone", valor: "(61) 9999-9999" },
  });
  expect([401, 404, 405]).toContain(post.status());

  // e nada foi gravado
  expect(await prisma.conteudoSite.count()).toBe(0);
  await ctx.close();
});

test.describe("com credencial de admin", () => {
  test.use({ extraHTTPHeaders: AUTH_ADMIN });

  test("a aba Conteúdo existe no /admin e abre o editor", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "Conteúdo" })).toBeVisible();

    await page.goto("/admin/conteudo");
    await expect(page.getByRole("heading", { name: "Conteúdo do site" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publicar" })).toBeVisible();
  });

  /**
   * O TESTE QUE JUSTIFICA A ONDA.
   *
   * Sem invalidação de cache, este é exatamente o cenário que falharia em
   * silêncio: o editor diz "publicado", e a home (prerenderizada) continua
   * mostrando o valor antigo até o próximo deploy.
   */
  test("publicar pelo /admin reflete no site PÚBLICO, sem deploy", async ({
    page,
    request,
  }) => {
    const novo = "(61) 98888-7777";

    // 1. o site ainda não mostra o telefone (padrão é vazio)
    expect(await (await request.get("/")).text()).not.toContain(novo);

    // 2. publica pela interface, como o dono faria
    await page.goto("/admin/conteudo?chave=rodape.telefone");
    await page.fill('input[name="valor"]', novo);
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText(/Publicado/)).toBeVisible();

    // 3. a home mostra o valor novo AGORA — sem rebuild, sem deploy
    expect(await (await request.get("/")).text()).toContain(novo);
  });

  test("HTML no campo sai escapado, não vira marcação", async ({ page, request }) => {
    // Curto de propósito: `rodape.telefone` tem teto de 24 caracteres, e o
    // teto é parte da defesa (texto gigante quebra layout).
    const payload = "<script>x</script>";
    await page.goto("/admin/conteudo?chave=rodape.telefone");
    await page.fill('input[name="valor"]', payload);
    await page.getByRole("button", { name: "Publicar" }).click();
    // Confirma que publicou de verdade antes de olhar a home — senão um
    // publish recusado passaria por "não vazou XSS", que é verde falso.
    await expect(page.getByText(/Publicado/)).toBeVisible();

    const html = await (await request.get("/")).text();
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
