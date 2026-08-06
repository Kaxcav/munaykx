import { test, expect } from "@playwright/test";
import { iaDisponivel, statusIa, validarInterpretacao } from "@/lib/ia";

/**
 * A busca por descrição.
 *
 * O que estes testes protegem é a GUARDA, não a chamada à API. O risco real
 * de uma feature de IA em cima de dado próprio não é o modelo cair — é o
 * modelo devolver algo plausível que não existe no banco. "Crossfit" num
 * banco que só tem "Funcional" vira filtro que não casa com nada, e a
 * pessoa vê tela vazia achando que a plataforma é vazia.
 *
 * Por isso a validação é função pura e testada sem chave de API: a regra
 * mais importante do arquivo não pode ser a menos testada.
 */

const FACETAS = {
  modalidades: ["Corrida", "Jiu-jítsu", "Vôlei"],
  regioes: ["Ceilândia", "Plano Piloto", "Taguatinga"],
};

const resposta = (o: Record<string, unknown>) => JSON.stringify(o);

test.describe("guarda anti-alucinação", () => {
  test("aceita valores que existem no banco", () => {
    const r = validarInterpretacao(
      resposta({
        modalidade: "Corrida",
        regiao: "Taguatinga",
        entendimento: "Procurando corrida em Taguatinga.",
        observacao: null,
      }),
      FACETAS,
    );
    expect(r?.modalidade).toBe("Corrida");
    expect(r?.regiao).toBe("Taguatinga");
  });

  test("DESCARTA modalidade que não existe, em vez de repassar", () => {
    const r = validarInterpretacao(
      resposta({
        modalidade: "Crossfit",
        regiao: "Ceilândia",
        entendimento: "…",
        observacao: null,
      }),
      FACETAS,
    );
    // Repassar "Crossfit" filtraria por algo inexistente e mostraria tela
    // vazia — pior que não filtrar.
    expect(r?.modalidade).toBeNull();
    expect(r?.regiao).toBe("Ceilândia");
  });

  test("DESCARTA região que não existe", () => {
    const r = validarInterpretacao(
      resposta({
        modalidade: "Vôlei",
        regiao: "Sobradinho",
        entendimento: "…",
        observacao: null,
      }),
      FACETAS,
    );
    expect(r?.regiao).toBeNull();
    expect(r?.modalidade).toBe("Vôlei");
  });

  test("grafia quase certa não passa — acento e hífen contam", () => {
    for (const errado of ["jiu-jitsu", "Jiu Jítsu", "corrida", "CEILÂNDIA"]) {
      const r = validarInterpretacao(
        resposta({
          modalidade: errado,
          regiao: errado,
          entendimento: "…",
          observacao: null,
        }),
        FACETAS,
      );
      expect(r?.modalidade, errado).toBeNull();
      expect(r?.regiao, errado).toBeNull();
    }
  });

  test("aguenta o modelo embrulhar em markdown", () => {
    const r = validarInterpretacao(
      '```json\n{"modalidade":"Corrida","regiao":null,"entendimento":"ok","observacao":null}\n```',
      FACETAS,
    );
    expect(r?.modalidade).toBe("Corrida");
  });

  test("JSON quebrado devolve null, não explode", () => {
    for (const lixo of ["", "não sou json", "{quebrado", "[]", "null"]) {
      expect(validarInterpretacao(lixo, FACETAS), lixo).toBeNull();
    }
  });

  test("formato certo mas campos errados devolve null", () => {
    expect(
      validarInterpretacao(resposta({ modalidade: 42, regiao: [] }), FACETAS),
    ).toBeNull();
  });

  test("preserva o recado quando nada casa", () => {
    const r = validarInterpretacao(
      resposta({
        modalidade: null,
        regiao: null,
        entendimento: "Procurando skate em Sobradinho.",
        observacao: "Ainda não temos skate mapeado. Tem vôlei em Taguatinga.",
      }),
      FACETAS,
    );
    // Sem filtro aproveitável, o que salva a experiência é a observação —
    // some com ela e a pessoa recebe uma tela vazia sem explicação.
    expect(r?.observacao).toContain("Ainda não temos skate");
  });
});

test.describe("desligada, o site não oferece o que não entrega", () => {
  test("sem chave, iaDisponivel é false", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(iaDisponivel()).toBe(false);
    expect(statusIa().ligada).toBe(false);
  });

  test("o endpoint responde 503, não erro genérico", async ({ request }) => {
    const r = await request.post("/api/busca-ia", {
      data: { texto: "corrida em taguatinga" },
      failOnStatusCode: false,
    });
    expect(r.status()).toBe(503);
  });

  test("entrada curta é rejeitada antes de gastar chamada", async ({ request }) => {
    const r = await request.post("/api/busca-ia", {
      data: { texto: "a" },
      failOnStatusCode: false,
    });
    // 400 (curto) ou 503 (desligada) — o que não pode é 200 nem 500.
    expect([400, 503]).toContain(r.status());
  });

  test("o campo de busca por descrição nem aparece sem a chave", async ({ page }) => {
    await page.goto("/comunidades");
    await expect(page.locator("#busca-ia")).toHaveCount(0);
  });
});
