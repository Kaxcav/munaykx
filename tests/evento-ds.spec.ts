import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { criarEvento, limparFixtures, prisma, DOMINIO_TESTE } from "./fixtures";

// Espelha o PORTA do playwright.config.ts — em worktree paralela a suíte sobe
// noutra porta, e Origin cravado faria o POST do RSVP falhar por ambiente.
const BASE = `http://127.0.0.1:${process.env.PW_PORTA ?? "3100"}`;

/**
 * EVENTO · RSVP · AGENDA × DESIGN SYSTEM (lote L2 da rodada shadcn).
 *
 * O `verificar:higiene` mede o projeto INTEIRO contra um baseline, então ele
 * não impede a raia do L2 de regredir enquanto outro lote melhora e o total
 * continua caindo. Estes testes são a trava LOCAL do lote.
 *
 * ── O QUE É PROVA (fica VERMELHO em `origin/main`, antes desta migração) ───
 *  1. zero controle nativo na raia, fora do honeypot   → main tem 12
 *  2. zero superfície-card montada à mão na raia        → main tem 11
 *  3. o campo do RSVP é a peça do DS (pílula), não o `rounded-xl` à mão
 *  4. a seção de confirmar presença virou `<Secao>`: o primeiro `<h2>` da
 *     página é o cabeçalho da seção, não a chamada de venda
 *
 * ── O QUE É GUARDA (passa antes e depois; existe pra não regredir) ─────────
 *  5. UM `<main>` por página — o `<Pagina>` já é o `<main>`, e aninhar dois
 *     é HTML inválido. Foi o achado do L3 ao adotar o container; aqui a
 *     guarda nasce junto pra não repetir.
 *  6. o ciclo do RSVP continua igual byte a byte no comportamento: confirma,
 *     mostra o selo e oferece o cancelamento. Migração de superfície que
 *     mexe em lógica saiu do escopo (regra 5 do quadro).
 *
 * Para ver as provas falharem (regra "teste que nunca falhou não é teste"):
 * `git stash` neste lote e rodar este arquivo contra a `main` — foi assim que
 * elas foram validadas antes de entrar.
 */

const RAIZ = path.join(__dirname, "..");

/** As pastas e arquivos que o L2 possui, e mais nada. */
const PASTAS = ["app/eventos", "app/rsvp", "app/agenda", "app/c"];
const AVULSOS = [
  "components/RsvpForm.tsx",
  "components/CancelarInscricao.tsx",
  "components/Ingresso.tsx",
  "components/CompartilharBotoes.tsx",
  "components/GuiaIniciantePublico.tsx",
];

/**
 * O único arquivo onde um controle nativo pode aparecer: o honeypot
 * anti-spam do formulário de inscrição. Ele PRECISA parecer um campo comum
 * pro bot — vesti-lo com as classes do DS seria estilizar um elemento que
 * ninguém enxerga só pra baixar o contador. A isenção é por ARQUIVO de
 * propósito: um segundo controle cru em qualquer outra tela do lote deixa
 * este teste vermelho.
 */
const DONO_DO_HONEYPOT = "components/RsvpForm.tsx";

/** `<button>`, `<select>`, `<textarea>` e `<input>` que não seja `hidden`. */
const CONTROLE_CRU =
  /<(?:button|select|textarea)(?=[\s/>])|<input(?![^>]*type="hidden")(?=[\s/>])/g;

/** Raio grande + borda/fundo = card montado à mão em vez de `<Card>`. */
const SUPERFICIE_A_MAO = /rounded-(?:card|3xl|2xl|xl)\b(?=[^"'`]*\b(?:border|bg-)[a-z])/g;

function arquivosDoLote(): { rel: string; texto: string }[] {
  const saida: { rel: string; texto: string }[] = [];
  const ler = (abs: string) =>
    saida.push({
      rel: path.relative(RAIZ, abs).replace(/\\/g, "/"),
      texto: fs.readFileSync(abs, "utf8"),
    });
  const andar = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) andar(p);
      else if (p.endsWith(".tsx")) ler(p);
    }
  };
  for (const pasta of PASTAS) andar(path.join(RAIZ, pasta));
  for (const arq of AVULSOS) ler(path.join(RAIZ, arq));
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

test.describe("a raia do evento/RSVP/agenda está dentro do design system", () => {
  test("o lote tem arquivos de verdade (senão o resto passaria vazio)", () => {
    // Sem esta guarda, renomear `app/eventos/` faria os testes abaixo ficarem
    // verdes sem medir nada — o modo mais silencioso de perder uma trava.
    expect(arquivosDoLote().length).toBeGreaterThan(10);
  });

  test("PROVA · zero controle nativo fora do DS (só o honeypot, num arquivo)", () => {
    const achados = arquivosDoLote()
      .filter(({ rel }) => rel !== DONO_DO_HONEYPOT)
      .flatMap(({ rel, texto }) => ocorrencias(rel, texto, CONTROLE_CRU));

    expect(
      achados,
      "use os componentes de components/ui (Button, Input, Label, SelectNativo)",
    ).toEqual([]);
  });

  test("PROVA · zero superfície-card montada à mão — todo container é <Card>", () => {
    const achados = arquivosDoLote().flatMap(({ rel, texto }) =>
      ocorrencias(rel, texto, SUPERFICIE_A_MAO),
    );

    expect(achados, "troque o raio+borda à mão por <Card> de components/ui").toEqual(
      [],
    );
  });

  test("o honeypot nativo está EXATAMENTE onde a isenção diz", () => {
    // O espelho do teste acima: se um dia o honeypot mudar de arquivo ou
    // sumir, este teste fica vermelho e obriga a apagar a isenção junto —
    // isenção órfã é como uma regra morta vira permissão silenciosa.
    const dono = arquivosDoLote().find(({ rel }) => rel === DONO_DO_HONEYPOT);
    expect(dono, `${DONO_DO_HONEYPOT} sumiu — reveja a isenção`).toBeTruthy();
    expect(ocorrencias(DONO_DO_HONEYPOT, dono!.texto, CONTROLE_CRU)).toHaveLength(1);
  });
});

test.describe("as telas do lote renderizadas de verdade", () => {
  let evento: Awaited<ReturnType<typeof criarEvento>>;

  test.beforeAll(async () => {
    await limparFixtures();
    evento = await criarEvento({ nome: "l2ds", capacidade: 5 });
  });

  test.afterAll(async () => {
    await limparFixtures();
    await prisma.$disconnect();
  });

  test("PROVA · o campo do RSVP é a peça do DS, não a pílula à mão", async ({
    page,
  }) => {
    await page.goto(`/eventos/${evento.slug}`);
    const campo = page.locator("#rsvp-nome");
    await expect(campo).toBeVisible();

    // O `<Input>` do DS é `h-11 rounded-full`; o campo que estava aqui antes
    // era `rounded-xl` (12px) com padding próprio. É a diferença entre "usa a
    // peça" e "copiou seis classes".
    const raio = await campo.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    expect(parseFloat(raio)).toBeGreaterThan(20);
    const altura = await campo.evaluate((el) => el.getBoundingClientRect().height);
    expect(Math.round(altura)).toBe(44);
  });

  test("PROVA · a confirmação de presença é uma <Secao>, com cabeçalho próprio", async ({
    page,
  }) => {
    await page.goto(`/eventos/${evento.slug}`);
    // Antes: `<p class="eyebrow">Confirmar presença</p>` + `<h2>` com a
    // chamada. O esqueleto da página apontava pro texto de venda, não pra
    // seção. Agora o `<h2>` é o nome da seção — e a chamada segue visível,
    // como parágrafo display.
    await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText(
      "Confirmar presença",
    );
    await expect(
      page.getByText("Garante sua vaga — leva menos de um minuto."),
    ).toBeVisible();
  });

  test("GUARDA · um <main> por página, no evento e na inscrição", async ({
    page,
    request,
  }) => {
    await page.goto(`/eventos/${evento.slug}`);
    await expect(page.locator("main")).toHaveCount(1);

    const r = await request.post("/api/rsvps", {
      data: {
        eventSlug: evento.slug,
        nome: "Zé do Lote",
        email: `zzt-l2${DOMINIO_TESTE}`,
      },
      headers: { Origin: BASE },
    });
    const { token } = await r.json();
    await page.goto(`/rsvp/${token}`);
    await expect(page.locator("main")).toHaveCount(1);
  });

  test("GUARDA · o ciclo do RSVP não mudou: confirma, mostra o selo, oferece cancelar", async ({
    page,
    request,
  }) => {
    const r = await request.post("/api/rsvps", {
      data: {
        eventSlug: evento.slug,
        nome: "Maria da Guarda",
        email: `zzt-l2guarda${DOMINIO_TESTE}`,
      },
      headers: { Origin: BASE },
    });
    const { token, status } = await r.json();
    expect(status).toBe("confirmado");

    await page.goto(`/rsvp/${token}`);
    await expect(page.getByText("Maria da Guarda")).toBeVisible();
    await expect(page.getByText("Confirmada ✓")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancelar inscrição" }),
    ).toBeVisible();
  });
});
