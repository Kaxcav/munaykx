import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

/**
 * ÁREA DO USUÁRIO × DESIGN SYSTEM (lote L5 da rodada shadcn).
 *
 * ── O QUE É PROVA E O QUE É GUARDA ───────────────────────────────────────
 *
 * **PROVA** (rodado contra `origin/main` = `b50c4d7` ANTES de migrar, e
 * VERMELHO lá): os quatro primeiros testes. Eles medem a dívida que o lote
 * existe pra pagar — 17 controles nativos e 14 superfícies-card à mão nas
 * telas de conta. Em `main` a lista de achados era longa; aqui ela é vazia.
 * Se algum deles passasse antes da migração, não estaria medindo nada.
 *
 * **GUARDA** (passavam antes e continuam passando — estão aqui pra que a
 * migração não tenha quebrado nada por baixo): os testes de `<main>` único e
 * de rota viva no fim do arquivo. Migração de superfície que derruba uma tela
 * é o pior resultado possível, e `verificar:higiene` não olha pra isso.
 *
 * ── POR QUE UM TESTE LOCAL SE JÁ EXISTE O `verificar:higiene` ────────────
 *
 * O guardrail global mede o projeto INTEIRO contra um baseline: enquanto
 * outro lote derruba um contador, a área do usuário poderia regredir e o
 * total continuaria caindo. Este é o mesmo desenho do `tests/painel-ds.spec.ts`
 * (L3) e do `tests/admin-shadcn.spec.ts` (L4): trava por PASTA.
 *
 * ── AS TRÊS ISENÇÕES, TODAS COM NOME ─────────────────────────────────────
 *
 * 1. **Comentário não é código.** A varredura tira comentário antes de
 *    contar. Quatro dos 22 "controles crus" que o `verificar:higiene` acusa
 *    nesta raia são a palavra `<input>`/`<button>`/`<select>` escrita dentro
 *    de documentação que explica justamente por que o elemento NÃO deve ser
 *    usado solto. Contar isso empurra pro conserto errado — reescrever texto
 *    pra agradar o contador. O L4 esbarrou no mesmo em `Paginacao.tsx` e
 *    tomou a mesma decisão. O pedido pro script global pular comentário está
 *    no §5 do quadro (é lote do F0, não meu).
 * 2. **O honeypot do `EntrarForm`.** É um `<input>` dentro de um
 *    `div.hidden aria-hidden` que existe pra bot preencher (regra de
 *    anti-spam do projeto: preenchido = descarta em silêncio). Não tem
 *    visual nenhum — mesma natureza do `type="hidden"` que o guardrail
 *    global já isenta. Trocar por `<Input>` só somaria classe morta a um
 *    campo que ninguém enxerga. A isenção é por ARQUIVO: um segundo campo
 *    cru no `EntrarForm` deixa este teste vermelho.
 * 3. **Caixa de marcar e chave (`checkbox`/`switch`) no `PerfilForm`.** O DS
 *    ainda não tem `<Checkbox>` — é peça de `components/ui/`, e nesta rodada
 *    só o L1 escreve lá (§5 do quadro, pedido que L3 e L4 já tinham aberto;
 *    o L5 é a terceira frente a esbarrar nele). Ficam contadas de propósito,
 *    num arquivo só, com o número TRAVADO em 2: qualquer caixa nova em
 *    qualquer outra tela da conta reprova.
 *
 * Para ver o teste falhar (a regra "teste que nunca falhou não é teste"):
 * troque um `<Button>` por `<button>` em qualquer tela de `app/perfil/`, ou
 * um `<Card>` por `div className="rounded-card border …"`.
 */

const RAIZ = path.join(__dirname, "..");

/** As pastas e arquivos que o L5 possui — a raia, literal. */
const PASTAS = [
  "app/perfil",
  "app/minhas-inscricoes",
  "app/minhas-comunidades",
  "app/meus-ingressos",
  "app/entrar",
  "app/convite",
  "app/descadastrar",
  "components/perfil",
];
const AVULSOS = [
  "components/EntrarForm.tsx",
  "components/ConfirmarEntrada.tsx",
  "components/SairButton.tsx",
];

/** Isenção 2 — o único arquivo onde um controle cru pode aparecer sozinho. */
const DONO_DO_HONEYPOT = "components/EntrarForm.tsx";
/** Isenção 3 — o único arquivo com caixa de marcar / chave nativa. */
const DONO_DA_CAIXA = "components/perfil/PerfilForm.tsx";
const CAIXAS_ESPERADAS = 2;

/** `<button>`, `<select>`, `<textarea>` e `<input>` que não seja `hidden`. */
const CONTROLE_CRU =
  /<(?:button|select|textarea)(?=[\s/>])|<input(?![^>]*type="hidden")(?=[\s/>])/g;

/** Raio grande + borda/fundo = card montado à mão em vez de `<Card>`. */
const SUPERFICIE_A_MAO = /rounded-(?:card|3xl|2xl|xl)\b(?=[^"'`]*\b(?:border|bg-)[a-z])/g;

/**
 * Tira comentário de bloco e de linha, preservando o comprimento do texto
 * (troca por espaço, mantendo `\n`). Preservar o tamanho é o que faz o número
 * da linha continuar batendo com o arquivo real na mensagem de erro — um
 * relatório que aponta pra linha errada custa mais tempo que não ter relatório.
 *
 * Não tenta ser um parser de TS: string contendo `//` viraria falso corte. Na
 * prática as ocorrências que interessam são tags JSX, e o risco de recorte
 * indevido derruba o teste pro lado seguro (acusa a mais, nunca a menos)
 * apenas se houver `/*` dentro de string — que não existe nestes arquivos, e
 * o teste de "a raia tem arquivos" segura o resto.
 */
function semComentarios(texto: string): string {
  const branco = (m: string) => m.replace(/[^\n]/g, " ");
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, branco)
    .replace(/\/\/[^\n]*/g, branco);
}

function arquivosDoLote(): { rel: string; texto: string }[] {
  const saida: { rel: string; texto: string }[] = [];
  const ler = (abs: string) => {
    saida.push({
      rel: path.relative(RAIZ, abs).replace(/\\/g, "/"),
      texto: semComentarios(fs.readFileSync(abs, "utf8")),
    });
  };
  const andar = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) andar(p);
      else if (p.endsWith(".tsx")) ler(p);
    }
  };
  for (const pasta of PASTAS) andar(path.join(RAIZ, pasta));
  for (const f of AVULSOS) ler(path.join(RAIZ, f));
  return saida;
}

/** Casamentos de um regex, como "arquivo:linha  trecho". */
function ocorrencias(rel: string, texto: string, re: RegExp): string[] {
  const linhaDe = (idx: number) => texto.slice(0, idx).split("\n").length;
  const achados: string[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    achados.push(`${rel}:${linhaDe(m.index)}  ${m[0].trim()}`);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return achados;
}

test.describe("a área do usuário está inteira dentro do design system", () => {
  test("a raia tem arquivos de verdade (senão o resto passaria vazio)", () => {
    // Sem esta guarda, renomear uma pasta faria os testes abaixo ficarem
    // verdes sem medir nada — o jeito mais silencioso de perder uma trava.
    expect(arquivosDoLote().length).toBeGreaterThan(12);
  });

  test("PROVA · zero controle nativo fora do DS", () => {
    const achados = arquivosDoLote()
      .filter(({ rel }) => rel !== DONO_DO_HONEYPOT && rel !== DONO_DA_CAIXA)
      .flatMap(({ rel, texto }) => ocorrencias(rel, texto, CONTROLE_CRU));

    expect(
      achados,
      "use os componentes de components/ui (Button, Input, Textarea, " +
        "SelectNativo, ChipBotao) em vez do elemento nativo",
    ).toEqual([]);
  });

  test("PROVA · zero superfície-card montada à mão — todo container é <Card>", () => {
    const achados = arquivosDoLote().flatMap(({ rel, texto }) =>
      ocorrencias(rel, texto, SUPERFICIE_A_MAO),
    );

    expect(
      achados,
      "troque o raio+borda à mão por <Card> de components/ui — inclusive na " +
        "carteira escura, onde o <Card> recebe override de cor por className",
    ).toEqual([]);
  });

  test("PROVA · toda tela da conta importa o design system", () => {
    // O contrário dos dois acima: eles provam a AUSÊNCIA do que saiu, este
    // prova a PRESENÇA do que entrou. Uma tela pode ficar sem controle cru
    // simplesmente por não ter controle nenhum — só o import prova adoção.
    const paginas = arquivosDoLote().filter(({ rel }) => rel.endsWith("/page.tsx"));
    const orfas = paginas
      .filter(
        ({ texto }) =>
          !/from "@\/components\/(ui|comum)\//.test(texto) &&
          !/from "@\/components\/perfil\//.test(texto),
      )
      .map(({ rel }) => rel);

    expect(orfas, "a tela precisa abrir com <Pagina> e usar peças do DS").toEqual([]);
  });

  test("PROVA · as isenções estão EXATAMENTE onde a documentação diz", () => {
    // Espelho das isenções: se o honeypot ou as caixas de marcar sumirem
    // (porque o DS ganhou um `<Checkbox>` de verdade), este teste fica
    // vermelho e obriga a apagar a isenção junto. Isenção órfã é regra morta
    // virando permissão silenciosa.
    const arquivos = arquivosDoLote();

    const honeypot = arquivos.find(({ rel }) => rel === DONO_DO_HONEYPOT);
    expect(honeypot, `${DONO_DO_HONEYPOT} sumiu — reveja a isenção`).toBeTruthy();
    expect(
      ocorrencias(DONO_DO_HONEYPOT, honeypot!.texto, CONTROLE_CRU),
      "o EntrarForm só pode ter O honeypot cru",
    ).toHaveLength(1);

    const caixa = arquivos.find(({ rel }) => rel === DONO_DA_CAIXA);
    expect(caixa, `${DONO_DA_CAIXA} sumiu — reveja a isenção`).toBeTruthy();
    const crus = ocorrencias(DONO_DA_CAIXA, caixa!.texto, CONTROLE_CRU);
    expect(
      crus,
      "só a caixa de marcar e a chave de consentimento podem ser nativas — " +
        "o pedido de <Checkbox> está no §5 do docs/QUADRO-SHADCN-MUNAY.md",
    ).toHaveLength(CAIXAS_ESPERADAS);
    for (const c of crus) expect(c).toContain("<input");
  });
});

test.describe("GUARDA · a migração não quebrou as telas da conta", () => {
  // Com a auth desligada na suíte (ver playwright.config.ts), toda tela de
  // conta redireciona pro /entrar. Isso é o comportamento correto E o que
  // torna o teste possível sem sessão — e é exatamente o que precisa
  // continuar valendo depois de trocar o container das páginas.
  for (const rota of [
    "/perfil",
    "/minhas-inscricoes",
    "/minhas-comunidades",
    "/meus-ingressos",
  ]) {
    test(`${rota} manda pro /entrar quando não há sessão`, async ({ page }) => {
      const resposta = await page.goto(rota);
      expect(resposta?.status()).toBe(200);
      expect(new URL(page.url()).pathname).toBe("/entrar");
    });
  }

  test("/entrar renderiza com UM <main> só e o formulário de pé", async ({ page }) => {
    // Dois `<main>` aninhados é HTML inválido — foi o que quase aconteceu no
    // L3 ao adotar o `<Pagina>` (que JÁ é o `<main>`) por dentro de um layout
    // que também renderizava um. Aqui o risco é o mesmo em cada página.
    await page.goto("/entrar");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Entrar na MUNAY/);
  });

  test("/entrar/confirmar recusa link inválido e oferece pedir outro", async ({
    page,
  }) => {
    await page.goto("/entrar/confirmar");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/não parece válido/);
    await expect(page.getByRole("link", { name: /Pedir novo link/ })).toBeVisible();
  });

  test("/descadastrar com token inválido continua dizendo isso", async ({ page }) => {
    // A tela não tem sessão nem banco no caminho feliz — é a única da raia
    // que dá pra ver por inteiro na suíte, então ela vale por todas na hora
    // de provar que o `<Pagina>` não comeu conteúdo.
    await page.goto("/descadastrar/token-que-nao-existe");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Link inválido/);
    await expect(
      page.getByRole("link", { name: /Minhas comunidades/ }).first(),
    ).toBeVisible();
  });
});
