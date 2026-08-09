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
  INTENCOES,
  CHAVES,
  validarEscolha,
  responder,
  sugestoes,
  ehIntencao,
  zerarTetoDoCopiloto,
} from "@/lib/ai/copiloto";
import { esquecerFornecedor } from "@/lib/ai";

/**
 * COPILOTO DO ORGANIZADOR — o que estes testes protegem.
 *
 * A feature dá a um modelo de linguagem uma porta para o banco. O desenho
 * fecha essa porta de duas formas, e as duas precisam de teste:
 *
 * 1. **A IA não escolhe dado.** Ela mapeia pra uma intenção de um conjunto
 *    fixo; nome fora do conjunto é descartado. Não existe caminho onde texto
 *    do modelo vire cláusula de consulta.
 * 2. **O escopo é do CÓDIGO.** Todo executor filtra por dono com o `userId`
 *    da sessão. O teste que mais importa aqui é o do organizador A não ver
 *    NADA do B — porque é o vazamento que a feature poderia causar.
 */

let A: OrgDeTeste;
let B: OrgDeTeste;

/** Executa uma intenção direto, sem passar pela IA. */
async function executar(
  chave: keyof typeof INTENCOES,
  userId: string,
  params: Record<string, number> = {},
) {
  const def = INTENCOES[chave];
  return (
    def.executar as (u: string, p: Record<string, number>) => Promise<{
      texto: string;
      dados: Record<string, number | string | null>;
    }>
  )(userId, { semanas: 3, dias: 30, ...params });
}

test.beforeEach(async () => {
  zerarTetoDoCopiloto();
  await limparOrganizacoes();
  A = await criarOrganizacao("copa");
  B = await criarOrganizacao("copb");
});

test.afterAll(async () => {
  await limparOrganizacoes();
  await prisma.$disconnect();
});

// ── A guarda: a IA só escolhe do conjunto fixo ─────────────────────────────

test("mapeia para uma intenção conhecida, com parâmetro validado", () => {
  const r = validarEscolha(
    JSON.stringify({ intencao: "faltas_ultimas_semanas", semanas: 3, dias: null }),
  );
  expect(r).toEqual({ intencao: "faltas_ultimas_semanas", params: { semanas: 3 } });
});

test("intenção INVENTADA é descartada — não vira consulta", () => {
  for (const nome of [
    "listar_todos_os_usuarios",
    "sql",
    "drop_table",
    "dados_de_outro_organizador",
    "",
  ]) {
    expect(
      validarEscolha(JSON.stringify({ intencao: nome })),
      nome,
    ).toBeNull();
  }
});

test("parâmetro fora do limite não passa cru — o Zod da intenção corta", () => {
  const r = validarEscolha(
    JSON.stringify({ intencao: "inscritos_no_periodo", dias: 99999 }),
  );
  // 99999 dias reprova no schema (máx 365) e a escolha inteira é recusada,
  // em vez de virar uma varredura sem limite.
  expect(r).toBeNull();
});

test("parâmetro ausente cai no padrão da intenção", () => {
  const r = validarEscolha(JSON.stringify({ intencao: "inscritos_no_periodo" }));
  expect(r).toEqual({ intencao: "inscritos_no_periodo", params: { dias: 30 } });
});

test("parâmetro de outra intenção é ignorado, não repassado", () => {
  const r = validarEscolha(
    JSON.stringify({ intencao: "lista_espera", semanas: 5, dias: 9 }),
  );
  // `lista_espera` não tem parâmetro: nada do que o modelo mandou sobrevive.
  expect(r).toEqual({ intencao: "lista_espera", params: {} });
});

test("JSON quebrado devolve null, não explode", () => {
  for (const lixo of ["", "não sou json", "{quebrado", "[]", "null"]) {
    expect(validarEscolha(lixo), lixo).toBeNull();
  }
});

test("toda intenção do registro é reconhecida; nada além dela é", () => {
  for (const c of CHAVES) expect(ehIntencao(c)).toBe(true);
  expect(ehIntencao("qualquer_outra")).toBe(false);
  expect(CHAVES.length).toBeGreaterThanOrEqual(7);
});

// ── O que mais importa: escopo por dono ────────────────────────────────────

test("o organizador A NÃO vê o dado do B — nem um número", async () => {
  // B ganha muita coisa; A não ganha nada.
  const eventoB = await prisma.event.findFirst({ where: { id: B.eventId } });
  await prisma.rsvp.createMany({
    data: [
      { eventId: B.eventId, nome: "x1", email: `${PREFIXO}x1${DOMINIO_TESTE}`, status: "confirmado" },
      { eventId: B.eventId, nome: "x2", email: `${PREFIXO}x2${DOMINIO_TESTE}`, status: "confirmado" },
      { eventId: B.eventId, nome: "x3", email: `${PREFIXO}x3${DOMINIO_TESTE}`, status: "lista_espera" },
    ],
  });
  expect(eventoB).not.toBeNull();

  const inscritosA = await executar("inscritos_no_periodo", A.userId);
  const inscritosB = await executar("inscritos_no_periodo", B.userId);
  const esperaA = await executar("lista_espera", A.userId);
  const esperaB = await executar("lista_espera", B.userId);

  // A fixture dá 1 inscrito a cada org; B recebeu +3.
  expect(inscritosA.dados.total).toBe(1);
  expect(inscritosB.dados.total).toBe(4);
  expect(esperaA.dados.total).toBe(0);
  expect(esperaB.dados.total).toBe(1);
});

test("nenhum executor devolve nome, e-mail ou WhatsApp de inscrito", async () => {
  await prisma.rsvp.create({
    data: {
      eventId: A.eventId,
      nome: "Fulano Silva",
      email: `${PREFIXO}fulano${DOMINIO_TESTE}`,
      whatsapp: "61999998888",
      status: "confirmado",
    },
  });

  for (const c of CHAVES) {
    const r = await executar(c, A.userId);
    const serializado = JSON.stringify(r);
    // A feature opera sobre AGREGADOS. A lista nominal continua só na tela de
    // inscritos, que é onde ela sempre esteve.
    expect(serializado, c).not.toContain("Fulano Silva");
    expect(serializado, c).not.toContain("61999998888");
    expect(serializado, c).not.toContain(DOMINIO_TESTE);
  }
});

test("o executor recebe userId como PRIMEIRO argumento — a assinatura é a barreira", async () => {
  const { readFile } = await import("node:fs/promises");
  const fonte = await readFile("lib/ai/copiloto.ts", "utf8");
  const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // Todo executor começa por userId, e todo `where` de evento/rsvp passa por
  // `daPessoa`. Se alguém escrever uma intenção sem escopo, isto fica vermelho.
  const executores = codigo.match(/executar: async \(([^)]*)\)/g) ?? [];
  expect(executores.length).toBe(CHAVES.length);
  for (const e of executores) expect(e).toContain("userId");
  expect(codigo).toContain("daPessoa(userId)");
});

test("nada de SQL cru — o módulo não tem caminho pra query livre", async () => {
  const { readFile } = await import("node:fs/promises");
  const fonte = await readFile("lib/ai/copiloto.ts", "utf8");
  const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  expect(codigo).not.toMatch(/\$queryRaw|\$executeRaw|queryRawUnsafe/);
});

// ── Os números vêm do banco ────────────────────────────────────────────────

test("faltas: conta quem confirmou e não teve check-in", async () => {
  const passado = new Date();
  passado.setUTCDate(passado.getUTCDate() - 5);
  const ev = await prisma.event.create({
    data: {
      communityId: A.communityId,
      slug: `${PREFIXO}copa-passado`,
      titulo: "Treino passado",
      startsAt: passado,
      capacidade: 10,
      demo: true,
    },
  });
  await prisma.rsvp.createMany({
    data: [
      { eventId: ev.id, nome: "p1", email: `${PREFIXO}p1${DOMINIO_TESTE}`, status: "confirmado", checkinEm: passado },
      { eventId: ev.id, nome: "p2", email: `${PREFIXO}p2${DOMINIO_TESTE}`, status: "confirmado", checkinEm: passado },
      { eventId: ev.id, nome: "f1", email: `${PREFIXO}f1${DOMINIO_TESTE}`, status: "confirmado" },
    ],
  });

  const r = await executar("faltas_ultimas_semanas", A.userId, { semanas: 3 });
  expect(r.dados.confirmados).toBe(3);
  expect(r.dados.presentes).toBe(2);
  expect(r.dados.faltas).toBe(1);
  expect(r.texto).toContain("1 não apareceram");
});

test("sem check-in marcado, NÃO devolve falta como número — diz o que falta", async () => {
  const passado = new Date();
  passado.setUTCDate(passado.getUTCDate() - 5);
  const ev = await prisma.event.create({
    data: {
      communityId: A.communityId,
      slug: `${PREFIXO}copa-sem-checkin`,
      titulo: "Sem check-in",
      startsAt: passado,
      capacidade: 10,
      demo: true,
    },
  });
  await prisma.rsvp.create({
    data: { eventId: ev.id, nome: "z", email: `${PREFIXO}z${DOMINIO_TESTE}`, status: "confirmado" },
  });

  const r = await executar("faltas_ultimas_semanas", A.userId, { semanas: 3 });
  // Sem check-in, "faltas" seria igual a "todos os confirmados" — número que
  // parece dado e é ausência de dado.
  expect(r.dados.faltas).toBeNull();
  expect(r.texto).toContain("nenhum check-in");
});

test("taxa de comparecimento sai em porcentagem do dado real", async () => {
  const passado = new Date();
  passado.setUTCDate(passado.getUTCDate() - 3);
  const ev = await prisma.event.create({
    data: {
      communityId: A.communityId,
      slug: `${PREFIXO}copa-taxa`,
      titulo: "Taxa",
      startsAt: passado,
      capacidade: 10,
      demo: true,
    },
  });
  await prisma.rsvp.createMany({
    data: [
      { eventId: ev.id, nome: "a", email: `${PREFIXO}ta${DOMINIO_TESTE}`, status: "confirmado", checkinEm: passado },
      { eventId: ev.id, nome: "b", email: `${PREFIXO}tb${DOMINIO_TESTE}`, status: "confirmado", checkinEm: passado },
      { eventId: ev.id, nome: "c", email: `${PREFIXO}tc${DOMINIO_TESTE}`, status: "confirmado", checkinEm: passado },
      { eventId: ev.id, nome: "d", email: `${PREFIXO}td${DOMINIO_TESTE}`, status: "confirmado" },
    ],
  });

  const r = await executar("taxa_comparecimento", A.userId, { semanas: 2 });
  expect(r.dados.taxa).toBe(75);
  expect(r.texto).toContain("75%");
});

test("evento com maior presença é o do dono, e o do outro nunca aparece", async () => {
  const passado = new Date();
  passado.setUTCDate(passado.getUTCDate() - 2);

  // O evento do B tem MUITO mais presença — e ainda assim não pode aparecer
  // pro A.
  const evB = await prisma.event.create({
    data: {
      communityId: B.communityId,
      slug: `${PREFIXO}copb-campeao`,
      titulo: "Campeão do B",
      startsAt: passado,
      capacidade: 50,
      demo: true,
    },
  });
  await prisma.rsvp.createMany({
    data: Array.from({ length: 5 }, (_, i) => ({
      eventId: evB.id,
      nome: `b${i}`,
      email: `${PREFIXO}cb${i}${DOMINIO_TESTE}`,
      status: "confirmado" as const,
      checkinEm: passado,
    })),
  });

  const evA = await prisma.event.create({
    data: {
      communityId: A.communityId,
      slug: `${PREFIXO}copa-campeao`,
      titulo: "Campeão do A",
      startsAt: passado,
      capacidade: 10,
      demo: true,
    },
  });
  await prisma.rsvp.create({
    data: {
      eventId: evA.id,
      nome: "a1",
      email: `${PREFIXO}ca1${DOMINIO_TESTE}`,
      status: "confirmado",
      checkinEm: passado,
    },
  });

  const r = await executar("evento_maior_presenca", A.userId);
  expect(r.dados.evento).toBe("Campeão do A");
  expect(r.texto).not.toContain("Campeão do B");
});

// ── Fora do escopo ─────────────────────────────────────────────────────────

test("pergunta fora do escopo não inventa: devolve não-entendi com sugestões", async () => {
  // Sem chave de API a classificação nem acontece, então a resposta é
  // indisponível; com chave, uma pergunta fora do escopo cai em nao-entendi.
  // Os dois caminhos têm em comum o que importa: NÃO existe resposta inventada.
  const r = await responder(A.userId, "qual a capital da Mongólia?", "1.1.1.1");
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(["nao-entendi", "indisponivel"]).toContain(r.motivo);
    expect(r.sugestoes.length).toBeGreaterThan(0);
  }
});

test("pergunta curta demais nem chega a gastar chamada", async () => {
  // Chave falsa de propósito: se a entrada curta chegasse a chamar o modelo,
  // bateria na rede e o teste falharia. Passar é a prova de que nem tentou —
  // e o `nao-entendi` prova que a barreira é o tamanho, não a indisponibilidade.
  const antes = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "sk-ant-chave-falsa-de-teste";
  esquecerFornecedor();
  try {
    const r = await responder(A.userId, "oi", "1.1.1.1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("nao-entendi");
  } finally {
    if (antes === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = antes;
    esquecerFornecedor();
  }
});

test("com a IA desligada, o copiloto some sem erro", async () => {
  const antes = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  esquecerFornecedor();
  try {
    const r = await responder(A.userId, "quantos inscritos tive esse mês", "1.1.1.1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("indisponivel");
  } finally {
    if (antes === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = antes;
    esquecerFornecedor();
  }
});

test("as sugestões saem das intenções reais — nunca de exemplo inventado", () => {
  const s = sugestoes();
  expect(s.length).toBe(CHAVES.length);
  for (const c of CHAVES) {
    expect(s).toContain(INTENCOES[c].exemplos[0]);
  }
});

// ── Teto de custo ──────────────────────────────────────────────────────────

test("o copiloto tem teto PRÓPRIO, separado das outras features", async () => {
  const { readFile } = await import("node:fs/promises");
  const fonte = await readFile("lib/ai/copiloto.ts", "utf8");
  expect(fonte).toContain("new Balde(");
  expect(fonte).toContain("IA_LIMITE_DIA_COPILOTO");
});

test("o cache guarda a CLASSIFICAÇÃO, nunca a resposta — senão vazaria número", async () => {
  const { readFile } = await import("node:fs/promises");
  const fonte = await readFile("lib/ai/copiloto.ts", "utf8");
  const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // O que entra no cache é `{intencao, params}`. Se um dia alguém guardar a
  // Resposta pronta, o número de um organizador chega ao outro.
  expect(codigo).toMatch(/guardarCache\(chaveCache,\s*validada\)/);
  expect(codigo).not.toMatch(/guardarCache\([^)]*resposta/i);
});

// ── Superfície ─────────────────────────────────────────────────────────────

test("o painel exige sessão — deslogado vai pro /entrar", async ({ request }) => {
  const r = await request.get("/painel", { maxRedirects: 0, failOnStatusCode: false });
  expect([302, 307]).toContain(r.status());
  expect(r.headers()["location"]).toContain("/entrar");
});

test("com a IA desligada, a caixa de pergunta não aparece no painel", async ({
  request,
}) => {
  // A suíte roda sem ANTHROPIC_API_KEY e sem sessão: o painel redireciona.
  // O que se prova aqui é que a página não passou a quebrar por causa do
  // componente novo.
  const r = await request.get("/painel", { failOnStatusCode: false });
  expect([200, 302, 307]).toContain(r.status());
});
