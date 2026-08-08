import { test, expect } from "@playwright/test";
import { criarEvento, limparFixtures, prisma } from "./fixtures";
import { getCommunities, getCommunityBySlug, getCommunityFacets } from "@/lib/communities";
import { recortesComDado } from "@/lib/descoberta";
import { getUpcomingEvents, getEventBySlug } from "@/lib/events";

/**
 * O PORTÃO DE APROVAÇÃO — comunidade `pendente` não existe pro mundo.
 *
 * Por que este arquivo existe separado: o portão não falha na página que
 * alguém lembrou de proteger. Falha na que ninguém lembrou. São seis portas
 * (listagem, detalhe, facetas, recorte de SEO, sitemap, evento) e basta UMA
 * esquecer o filtro pra comunidade não aprovada aparecer no site — sem erro,
 * sem alerta, sem ninguém perceber.
 *
 * Cada teste aqui é uma dessas portas. Se você adicionar uma sétima consulta
 * pública, adicione o teste junto.
 */

const SLUG = "zzt-pendente-com";

test.beforeAll(async () => {
  await limparFixtures();
  const criado = await criarEvento({ nome: "pendente", modalidade: "Xadrez" });
  // Nasce aprovada pelo fixture; empurramos pra pendente, que é o estado de
  // quem acabou de se cadastrar pelo painel.
  await prisma.community.update({
    where: { slug: SLUG },
    data: { statusPublicacao: "pendente" },
  });
  expect(criado.comunidadeSlug).toBe(SLUG);
});

test.afterAll(async () => {
  await limparFixtures();
  await prisma.$disconnect();
});

test("porta 1 — não aparece na listagem de /comunidades", async () => {
  const todas = await getCommunities();
  expect(todas.map((c) => c.slug)).not.toContain(SLUG);
});

test("porta 2 — a página da comunidade responde como inexistente", async () => {
  expect(await getCommunityBySlug(SLUG)).toBeNull();
});

test("porta 3 — a modalidade dela não vaza pros filtros", async () => {
  // Faceta é vazamento sutil: a comunidade não aparece, mas "Xadrez" surge
  // no dropdown e denuncia que existe algo escondido ali.
  const { modalidades } = await getCommunityFacets();
  expect(modalidades).not.toContain("Xadrez");
});

test("porta 4 — não gera página de recorte no /descobrir", async () => {
  const recortes = await recortesComDado();
  expect(recortes.map((r) => r.modalidade)).not.toContain("Xadrez");
});

test("porta 5 — os EVENTOS dela também somem, não só ela", async () => {
  // O buraco clássico: esconde a comunidade e esquece que os eventos têm
  // URL própria e entram no sitemap sozinhos.
  const eventos = await getUpcomingEvents();
  expect(eventos.map((e) => e.slug)).not.toContain("zzt-pendente-ev");
  expect(await getEventBySlug("zzt-pendente-ev")).toBeNull();
});

test("porta 6 — o sitemap não entrega o caminho pro Google", async ({
  request,
}) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).not.toContain(SLUG);
  expect(xml).not.toContain("zzt-pendente-ev");
});

test("aprovar faz a comunidade existir — o portão abre, não só fecha", async () => {
  await prisma.community.update({
    where: { slug: SLUG },
    data: { statusPublicacao: "aprovada" },
  });

  // Sem esta metade, um filtro que esconde TUDO passaria nos testes acima.
  expect(await getCommunityBySlug(SLUG)).not.toBeNull();
  expect((await getCommunities()).map((c) => c.slug)).toContain(SLUG);
  expect((await getCommunityFacets()).modalidades).toContain("Xadrez");
  expect(await getEventBySlug("zzt-pendente-ev")).not.toBeNull();

  await prisma.community.update({
    where: { slug: SLUG },
    data: { statusPublicacao: "pendente" },
  });
});

test("ninguém se inscreve em evento de comunidade não aprovada", async ({
  request,
}) => {
  const resp = await request.post("/api/rsvps", {
    data: {
      eventSlug: "zzt-pendente-ev",
      nome: "Tentativa",
      email: "zzt-tentativa@teste.invalid",
    },
    failOnStatusCode: false,
  });
  // 404 e não 403: a API não confirma que o evento existe.
  expect(resp.status()).toBe(404);

  const gravado = await prisma.rsvp.findFirst({
    where: { email: "zzt-tentativa@teste.invalid" },
  });
  expect(gravado, "gravou inscrição em comunidade não aprovada").toBeNull();
});
