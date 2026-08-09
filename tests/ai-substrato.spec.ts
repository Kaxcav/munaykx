import { test, expect } from "@playwright/test";
import { Balde, normalizar, statusDe } from "@/lib/ai/tetos";
import { criarFornecedorAnthropic } from "@/lib/ai/anthropic";
import { esquecerFornecedor, fornecedor, iaDisponivel } from "@/lib/ai";
import { statusIa, zerarTetosDaBusca } from "@/lib/ia";

/**
 * SUBSTRATO DE IA — o que estes testes protegem.
 *
 * O risco de extrair uma camada comum é criar exatamente o que ela deveria
 * evitar: um recurso compartilhado onde uma feature come a cota da outra. Por
 * isso o teste central aqui é o ISOLAMENTO entre baldes — se um dia alguém
 * "otimizar" o `Balde` para um singleton com chave, este arquivo fica vermelho.
 */

const cfg = (nome: string, over: Partial<ConstructorParameters<typeof Balde>[0]> = {}) => ({
  nome,
  limiteIp: 3,
  janelaMs: 60_000,
  limiteDia: 10,
  tamanhoCache: 2,
  ...over,
});

test.describe("teto por feature — baldes não se enxergam", () => {
  test("estourar o teto de uma feature NÃO afeta a outra", () => {
    const busca = new Balde(cfg("busca"));
    const cadastro = new Balde(cfg("cadastro"));

    // queima o teto por IP da busca
    for (let i = 0; i < 3; i++) expect(busca.podeChamar("1.1.1.1").ok).toBe(true);
    expect(busca.podeChamar("1.1.1.1")).toMatchObject({ ok: false });

    // o cadastro, no MESMO IP, segue intacto — é o ponto da separação
    expect(cadastro.podeChamar("1.1.1.1").ok).toBe(true);
  });

  test("teto por IP é por IP: outro endereço não é penalizado", () => {
    const b = new Balde(cfg("x"));
    for (let i = 0; i < 3; i++) b.podeChamar("1.1.1.1");
    expect(b.podeChamar("1.1.1.1")).toMatchObject({ ok: false });
    expect(b.podeChamar("2.2.2.2").ok).toBe(true);
  });

  test("teto diário barra mesmo com IPs diferentes — é a trava de custo", () => {
    const b = new Balde(cfg("x", { limiteIp: 100, limiteDia: 4 }));
    for (let i = 0; i < 4; i++) {
      expect(b.podeChamar(`ip-${i}`).ok, `chamada ${i}`).toBe(true);
    }
    const barrado = b.podeChamar("ip-novo");
    expect(barrado).toMatchObject({ ok: false });
    if (!barrado.ok) expect(barrado.motivo).toContain("diário");
  });

  test("contabiliza só o que passou: chamada barrada não incrementa o dia", () => {
    const b = new Balde(cfg("x", { limiteIp: 2, limiteDia: 10 }));
    b.podeChamar("1.1.1.1");
    b.podeChamar("1.1.1.1");
    b.podeChamar("1.1.1.1"); // barrada por IP
    expect(b.usosDeHoje()).toBe(2);
  });
});

test.describe("cache do balde", () => {
  test("guarda, lê e descarta o mais antigo no limite", () => {
    const b = new Balde(cfg("x", { tamanhoCache: 2 }));
    b.guardarCache("a", 1);
    b.guardarCache("b", 2);
    expect(b.lerCache("a")).toBe(1);

    b.guardarCache("c", 3); // estoura o limite → descarta "a"
    expect(b.lerCache("a")).toBeUndefined();
    expect(b.lerCache("c")).toBe(3);
  });

  test("tamanhoCache 0 desliga o cache (não guarda nada)", () => {
    const b = new Balde(cfg("x", { tamanhoCache: 0 }));
    b.guardarCache("a", 1);
    expect(b.lerCache("a")).toBeUndefined();
  });

  test("normalizar dá a mesma chave pra mesma pergunta escrita diferente", () => {
    expect(normalizar("  Corrida   em   Taguatinga ")).toBe("corrida em taguatinga");
    expect(normalizar("CORRIDA EM TAGUATINGA")).toBe(normalizar("corrida em taguatinga"));
  });
});

test.describe("fornecedor abstrato", () => {
  test("sem chave, o fornecedor se declara indisponível e NÃO chama a API", async () => {
    const antes = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const f = criarFornecedorAnthropic();
      expect(f.disponivel()).toBe(false);
      // `gerar` devolve null sem rede — se tentasse chamar, o teste penduraria
      await expect(
        f.gerar({ sistema: "s", usuario: "u", maxTokens: 10 }),
      ).resolves.toBeNull();
    } finally {
      if (antes === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = antes;
    }
  });

  test("o fornecedor padrão é a Anthropic, e o modelo sai da env", () => {
    const antes = process.env.ANTHROPIC_MODEL;
    process.env.ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
    esquecerFornecedor();
    try {
      expect(fornecedor().nome).toBe("anthropic");
      expect(fornecedor().modelo).toBe("claude-haiku-4-5-20251001");
    } finally {
      if (antes === undefined) delete process.env.ANTHROPIC_MODEL;
      else process.env.ANTHROPIC_MODEL = antes;
      esquecerFornecedor();
    }
  });

  test("OpenAI NÃO está ligada — a interface existe, o provedor não", async () => {
    // Guarda deliberada: ligar um segundo provedor é decisão do dono
    // (credencial, custo, e qual dado sai pra qual empresa). Se alguém ligar
    // sem decisão, este teste vira vermelho e força a conversa.
    const { readFile } = await import("node:fs/promises");
    for (const arquivo of ["lib/ai/index.ts", "lib/ai/anthropic.ts", "lib/ai/tipos.ts"]) {
      const fonte = await readFile(arquivo, "utf8");
      expect(fonte, `${arquivo} passou a falar com a OpenAI`).not.toMatch(
        /api\.openai\.com|OPENAI_API_KEY/,
      );
    }
  });
});

test.describe("diagnóstico do /admin", () => {
  test("statusDe junta fornecedor e balde num objeto só", () => {
    const b = new Balde(cfg("x", { limiteDia: 7 }));
    b.podeChamar("1.1.1.1");
    const s = statusDe(b, { nome: "anthropic", modelo: "m", disponivel: () => true });
    expect(s).toMatchObject({
      ligada: true,
      fornecedor: "anthropic",
      modelo: "m",
      usosHoje: 1,
      tetoDia: 7,
    });
  });

  test("statusIa da busca continua respondendo o contrato antigo", () => {
    zerarTetosDaBusca();
    const s = statusIa();
    // Os campos que o /admin já consumia seguem existindo com os mesmos tipos —
    // é a paridade que este PR promete.
    expect(typeof s.ligada).toBe("boolean");
    expect(typeof s.modelo).toBe("string");
    expect(typeof s.usosHoje).toBe("number");
    expect(typeof s.tetoDia).toBe("number");
    expect(s.tetoDia).toBe(500); // o teto de produção da busca, inalterado
  });

  test("iaDisponivel do substrato e o da busca concordam", () => {
    const antes = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    esquecerFornecedor();
    try {
      expect(iaDisponivel()).toBe(false);
      expect(statusIa().ligada).toBe(false);
    } finally {
      if (antes === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = antes;
      esquecerFornecedor();
    }
  });
});
