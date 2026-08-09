import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import {
  IDADE_MINIMA,
  POLITICA_VERSAO,
  dataParaBanco,
  erroDeCoerencia,
  formatarCep,
  idadeDe,
  idadeEm,
  partesDeData,
  perfilSchema,
} from "@/lib/perfil";
import { sanitizarInteresses, INTERESSES } from "@/lib/interesses";
import { PERGUNTAS, perguntasDoDia, sanitizarRespostas } from "@/lib/perfil-perguntas";

/**
 * Perfil — validação e catálogos (STORY-011).
 *
 * O que estes testes protegem, em uma frase: o perfil é onde o MUNAY guarda
 * dado pessoal, e validação frouxa aqui não produz um bug bonitinho de UI —
 * produz dado errado, permanente e difícil de corrigir depois que virou base
 * de cadastro.
 *
 * ⚠️ NÃO PROCURE TESTE DE CPF. O campo foi removido em 07/08/2026 e os testes
 * do dígito verificador foram apagados junto — teste de código que não existe
 * é o tipo de verde que faz alguém achar que a funcionalidade está lá. O
 * teste que restou sobre CPF é o de baixo, e ele testa a AUSÊNCIA.
 */

/** Todo .ts/.tsx sob um diretório — o que de fato vira código servido. */
function arquivosQueRenderizam(dir: string, achados: string[] = []): string[] {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name.startsWith(".")) continue;
    const caminho = path.join(dir, item.name);
    if (item.isDirectory()) arquivosQueRenderizam(caminho, achados);
    else if (/\.tsx?$/.test(item.name)) achados.push(caminho);
  }
  return achados;
}

test.describe("o CPF não existe mais — e isso é testado", () => {
  test("o schema RECUSA cpf, em vez de aceitar e ignorar em silêncio", () => {
    // Zod por padrão descarta chave desconhecida sem reclamar. Isso é bom pra
    // robustez e péssimo aqui: um cliente antigo (ou alguém restaurando código
    // velho) mandaria `cpf` e o servidor responderia 200 como se tivesse
    // gravado. O teste trava o comportamento observável: o campo não sai do
    // outro lado.
    const r = perfilSchema.safeParse({
      nome: "Ana",
      cpf: "529.982.247-25",
      consentiuCadastro: true,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(Object.keys(r.data)).not.toContain("cpf");
    }
  });

  test("nenhum arquivo que renderiza ainda tem CAMPO de CPF", () => {
    // Procura o MECANISMO, não a palavra. A distinção importa: o painel de
    // ajuda PRECISA dizer "vocês pedem CPF? não" — proibir o termo proibiria
    // justamente a frase que informa a pessoa. O que não pode voltar é
    // input, binding ou validação.
    const MECANISMOS = [
      /\bid=["']cpf["']/i,
      /\bname=["']cpf["']/i,
      /\bcpf\s*:/i, //    campo de objeto / propriedade de tipo
      /\.cpf\b/i, //      leitura ou escrita da propriedade
      /\bcpfValido\b/,
      /\bformatarCpf\b/,
    ];
    const suspeitos: string[] = [];
    for (const arq of [
      ...arquivosQueRenderizam(path.join(__dirname, "..", "components")),
      ...arquivosQueRenderizam(path.join(__dirname, "..", "app")),
      ...arquivosQueRenderizam(path.join(__dirname, "..", "lib")),
    ]) {
      const linhas = fs
        .readFileSync(arq, "utf8")
        .split("\n")
        .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l));
      if (linhas.some((l) => MECANISMOS.some((re) => re.test(l)))) {
        suspeitos.push(path.relative(path.join(__dirname, ".."), arq));
      }
    }
    expect(suspeitos, `campo de CPF voltou em: ${suspeitos.join(", ")}`).toHaveLength(0);
  });

  test("o schema.prisma não tem coluna de CPF", () => {
    // O banco é o que sobrevive a refactor de UI. Se a coluna voltar sem a
    // política de privacidade voltar junto, é aqui que aparece.
    const schema = fs.readFileSync(
      path.join(__dirname, "..", "prisma", "schema.prisma"),
      "utf8",
    );
    const linhasDeCampo = schema
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"));
    expect(linhasDeCampo.join("\n")).not.toMatch(/^\s*cpf\s/im);
  });
});

test.describe("CEP", () => {
  test("formata e trunca", () => {
    expect(formatarCep("70000000")).toBe("70000-000");
    expect(formatarCep("700")).toBe("700");
    expect(formatarCep("7000000099")).toBe("70000-000");
  });
});

test.describe("idade", () => {
  // `hoje` construído com o construtor LOCAL: `idadeDe` lê "hoje" no fuso de
  // quem está olhando, então o teste precisa falar a mesma língua. Usar
  // `new Date("...Z")` aqui foi exatamente o que escondeu o bug de fuso — o
  // caso passava em UTC (container) e reprovava em UTC−3 (máquina do Kaxcav).
  const hoje = new Date(2026, 7, 7, 12, 0, 0); // 07/08/2026, meio-dia local

  test("conta anos completos, não diferença de ano", () => {
    // Faz aniversário amanhã: ainda não fez.
    expect(idadeDe({ ano: 2006, mes: 8, dia: 8 }, hoje)).toBe(19);
    // Fez hoje.
    expect(idadeDe({ ano: 2006, mes: 8, dia: 7 }, hoje)).toBe(20);
    // Já fez.
    expect(idadeDe({ ano: 2006, mes: 8, dia: 6 }, hoje)).toBe(20);
    // Mês seguinte ainda não chegou.
    expect(idadeDe({ ano: 2006, mes: 9, dia: 1 }, hoje)).toBe(19);
  });

  test("a data do formulário NÃO escorrega um dia por causa do fuso", () => {
    // ESTE é o teste que faltava. `<input type="date">` manda "2006-08-08";
    // `new Date("2006-08-08")` é meia-noite UTC e vira 07/08 em Brasília.
    // O resultado tem que ser o mesmo em qualquer fuso.
    const p = partesDeData("2006-08-08");
    expect(p).toEqual({ ano: 2006, mes: 8, dia: 8 });

    // E o que vai pro banco tem que preservar o dia digitado, em UTC.
    const gravado = dataParaBanco("2006-08-08")!;
    expect(gravado.toISOString().slice(0, 10)).toBe("2006-08-08");
    expect(gravado.getUTCDate()).toBe(8);

    // Ida e volta: o que sai do banco devolve a mesma idade.
    expect(idadeEm(gravado, hoje)).toBe(idadeDe(p!, hoje));
  });

  test("data impossível é recusada, não 'corrigida' em silêncio", () => {
    // `new Date(2026, 1, 31)` vira 03/03 sem reclamar. Aqui não.
    expect(partesDeData("2026-02-31")).toBeNull();
    expect(partesDeData("2026-13-01")).toBeNull();
    expect(partesDeData("07/08/2026")).toBeNull();
    expect(partesDeData("banana")).toBeNull();
    expect(partesDeData("2026-02-28")).toEqual({ ano: 2026, mes: 2, dia: 28 });
  });

  test(`menor de ${IDADE_MINIMA} não cria perfil, e a mensagem explica a saída`, () => {
    const daqui = new Date();
    const nascimento = new Date(
      daqui.getFullYear() - (IDADE_MINIMA - 1),
      daqui.getMonth(),
      daqui.getDate(),
    );
    const r = perfilSchema.safeParse({
      nome: "Fulano",
      nascimento: nascimento.toISOString().slice(0, 10),
      consentiuCadastro: true,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = r.error.issues[0].message;
      // A mensagem não pode ser só "não pode": tem que dizer que a pessoa
      // continua conseguindo se inscrever em evento sem conta.
      expect(msg).toContain("sem conta");
    }
  });

  test("data no futuro é recusada", () => {
    const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const r = perfilSchema.safeParse({
      nome: "Fulano",
      nascimento: amanha,
      consentiuCadastro: true,
    });
    expect(r.success).toBe(false);
  });
});

test.describe("schema do perfil", () => {
  test("só o nome é exigido — nada mais bloqueia salvar", () => {
    const r = perfilSchema.safeParse({ nome: "Ana", consentiuCadastro: true });
    expect(r.success).toBe(true);
  });

  test("campo em branco vira undefined, nunca string vazia", () => {
    // Gravar `""` no banco é diferente de gravar NULL: o primeiro parece
    // preenchido em toda consulta que testa `IS NOT NULL`.
    const r = perfilSchema.safeParse({
      nome: "Ana",
      apelido: "   ",
      cidade: "",
      telefone: "",
      consentiuCadastro: true,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.apelido).toBeUndefined();
      expect(r.data.cidade).toBeUndefined();
      expect(r.data.telefone).toBeUndefined();
    }
  });

  test("UF fora da lista é recusada; sigla minúscula é aceita e normalizada", () => {
    expect(
      perfilSchema.safeParse({ nome: "Ana", uf: "XX", consentiuCadastro: true }).success,
    ).toBe(false);
    const ok = perfilSchema.safeParse({ nome: "Ana", uf: "df", consentiuCadastro: true });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.uf).toBe("DF");
  });

  test("sem consentimento de cadastro, não salva — e a mensagem é amigável", () => {
    const r = perfilSchema.parse({ nome: "Ana", consentiuCadastro: false });
    const erro = erroDeCoerencia(r);
    expect(erro).not.toBeNull();
    expect(erro).toContain("ok");
  });

  test("NENHUMA mensagem de erro é texto padrão do Zod", () => {
    // O item 8.3 do briefing pede linguagem amigável, não técnica. Se
    // alguém acrescentar um campo sem `message`, o Zod entrega
    // "Invalid input" / "String must contain…" — e isso vaza pra tela.
    const casos = [
      { nome: "" },
      { nome: "Ana", cep: "1" },
      { nome: "Ana", uf: "ZZ" },
      { nome: "Ana", telefone: "1" },
      { nome: "Ana", bio: "x".repeat(400) },
      { nome: "Ana", nascimento: "banana" },
    ];
    for (const caso of casos) {
      const r = perfilSchema.safeParse({ ...caso, consentiuCadastro: true });
      expect(r.success, `${JSON.stringify(caso)} devia falhar`).toBe(false);
      if (!r.success) {
        for (const issue of r.error.issues) {
          expect(
            issue.message,
            `mensagem técnica vazando em ${JSON.stringify(caso)}: "${issue.message}"`,
          ).not.toMatch(/^(Invalid|String must|Expected|Required|Too )/i);
        }
      }
    }
  });
});

test.describe("catálogo de interesses", () => {
  test("os ids são únicos — id repetido sobrescreveria perfil salvo", () => {
    const ids = INTERESSES.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("toda tag de prática declara modalidade; toda tag de estilo não", () => {
    for (const i of INTERESSES) {
      if (i.tipo === "pratica") expect(i.modalidade, i.id).toBeTruthy();
      else expect(i.modalidade, i.id).toBeUndefined();
    }
  });

  test("sanitizar descarta id desconhecido e duplicata", () => {
    expect(sanitizarInteresses(["corrida", "corrida", "nao-existe", "yoga"])).toEqual([
      "corrida",
      "yoga",
    ]);
  });
});

test.describe("perguntas leves", () => {
  test("ids únicos", () => {
    const ids = PERGUNTAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("o sorteio é ESTÁVEL pro mesmo usuário", () => {
    // Não é preciosismo: o formulário é renderizado no servidor e hidratado
    // no cliente. Sorteio instável trocaria as perguntas entre os dois lados
    // e o React acusaria erro de hidratação — além de apagar o que a pessoa
    // já tivesse digitado ao atualizar a página.
    const a = perguntasDoDia("user-123").map((p) => p.id);
    const b = perguntasDoDia("user-123").map((p) => p.id);
    expect(a).toEqual(b);
  });

  test("usuários diferentes não recebem todos as mesmas perguntas", () => {
    const conjuntos = ["a", "b", "c", "d", "e", "f"].map((u) =>
      perguntasDoDia(`user-${u}`).map((p) => p.id).join(","),
    );
    expect(new Set(conjuntos).size).toBeGreaterThan(1);
  });

  test("pergunta respondida sai da fila", () => {
    const primeira = perguntasDoDia("user-xyz");
    const respondidas = { [primeira[0].id]: "alguma resposta" };
    const depois = perguntasDoDia("user-xyz", respondidas);
    expect(depois.map((p) => p.id)).not.toContain(primeira[0].id);
  });

  test("respondendo tudo, ainda vêm perguntas (pra poder reeditar)", () => {
    const todas = Object.fromEntries(PERGUNTAS.map((p) => [p.id, "x"]));
    expect(perguntasDoDia("user-xyz", todas).length).toBeGreaterThan(0);
  });

  test("sanitizar recusa chave desconhecida e valor não-texto", () => {
    const limpo = sanitizarRespostas({
      [PERGUNTAS[0].id]: "  resposta  ",
      chaveInventada: "tentativa de depósito",
      [PERGUNTAS[1].id]: 42 as unknown as string,
    });
    expect(limpo).toEqual({ [PERGUNTAS[0].id]: "resposta" });
  });

  test("resposta longa é truncada, não rejeitada", () => {
    const limpo = sanitizarRespostas({ [PERGUNTAS[0].id]: "y".repeat(500) });
    expect(limpo[PERGUNTAS[0].id].length).toBe(200);
  });
});

/**
 * Redesign da tela de consentimento (09/08) — conversão SEM dark pattern.
 *
 * O objetivo do dono é clique legítimo nos opt-ins #2 (recomendações) e #3
 * (estatísticas). O que a LGPD invalida — e o que reprova num edital — é o
 * atalho: caixa pré-marcada, "aceitar tudo", copy que empurra. Estes testes
 * travam justamente o que NÃO pode existir, além de provar que a mudança foi
 * só de UI/copy: o opt-in nasce desligado e o vínculo com a versão da política
 * continua intacto. São estruturais de propósito — a suíte roda sem sessão
 * (auth off), então o comportamento logado do formulário não é exercitável por
 * browser aqui; o que dá pra garantir é a régua no schema + no código servido.
 */
test.describe("consentimento — conversão sem dark pattern (redesign 09/08)", () => {
  const lerServido = (rel: string) =>
    fs.readFileSync(path.join(__dirname, "..", ...rel.split("/")), "utf8");

  test("opt-ins nascem DESLIGADOS — o schema não liga #2/#3 sozinho", () => {
    // Sem a pessoa marcar, recomendação e insights são FALSE. Trocar o
    // .default(false) por .default(true) deixa este teste vermelho.
    const r = perfilSchema.parse({ nome: "Ana", consentiuCadastro: true });
    expect(r.consentiuRecomendacao).toBe(false);
    expect(r.consentiuInsights).toBe(false);
  });

  test("a página deriva o opt-in da DATA (!== null), não de um default ligado", () => {
    const page = lerServido("app/perfil/page.tsx");
    // Usuário novo tem consentimento NULL → booleano vira false → chave desligada.
    expect(page).toContain(
      "consentiuRecomendacao: usuario.consentiuRecomendacao !== null",
    );
    expect(page).toContain(
      "consentiuInsights: usuario.consentiuInsights !== null",
    );
  });

  test("o vínculo com a versão da política fica intacto ao salvar", () => {
    const actions = lerServido("app/perfil/actions.ts");
    // A action carimba a versão da política no aceite...
    expect(actions).toContain("politicaVersao: POLITICA_VERSAO");
    // ...e preserva a DATA original (carimbo só quando LIGA) — regravar apagaria
    // "desde quando", que é o que se prova numa fiscalização.
    expect(actions).toMatch(/consentiuRecomendacao:\s*carimbo\(/);
    expect(actions).toMatch(/consentiuInsights:\s*carimbo\(/);
  });

  test("POLITICA_VERSAO existe e é uma data ISO (o aceite guarda a versão)", () => {
    expect(POLITICA_VERSAO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("a UI não tem dark pattern: nada pré-marcado, nenhum 'aceitar tudo'", () => {
    const form = lerServido("components/perfil/PerfilForm.tsx");
    // Nenhuma chave nasce ligada por markup.
    expect(form).not.toContain("defaultChecked");
    expect(form).not.toMatch(/checked=\{\s*true\s*\}/);
    // Nenhum atalho que ligue os três de uma vez (o vetor clássico de dark pattern).
    expect(form).not.toMatch(/aceitar tudo|marcar todos|selecionar todos|ligar todos/i);
    // As três chaves seguem presas ao ESTADO (vindo do servidor), não a um literal.
    expect(form).toContain("marcado={dados.consentiuCadastro}");
    expect(form).toContain("marcado={dados.consentiuRecomendacao}");
    expect(form).toContain("marcado={dados.consentiuInsights}");
  });

  test("é toggle acessível (role=switch) e 'recomendado' está só no opt-in que beneficia a pessoa", () => {
    const form = lerServido("components/perfil/PerfilForm.tsx");
    expect(form).toContain('role="switch"');
    // Exatamente UM consentimento tem nivel="recomendado" (o #2). Marcar o #3
    // como recomendado seria empurrar coleta que não beneficia a pessoa.
    expect((form.match(/nivel="recomendado"/g) ?? []).length).toBe(1);
  });

  test("a copy fala por BENEFÍCIO, não por obrigação jurídica", () => {
    const form = lerServido("components/perfil/PerfilForm.tsx");
    // #2: o ganho é da pessoa.
    expect(form).toContain("combina com você");
    // #3: convite + garantia de anonimato, não juridiquês.
    expect(form).toContain("cena de Brasília");
    expect(form).toMatch(/sem nome, sem e-mail/i);
  });
});
