import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  validarGrade,
  normalizarGrade,
  zerarTetosDaGrade,
} from "@/lib/ai/grade";
import { LIMITE_HORARIOS } from "@/lib/horarios";

/**
 * NORMALIZADOR DE GRADE — o que estes testes protegem.
 *
 * Três invariantes, e nenhuma é de UX:
 *
 * 1. **A IA propõe, a pessoa decide.** Nada no caminho da normalização escreve
 *    no banco. Horário recorrente ACENDE A RA NO MAPA PÚBLICO — se um dia
 *    alguém "agilizar" fazendo a análise já cadastrar, a MUNAY passa a publicar
 *    horário de parceiro real que ninguém conferiu.
 * 2. **Grounded.** Dia tem que ser 0–6, hora tem que passar pelo mesmo parser
 *    do formulário manual, região tem que ser uma das 35 RAs. O que não passa é
 *    DESCARTADO, nunca corrigido no chute: campo vazio pede revisão, chute
 *    plausível passa batido.
 * 3. **Fail-safe.** IA fora do ar ou teto estourado cai no cadastro manual, que
 *    é o que existia antes desta feature.
 *
 * Tudo abaixo roda sem chave de API: a guarda é uma função pura sobre a
 * resposta, e é ela que carrega a regra. Foi assim que `ai-cadastro.spec.ts`
 * conseguiu testar a parte que importa, e é o mesmo motivo aqui.
 */

const resposta = (o: Record<string, unknown>) => JSON.stringify(o);

test.beforeEach(() => zerarTetosDaGrade());

// ── Extração: o caso que a feature existe para resolver ───────────────────

test.describe("o texto do organizador vira dia e hora", () => {
  test('"segunda e quarta 6h30" vira DUAS linhas estruturadas', () => {
    const r = validarGrade(
      resposta({
        itens: [
          { diaSemana: 1, horaInicio: "06:30", horaFim: null, regiao: null },
          { diaSemana: 3, horaInicio: "06:30", horaFim: null, regiao: null },
        ],
        observacao: null,
      }),
    );
    expect(r?.itens).toHaveLength(2);
    expect(r?.itens[0]).toMatchObject({ diaSemana: 1, horaInicio: "06:30" });
    expect(r?.itens[1]).toMatchObject({ diaSemana: 3, horaInicio: "06:30" });
    // O rótulo existe para a pessoa conferir sem decorar que 1 é segunda.
    expect(r?.itens[0].rotulo).toBe("Segunda, 06:30");
  });

  test("a hora de fim entra quando o texto informa, e some quando não", () => {
    const r = validarGrade(
      resposta({
        itens: [
          { diaSemana: 2, horaInicio: "19:00", horaFim: "20:30", regiao: null },
          { diaSemana: 6, horaInicio: "08:00", horaFim: null, regiao: null },
        ],
        observacao: null,
      }),
    );
    expect(r?.itens[0].horaFim).toBe("20:30");
    expect(r?.itens[1].horaFim).toBeNull();
  });

  test("a saída sai ordenada por dia e hora, como a lista da tela", () => {
    const r = validarGrade(
      resposta({
        itens: [
          { diaSemana: 6, horaInicio: "08:00" },
          { diaSemana: 1, horaInicio: "19:00" },
          { diaSemana: 1, horaInicio: "06:30" },
        ],
        observacao: null,
      }),
    );
    expect(r?.itens.map((i) => i.rotulo)).toEqual([
      "Segunda, 06:30",
      "Segunda, 19:00",
      "Sábado, 08:00",
    ]);
  });
});

// ── Grounded: o que o código recusa ───────────────────────────────────────

test.describe("não inventa: fora do conjunto é descartado", () => {
  test("dia fora de 0–6 não vira linha", () => {
    const r = validarGrade(
      resposta({
        itens: [
          { diaSemana: 7, horaInicio: "06:30" },
          { diaSemana: -1, horaInicio: "06:30" },
          { diaSemana: 2, horaInicio: "06:30" },
        ],
        observacao: null,
      }),
    );
    expect(r?.itens).toHaveLength(1);
    expect(r?.itens[0].diaSemana).toBe(2);
    expect(r?.descartados).toBe(2);
  });

  test("dia fracionário é descartado, não arredondado", () => {
    // 2.5 passaria num `>= 0 && <= 6` ingênuo e viraria índice inválido lá na
    // frente, onde o erro não teria mais nome.
    const r = validarGrade(
      resposta({ itens: [{ diaSemana: 2.5, horaInicio: "06:30" }], observacao: null }),
    );
    expect(r?.itens).toHaveLength(0);
    expect(r?.descartados).toBe(1);
  });

  test("hora inválida é descartada — nada de virar 00:00", () => {
    const r = validarGrade(
      resposta({
        itens: [
          { diaSemana: 1, horaInicio: "6h30" },
          { diaSemana: 1, horaInicio: "25:00" },
          { diaSemana: 1, horaInicio: "" },
          { diaSemana: 1, horaInicio: "06:70" },
        ],
        observacao: null,
      }),
    );
    expect(r?.itens).toHaveLength(0);
    expect(r?.descartados).toBe(4);
  });

  test("região fora das 35 RAs vira null, e a linha sobrevive", () => {
    const r = validarGrade(
      resposta({
        itens: [
          { diaSemana: 1, horaInicio: "06:30", regiao: "Parque da Cidade" },
          { diaSemana: 2, horaInicio: "06:30", regiao: "Sobradinho" },
        ],
        observacao: null,
      }),
    );
    // "Parque da Cidade" é um local, não uma RA. Chutar "Plano Piloto" aqui
    // acenderia a RA errada no mapa público.
    expect(r?.itens[0].regiao).toBeNull();
    expect(r?.itens[1].regiao).toBe("Sobradinho");
  });

  test("hora de fim antes do início joga fora só o fim, não a linha", () => {
    const r = validarGrade(
      resposta({
        itens: [{ diaSemana: 1, horaInicio: "19:00", horaFim: "18:00" }],
        observacao: null,
      }),
    );
    expect(r?.itens).toHaveLength(1);
    expect(r?.itens[0].horaFim).toBeNull();
  });

  test("dia e hora repetidos entram uma vez só", () => {
    const r = validarGrade(
      resposta({
        itens: [
          { diaSemana: 1, horaInicio: "06:30" },
          { diaSemana: 1, horaInicio: "06:30" },
          { diaSemana: 1, horaInicio: "6:30" },
        ],
        observacao: null,
      }),
    );
    expect(r?.itens).toHaveLength(1);
    expect(r?.descartados).toBe(2);
  });

  test(`nunca passa de ${LIMITE_HORARIOS} linhas, que é o teto da tabela`, () => {
    const itens = Array.from({ length: 40 }, (_, i) => ({
      diaSemana: i % 7,
      horaInicio: `${String(6 + Math.floor(i / 7)).padStart(2, "0")}:00`,
    }));
    const r = validarGrade(resposta({ itens, observacao: null }));
    expect(r?.itens.length).toBeLessThanOrEqual(LIMITE_HORARIOS);
  });
});

// ── Ambíguo: campo vazio para o humano, nunca chute ───────────────────────

test.describe("texto ambíguo devolve vazio, não invenção", () => {
  test("lista vazia é resposta legítima e vem com a observação", () => {
    const r = validarGrade(
      resposta({ itens: [], observacao: "O texto não diz dia nem hora." }),
    );
    expect(r).not.toBeNull();
    expect(r?.itens).toHaveLength(0);
    expect(r?.observacao).toBe("O texto não diz dia nem hora.");
  });

  test("resposta ilegível devolve null — a tela cai no manual", () => {
    expect(validarGrade("não sei dizer")).toBeNull();
    expect(validarGrade("")).toBeNull();
    expect(validarGrade(resposta({ observacao: null }))).toBeNull();
    expect(validarGrade(resposta({ itens: "segunda", observacao: null }))).toBeNull();
  });

  test("markdown em volta do JSON não quebra (o modelo às vezes cerca)", () => {
    const cercado = "```json\n" + resposta({ itens: [{ diaSemana: 5, horaInicio: "07:00" }], observacao: null }) + "\n```";
    expect(validarGrade(cercado)?.itens[0].rotulo).toBe("Sexta, 07:00");
  });
});

// ── Teto de custo e fail-safe ─────────────────────────────────────────────

test.describe("teto de custo e degradação", () => {
  test("sem fornecedor configurado devolve null em vez de erro", async () => {
    const anterior = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const { esquecerFornecedor } = await import("@/lib/ai");
    esquecerFornecedor();
    try {
      expect(await normalizarGrade("segunda e quarta 6h30", "1.2.3.4")).toBeNull();
    } finally {
      if (anterior) process.env.ANTHROPIC_API_KEY = anterior;
      esquecerFornecedor();
    }
  });

  test("texto curto demais não gasta chamada de modelo", async () => {
    // Barrado antes do fornecedor: nada a normalizar em "6h".
    expect(await normalizarGrade("6h", "1.2.3.4")).toBeNull();
  });

  test("o balde é próprio desta feature, não o da busca", () => {
    const fonte = readFileSync("lib/ai/grade.ts", "utf8");
    expect(fonte).toContain("new Balde(");
    expect(fonte).toContain("normaliza-grade");
    expect(fonte).toContain("IA_LIMITE_DIA_GRADE");
  });
});

// ── A invariante estrutural: nenhum caminho até o banco ───────────────────

test.describe("a IA propõe, a pessoa decide", () => {
  const semComentarios = (caminho: string) =>
    readFileSync(caminho, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  test("lib/ai/grade.ts não tem caminho de escrita no banco", () => {
    // Os comentários do arquivo EXPLICAM que não há escrita e casariam com a
    // busca — testar o texto cru daria verde por acidente. Mesma lição do
    // teste de CPF da STORY-011 e do de extração.
    const codigo = semComentarios("lib/ai/grade.ts");
    expect(codigo).not.toContain("prisma");
    expect(codigo).not.toMatch(/\.(create|update|upsert|delete|createMany)\(/);
    expect(codigo).not.toContain("@/lib/db");
  });

  test("a action de sugestão não grava — só a de adicionar grava", () => {
    const codigo = semComentarios(
      "app/painel/(interno)/comunidades/[slug]/horarios/actions.ts",
    );
    const inicio = codigo.indexOf("export async function sugerirGradeAction");
    expect(inicio).toBeGreaterThan(-1);
    // Recorta só o corpo da action de sugestão, até a próxima seção.
    const corpo = codigo.slice(inicio, codigo.indexOf("// ─── Exceções", inicio));
    expect(corpo).toContain("normalizarGrade");
    expect(corpo).not.toContain("adicionarHorario(");
    expect(corpo).not.toMatch(/\.(create|update|delete)\(/);
  });

  test("a sugestão confere o dono antes de gastar chamada de IA", () => {
    const codigo = semComentarios(
      "app/painel/(interno)/comunidades/[slug]/horarios/actions.ts",
    );
    const inicio = codigo.indexOf("export async function sugerirGradeAction");
    const corpo = codigo.slice(inicio, codigo.indexOf("// ─── Exceções", inicio));
    // Sem isto, qualquer sessão válida usaria um slug alheio como bilhete para
    // consumir a cota de IA da casa.
    expect(corpo.indexOf("horariosDaComunidade")).toBeGreaterThan(-1);
    expect(corpo.indexOf("horariosDaComunidade")).toBeLessThan(
      corpo.indexOf("normalizarGrade"),
    );
    // E o userId vem da sessão do servidor, nunca do formulário.
    expect(corpo).toContain("sessao.user.id");
  });

  test("a UI adiciona uma por vez, pela action de sempre", () => {
    const ui = readFileSync("components/painel/GradePorTexto.tsx", "utf8");
    expect(ui).toContain("adicionarHorarioAction");
    // Se um dia nascer um "adicionar todas", este teste é o que avisa.
    expect(ui).not.toMatch(/adicionarTod|salvarTod|aplicarTod/i);
  });
});
