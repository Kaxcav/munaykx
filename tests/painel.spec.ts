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
  cancelarEvento,
  criarEvento,
  editarComunidade,
  editarEvento,
  csvDeInscritos,
} from "@/lib/painel";
import { inscritosDoEvento } from "@/lib/organizacao";

/**
 * PAINEL DO ORGANIZADOR (STORY-009, frente C).
 *
 * Igual ao escopo-painel: o que se testa é CONTENÇÃO. Duas organizações, e a
 * pergunta é sempre "A consegue tocar/ver algo de B?". A resposta certa é
 * sempre `nao-dono`/`null` → 404, nunca 403. Mais: cancelar é status e NÃO
 * promove fila; CSV é por evento; a sessão é do servidor, nunca do form.
 */

let A: OrgDeTeste;
let B: OrgDeTeste;

test.beforeEach(async () => {
  await limparOrganizacoes();
  // Nomes minúsculos DE PROPÓSITO: o slug do fixture (`zzt-<nome>-ev`) passa
  // pelo `eventAdminSchema` na edição, e o slugSchema (com razão) recusa
  // maiúscula. "orgA"/"orgB" quebrariam o teste sem quebrar o código.
  A = await criarOrganizacao("alfa");
  B = await criarOrganizacao("beta");
});

test.afterAll(async () => {
  await limparOrganizacoes();
  await prisma.$disconnect();
});

const eventoBase = (over: Record<string, unknown>) => ({
  communityId: "",
  titulo: "Evento",
  slug: `${PREFIXO}ev`,
  startsAt: "2026-12-01T19:00",
  city: "",
  local: "Quadra",
  capacidade: "10",
  gratuito: true,
  demo: false,
  ativo: true,
  ...over,
});

test("sem sessão, /painel manda pro /entrar (a sessão é do servidor)", async ({
  request,
}) => {
  // A suíte roda com auth desligada, então `sessaoAtual()` é sempre null: todo
  // o painel exige login. Prova que o acesso não depende de nada do cliente.
  const r = await request.get("/painel");
  expect(r.url()).toContain("/entrar");
});

test("o CSV de um evento exige sessão no servidor — sem ela, 401", async ({
  request,
}) => {
  const r = await request.get("/painel/eventos/qualquer-id/csv", {
    failOnStatusCode: false,
  });
  expect(r.status()).toBe(401);
});

test("criar evento: dono cria; em comunidade de outro, nao-dono", async () => {
  const meu = await criarEvento(
    A.userId,
    eventoBase({ communityId: A.communityId, slug: `${PREFIXO}novo-a-ev` }),
  );
  expect(meu.ok).toBe(true);

  const invasor = await criarEvento(
    A.userId,
    eventoBase({ communityId: B.communityId, slug: `${PREFIXO}invasor-ev` }),
  );
  expect(invasor.ok).toBe(false);
  if (!invasor.ok) expect(invasor.motivo).toBe("nao-dono");

  // e nada foi criado na comunidade de B
  const criouEmB = await prisma.event.count({
    where: { communityId: B.communityId, slug: `${PREFIXO}invasor-ev` },
  });
  expect(criouEmB).toBe(0);
});

test("editar evento: no de outro é nao-dono; no próprio, muda", async () => {
  const cross = await editarEvento(
    A.userId,
    B.eventId,
    eventoBase({ communityId: B.communityId, titulo: "Hack", slug: `${PREFIXO}hack-ev` }),
  );
  expect(cross.ok).toBe(false);

  const b = await prisma.event.findUnique({ where: { id: B.eventId } });
  expect(b?.titulo).not.toBe("Hack"); // B intacto

  const meu = await editarEvento(
    A.userId,
    A.eventId,
    // mantém o slug do fixture pra não colidir; muda o título
    eventoBase({ communityId: A.communityId, titulo: "Editado", slug: `${PREFIXO}alfa-ev` }),
  );
  expect(meu.ok).toBe(true);
  const a = await prisma.event.findUnique({ where: { id: A.eventId } });
  expect(a?.titulo).toBe("Editado");
});

test("cancelar é status, é escopado por dono, e NÃO promove a fila", async () => {
  // Um evento de A com 1 vaga, um confirmado e um na lista de espera.
  const ev = await prisma.event.create({
    data: {
      communityId: A.communityId,
      slug: `${PREFIXO}cancel-ev`,
      titulo: "Pra cancelar",
      startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      capacidade: 1,
      demo: true,
    },
  });
  await prisma.rsvp.create({
    data: {
      eventId: ev.id,
      nome: "Confirmado",
      email: `${PREFIXO}conf${DOMINIO_TESTE}`,
      status: "confirmado",
    },
  });
  const espera = await prisma.rsvp.create({
    data: {
      eventId: ev.id,
      nome: "Espera",
      email: `${PREFIXO}espera${DOMINIO_TESTE}`,
      status: "lista_espera",
    },
  });

  // B não cancela evento de A
  const cross = await cancelarEvento(B.userId, ev.id);
  expect(cross.ok).toBe(false);
  expect((await prisma.event.findUnique({ where: { id: ev.id } }))?.canceladoEm).toBeNull();

  // A cancela: vira status, sem apagar
  const r = await cancelarEvento(A.userId, ev.id);
  expect(r.ok).toBe(true);
  const depois = await prisma.event.findUnique({ where: { id: ev.id } });
  expect(depois?.canceladoEm).not.toBeNull();

  // e a lista de espera NÃO foi promovida (cancelar não abre vaga)
  const esperaDepois = await prisma.rsvp.findUnique({ where: { id: espera.id } });
  expect(esperaDepois?.status).toBe("lista_espera");
});

test("editar comunidade: a de outro é nao-dono; a própria, muda", async () => {
  const cross = await editarComunidade(A.userId, B.communitySlug, {
    descricao: "invadido",
    horarios: "",
    local: "",
    nivel: "",
    ativo: true,
  });
  expect(cross.ok).toBe(false);

  const dono = await editarComunidade(A.userId, A.communitySlug, {
    descricao: "Nova descrição da A",
    horarios: "Seg e Qua 19h",
    local: "",
    nivel: "",
    ativo: true,
  });
  expect(dono.ok).toBe(true);
  const c = await prisma.community.findUnique({ where: { id: A.communityId } });
  expect(c?.descricao).toBe("Nova descrição da A");
  // não vazou pra B
  const cb = await prisma.community.findUnique({ where: { id: B.communityId } });
  expect(cb?.descricao).not.toBe("invadido");
});

test("CSV é por evento e escopado ao dono; A não alcança inscritos de B", async () => {
  const meus = await inscritosDoEvento(A.userId, A.eventId);
  expect(meus).not.toBeNull();
  expect(meus!.inscritos.length).toBeGreaterThan(0);

  const csv = csvDeInscritos(meus!.inscritos);
  expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM pro Excel pt-BR
  expect(csv).toContain("nome;email;whatsapp"); // cabeçalho
  expect(csv).toContain(meus!.inscritos[0].email); // dado do evento certo

  // e não há caminho pro evento de B
  expect(await inscritosDoEvento(A.userId, B.eventId)).toBeNull();
});
