import { test, expect } from "@playwright/test";
import {
  criarOrganizacao,
  limparOrganizacoes,
  prisma,
  type OrgDeTeste,
} from "./fixtures";
import { toCsv } from "@/lib/admin";
import { csvDeInscritos } from "@/lib/painel";
import { semNul, semNulObrigatorio } from "@/lib/entrada";
import { parseBusca } from "@/lib/admin-lista";
import { getCommunities, getCommunityBySlug } from "@/lib/communities";
import {
  comunidadePorCodigo,
  entrarPorCodigo,
  gerarCodigoConvite,
} from "@/lib/convite-aberto";

/**
 * QA de 09/08/2026 — dois bugs reais achados revisando o que subiu hoje.
 *
 * Estes testes falham SEM a correção. Foi assim que eles nasceram: os dois
 * problemas foram reproduzidos primeiro (um contra a produção, outro contra o
 * Prisma direto), e só depois consertados.
 */

const NUL = String.fromCharCode(0);

let A: OrgDeTeste;

test.beforeEach(async () => {
  await limparOrganizacoes();
  A = await criarOrganizacao("qa");
});

test.afterAll(async () => {
  await limparOrganizacoes();
  await prisma.$disconnect();
});

// ── BUG 1 · CSV injection ──────────────────────────────────────────────────

test.describe("CSV injection: planilha não executa fórmula de quem se inscreveu", () => {
  test("os quatro prefixos de fórmula são neutralizados", () => {
    const csv = toCsv(
      ["campo"],
      [["=1+1"], ["+1"], ["-1+1"], ["@SUM(A1)"]],
    );
    const linhas = csv.split("\r\n").slice(1);
    // apóstrofo à frente: o Excel lê como texto e não executa
    expect(linhas).toEqual(["'=1+1", "'+1", "'-1+1", "'@SUM(A1)"]);
  });

  test("texto normal NÃO é alterado (a correção não pode sujar o dado)", () => {
    const csv = toCsv(["nome"], [["Maria Silva"], ["João 3º"], ["123"]]);
    expect(csv.split("\r\n").slice(1)).toEqual(["Maria Silva", "João 3º", "123"]);
  });

  test("o escape de aspas e separador continua valendo junto do novo guard", () => {
    const csv = toCsv(["campo"], [['=CMD("a";"b")']]);
    // vira texto (apóstrofo) E é citado por conter `;` e aspas
    expect(csv.split("\r\n")[1]).toBe(`"'=CMD(""a"";""b"")"`);
  });

  test("o caminho REAL: nome de inscrito com fórmula sai neutralizado no CSV", async () => {
    // Quem se inscreve não precisa de conta — este dado vem de anônimo.
    const csv = csvDeInscritos([
      {
        nome: '=HYPERLINK("http://sitedele","clique")',
        email: "a@teste.invalid",
        whatsapp: "61999990000",
        status: "confirmado",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        canceledAt: null,
        checkinEm: null,
      },
    ]);
    expect(csv).toContain(`"'=HYPERLINK(`);
    // e em nenhum lugar sobra a fórmula começando célula
    expect(csv).not.toMatch(/(^|;|\n)=HYPERLINK/);
  });
});

// ── BUG 2 · NUL derrubando rota com 500 ────────────────────────────────────

test.describe("byte NUL não derruba mais consulta nenhuma", () => {
  test("semNul limpa e devolve undefined quando não sobra nada", () => {
    expect(semNul(`Corrida${NUL}`)).toBe("Corrida");
    expect(semNul(NUL)).toBeUndefined();
    expect(semNul("")).toBeUndefined();
    expect(semNul(undefined)).toBeUndefined();
    expect(semNulObrigatorio(NUL)).toBe("");
  });

  test("filtro de descoberta com NUL responde vazio/normal, não lança", async () => {
    await expect(getCommunities({ modalidade: NUL })).resolves.toBeInstanceOf(Array);
    await expect(getCommunities({ regiao: NUL })).resolves.toBeInstanceOf(Array);
    await expect(getCommunities({ city: NUL })).resolves.toBeInstanceOf(Array);
  });

  test("slug com NUL devolve null, não explode", async () => {
    await expect(getCommunityBySlug(NUL)).resolves.toBeNull();
    await expect(getCommunityBySlug(`abc${NUL}def`)).resolves.toBeNull();
  });

  test("busca do /admin com NUL não vira query quebrada", () => {
    expect(parseBusca(NUL)).toBeUndefined();
    expect(parseBusca(`maria${NUL}`)).toBe("maria");
  });

  test("código de convite fora do alfabeto base64url nem chega ao banco", async () => {
    await expect(comunidadePorCodigo(NUL)).resolves.toBeNull();
    await expect(comunidadePorCodigo(`abc${NUL}def`)).resolves.toBeNull();
    await expect(comunidadePorCodigo("tem espaço")).resolves.toBeNull();
    await expect(comunidadePorCodigo("acento-çã")).resolves.toBeNull();
    await expect(entrarPorCodigo(A.userId, NUL)).resolves.toBeNull();

    // e o código legítimo continua funcionando (a validação não apertou demais)
    const r = await gerarCodigoConvite(A.userId, A.communitySlug);
    if (!r.ok) throw new Error("não gerou código no setup");
    expect((await comunidadePorCodigo(r.dados.codigo))?.id).toBe(A.communityId);
  });
});

// ── As rotas, de ponta a ponta ─────────────────────────────────────────────

test("as rotas que davam 500 com %00 agora respondem normalmente", async ({
  request,
}) => {
  // Era 500 em produção, verificado em 09/08 antes da correção.
  expect((await request.get("/comunidades?modalidade=%00")).status()).toBe(200);
  expect((await request.get("/comunidades?regiao=%00")).status()).toBe(200);

  const convite = await request.get("/c/%00", { failOnStatusCode: false });
  expect(convite.status()).toBe(200);
  expect(await convite.text()).toContain("Convite inválido");

  // e as que já tratavam continuam tratando
  expect((await request.get("/comunidades/%00", { failOnStatusCode: false })).status()).toBe(404);
});
