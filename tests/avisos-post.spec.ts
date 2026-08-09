import { test, expect } from "@playwright/test";
import {
  criarOrganizacao,
  limparOrganizacoes,
  prisma,
  PREFIXO,
  DOMINIO_TESTE,
  type OrgDeTeste,
} from "./fixtures";
import {
  avisarSeguidoresDePostNovo,
  tokenDescadastroPost,
  lerTokenDescadastroPost,
} from "@/lib/avisos-post";
import { lerTokenDescadastro } from "@/lib/avisos-evento";
import { conteudoAvisoNovo, emailAvisoNovo } from "@/lib/emails-post";
import { publicarAviso, definirAvisoPosts } from "@/lib/posts";
import { seguir } from "@/lib/membership";

/**
 * STORY-010 slice de e-mail — opt-in, teto diário com cota própria e
 * descadastro assinado.
 *
 * Envio mockado (a suíte roda com e-mail desligado → no-op); o que se testa é
 * a ORQUESTRAÇÃO: quem entra no disparo, o teto, e a assinatura do link.
 */

let A: OrgDeTeste;

async function criarUsuario(email: string) {
  return prisma.user.create({
    data: { name: `Seguidor ${email}`, email, emailVerified: true },
  });
}

async function publicar(corpo: string): Promise<string> {
  const r = await publicarAviso(A.userId, A.communitySlug, { corpo });
  if (!r.ok) throw new Error(`publicação falhou: ${r.motivo}`);
  return r.dados.id;
}

test.beforeEach(async () => {
  await limparOrganizacoes();
  A = await criarOrganizacao("mailpost");
});

test.afterAll(async () => {
  await limparOrganizacoes();
  await prisma.$disconnect();
});

test("aviso por e-mail é OPT-IN: quem só segue não recebe nada", async () => {
  const u = await criarUsuario(`${PREFIXO}optin${DOMINIO_TESTE}`);
  await seguir(u.id, A.communityId); // avisarPosts nasce FALSE

  expect(await avisarSeguidoresDePostNovo(await publicar("Treino às 7h"))).toBe(0);
});

test("quem ligou recebe UMA vez; teto de 1/comunidade/dia (5 avisos = 1 e-mail)", async () => {
  const u = await criarUsuario(`${PREFIXO}teto${DOMINIO_TESTE}`);
  await seguir(u.id, A.communityId);
  await definirAvisoPosts(u.id, A.communityId, true);

  expect(await avisarSeguidoresDePostNovo(await publicar("aviso 1"))).toBe(1);
  // mais quatro no mesmo dia: o teto segura todos
  for (const n of [2, 3, 4, 5]) {
    expect(await avisarSeguidoresDePostNovo(await publicar(`aviso ${n}`))).toBe(0);
  }
});

test("o teto de POST tem cota própria: não é consumido pelo aviso de evento", async () => {
  const u = await criarUsuario(`${PREFIXO}cota${DOMINIO_TESTE}`);
  await seguir(u.id, A.communityId);
  await definirAvisoPosts(u.id, A.communityId, true);

  // simula "já foi avisado de EVENTO hoje" — a coluna do evento, não a de post
  await prisma.membership.updateMany({
    where: { userId: u.id, communityId: A.communityId },
    data: { ultimoAvisoEm: new Date() },
  });

  // o aviso de post continua saindo: as cotas são separadas de propósito
  expect(await avisarSeguidoresDePostNovo(await publicar("cancelou o treino"))).toBe(1);
});

test("aviso oculto não dispara e-mail", async () => {
  const u = await criarUsuario(`${PREFIXO}oculto${DOMINIO_TESTE}`);
  await seguir(u.id, A.communityId);
  await definirAvisoPosts(u.id, A.communityId, true);

  const id = await publicar("vai ser ocultado");
  await prisma.post.update({
    where: { id },
    data: { ocultoEm: new Date(), ocultoMotivo: "teste" },
  });

  expect(await avisarSeguidoresDePostNovo(id)).toBe(0);
});

test("comunidade não aprovada não dispara e-mail", async () => {
  const u = await criarUsuario(`${PREFIXO}pendente${DOMINIO_TESTE}`);
  await seguir(u.id, A.communityId);
  await definirAvisoPosts(u.id, A.communityId, true);

  const id = await publicar("publicado enquanto aprovada");
  await prisma.community.update({
    where: { id: A.communityId },
    data: { statusPublicacao: "pendente" },
  });

  expect(await avisarSeguidoresDePostNovo(id)).toBe(0);
});

test("quem não segue não recebe, mesmo com aviso ligado em OUTRA comunidade", async () => {
  const B = await criarOrganizacao("mailpostb");
  const u = await criarUsuario(`${PREFIXO}outra${DOMINIO_TESTE}`);
  await seguir(u.id, B.communityId);
  await definirAvisoPosts(u.id, B.communityId, true);

  expect(await avisarSeguidoresDePostNovo(await publicar("aviso da A"))).toBe(0);
});

test("o e-mail carrega o corpo escapado, o link da comunidade e o descadastro", async () => {
  const { html, text } = conteudoAvisoNovo({
    comunidade: { nome: "Corrida Sudoeste", slug: "zzt-corrida-sudoeste" },
    corpo: "<b>chuva</b> — treino no ginásio, veja https://mapa.test/x",
    tokenDescadastro: "tok.abc",
  });

  expect(html).toContain("Corrida Sudoeste");
  expect(html).toContain("/comunidades/zzt-corrida-sudoeste");
  expect(html).toContain("/descadastrar/tok.abc");
  expect(text).toContain("/descadastrar/tok.abc"); // URL sobrevive no text/plain
  // corpo de terceiro entrando em HTML: escapado, e o link com nofollow ugc
  expect(html).toContain("&lt;b&gt;chuva&lt;/b&gt;");
  expect(html).not.toContain("<b>chuva</b>");
  expect(html).toContain('rel="nofollow ugc noopener"');

  const r = await emailAvisoNovo({
    para: `${PREFIXO}dest${DOMINIO_TESTE}`,
    comunidade: { nome: "Corrida Sudoeste", slug: "zzt-corrida-sudoeste" },
    corpo: "chuva",
    tokenDescadastro: "tok.abc",
  });
  expect(r.ok).toBe(false); // sem provider → no-op
});

test("token de descadastro de post: válido volta; adulterado é null; não se cruza com o de evento", () => {
  const t = tokenDescadastroPost("user-1", "com-1");
  expect(lerTokenDescadastroPost(t)).toEqual({ userId: "user-1", communityId: "com-1" });
  expect(lerTokenDescadastroPost(t + "x")).toBeNull();
  expect(lerTokenDescadastroPost("lixo")).toBeNull();

  // O propósito vai ASSINADO dentro do token: um link de post não pode
  // desligar o aviso de evento (nem o contrário), mesmo com assinatura válida.
  expect(lerTokenDescadastro(t)).toBeNull();
});

test("descadastro pelo link (deslogado) desliga só o aviso de POST", async ({ request }) => {
  // O servidor da suíte roda com BETTER_AUTH_SECRET="" (playwright.config), e o
  // token é assinado com esse segredo. O processo de teste tem que gerar o
  // token com o MESMO valor — senão, num CI que define o segredo pro runner, a
  // assinatura do teste não bate com a do servidor. (Foi o que pegou na 008: o
  // verde local, com os dois lados vazios, era o acidente.)
  const secretoAntes = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = "";
  try {
    const u = await criarUsuario(`${PREFIXO}descpost${DOMINIO_TESTE}`);
    await seguir(u.id, A.communityId);
    await definirAvisoPosts(u.id, A.communityId, true);

    const t = tokenDescadastroPost(u.id, A.communityId);
    const resp = await request.get(`/descadastrar/${t}`);
    expect(resp.status()).toBe(200);

    const m = await prisma.membership.findUnique({
      where: { userId_communityId: { userId: u.id, communityId: A.communityId } },
      select: { avisarPosts: true, avisarEventos: true },
    });
    expect(m?.avisarPosts).toBe(false);
    // o aviso de EVENTO continua ligado: o link desligou o que prometia
    expect(m?.avisarEventos).toBe(true);

    // token forjado não desliga ninguém
    const u2 = await criarUsuario(`${PREFIXO}descpost2${DOMINIO_TESTE}`);
    await seguir(u2.id, A.communityId);
    await definirAvisoPosts(u2.id, A.communityId, true);
    const resp2 = await request.get(
      `/descadastrar/${tokenDescadastroPost(u2.id, A.communityId)}x`,
      { failOnStatusCode: false },
    );
    expect(resp2.status()).toBe(200);
    expect(
      (
        await prisma.membership.findUnique({
          where: { userId_communityId: { userId: u2.id, communityId: A.communityId } },
          select: { avisarPosts: true },
        })
      )?.avisarPosts,
    ).toBe(true);
  } finally {
    if (secretoAntes === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = secretoAntes;
  }
});
