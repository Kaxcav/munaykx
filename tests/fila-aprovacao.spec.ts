import { test, expect } from "@playwright/test";
import {
  AUTH_ADMIN,
  criarOrganizacao,
  limparOrganizacoes,
  prisma,
} from "./fixtures";
import { aprovar, recusar, listarPendentes } from "@/lib/aprovacao";
import { conteudoRecusa, emailComunidadeRecusada } from "@/lib/emails-aprovacao";
import { getCommunities, getCommunityBySlug } from "@/lib/communities";

/**
 * FILA DE APROVAÇÃO (STORY-009, frente B).
 *
 * As invariantes que este arquivo protege:
 *  - só admin abre a fila (Basic Auth no servidor; nada vem do form);
 *  - aprovar torna a comunidade visível nas portas públicas;
 *  - recusar mantém invisível E grava o status `recusada` (não apaga);
 *  - a decisão é transacional: só parte de `pendente`, e reprocessar é no-op;
 *  - o motivo do admin viaja no e-mail de recusa.
 */

const TEXTO_AUTORIZACAO =
  "Autorizo a MUNAY a publicar o nome e os dados desta comunidade. — responsável, 08/2026";

/** Cria uma org isolada e empurra a comunidade dela pra `pendente` com o texto
 *  de autorização aceito, como nasce quem se cadastra pelo painel. */
async function pendentePronta(nome: string) {
  const org = await criarOrganizacao(nome);
  await prisma.community.update({
    where: { id: org.communityId },
    data: {
      statusPublicacao: "pendente",
      autorizacaoTexto: TEXTO_AUTORIZACAO,
      autorizacaoEm: new Date(),
      demo: false, // parceiro "real": é o caso que a regra 3 vigia
    },
  });
  return org;
}

test.beforeEach(async () => {
  await limparOrganizacoes();
});

test.afterAll(async () => {
  await limparOrganizacoes();
  await prisma.$disconnect();
});

test("a fila só abre com Basic Auth — sem credencial, 401/404 (nunca 200)", async ({
  request,
}) => {
  await pendentePronta("gate");

  const semAuth = await request.get("/admin/aprovacoes", {
    failOnStatusCode: false,
  });
  // Sem credencial não passa: 401 (o middleware de Basic Auth desafia) ou 404
  // (o `assertAdmin` do layout, se o middleware for burlado). Nunca 200 — é a
  // mesma convenção do tests/admin.spec.ts. O que não pode é a fila abrir.
  expect([401, 404]).toContain(semAuth.status());

  const comAuth = await request.get("/admin/aprovacoes", { headers: AUTH_ADMIN });
  expect(comAuth.status()).toBe(200);
});

test("a fila mostra a pendente e o texto de autorização aceito", async ({
  request,
}) => {
  await pendentePronta("mostra");

  const resp = await request.get("/admin/aprovacoes", { headers: AUTH_ADMIN });
  const html = await resp.text();

  expect(html).toContain("Comunidade mostra");
  // "ver o texto aceito" (RODADA §B): sem isso, aprovar às cegas violaria a regra 3.
  expect(html).toContain(TEXTO_AUTORIZACAO);
});

test("aprovar abre as portas públicas — a comunidade passa a existir", async () => {
  const org = await pendentePronta("aprova");

  // antes: invisível
  expect(await getCommunityBySlug(org.communitySlug)).toBeNull();

  const r = await aprovar(org.communityId);
  expect(r.ok).toBe(true);

  // depois: visível na listagem e no detalhe
  expect(await getCommunityBySlug(org.communitySlug)).not.toBeNull();
  expect((await getCommunities()).map((c) => c.slug)).toContain(
    org.communitySlug,
  );

  const noBanco = await prisma.community.findUnique({
    where: { id: org.communityId },
    select: { statusPublicacao: true },
  });
  expect(noBanco?.statusPublicacao).toBe("aprovada");
});

test("recusar mantém fora do site, grava o status E o motivo (não apaga)", async () => {
  const org = await pendentePronta("recusa");
  const MOTIVO = "falta a autorização assinada do responsável pela marca";

  const r = await recusar(org.communityId, MOTIVO);
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.destino).toBe(org.email); // notifica o dono da org

  // continua invisível: PUBLICO exige `aprovada`, então `recusada` não vaza
  expect(await getCommunityBySlug(org.communitySlug)).toBeNull();
  expect((await getCommunities()).map((c) => c.slug)).not.toContain(
    org.communitySlug,
  );

  // e a linha CONTINUA no banco, recusada, com o motivo e a autorização — recusar
  // é status, não delete
  const noBanco = await prisma.community.findUnique({
    where: { id: org.communityId },
    select: {
      statusPublicacao: true,
      autorizacaoTexto: true,
      motivoRecusa: true,
    },
  });
  expect(noBanco?.statusPublicacao).toBe("recusada");
  expect(noBanco?.motivoRecusa).toBe(MOTIVO); // persistido, não só no e-mail
  expect(noBanco?.autorizacaoTexto).toBe(TEXTO_AUTORIZACAO); // a prova fica
});

test("a decisão é transacional: só parte de pendente, reprocessar é no-op", async () => {
  const org = await pendentePronta("guarda");

  const primeira = await aprovar(org.communityId);
  expect(primeira.ok).toBe(true);

  // Quebra da guarda de propósito: decidir de novo NÃO pode re-disparar.
  const segunda = await aprovar(org.communityId);
  expect(segunda.ok).toBe(false);
  if (!segunda.ok) expect(segunda.motivo).toBe("nao-pendente");

  // recusar depois de aprovada também é barrado — a comunidade já saiu da fila
  const tentaRecusar = await recusar(org.communityId, "tarde demais");
  expect(tentaRecusar.ok).toBe(false);

  // e o estado não regrediu
  const noBanco = await prisma.community.findUnique({
    where: { id: org.communityId },
    select: { statusPublicacao: true },
  });
  expect(noBanco?.statusPublicacao).toBe("aprovada");

  // id inexistente é recusado com clareza, sem lançar
  const fantasma = await aprovar("nao-existe-este-id");
  expect(fantasma.ok).toBe(false);
});

test("a pendente sai da fila depois de decidida", async () => {
  const org = await pendentePronta("some");
  expect((await listarPendentes()).map((c) => c.id)).toContain(org.communityId);

  await aprovar(org.communityId);
  expect((await listarPendentes()).map((c) => c.id)).not.toContain(
    org.communityId,
  );
});

test("o e-mail de recusa carrega o motivo escrito pelo admin", async () => {
  const motivo = "falta a autorização assinada do responsável pela marca";
  const { html, text } = conteudoRecusa({ nome: "Comunidade X", motivo });
  expect(html).toContain(motivo);
  expect(text).toContain(motivo);

  // Sem EMAIL_PROVIDER (a suíte roda com e-mail desligado), enviar é no-op
  // logado: nada sai de verdade e o domínio sem MX não quebra nada.
  const r = await emailComunidadeRecusada({
    para: "zzt-dono@teste.invalid",
    nome: "Comunidade X",
    motivo,
  });
  expect(r.ok).toBe(false);
});
