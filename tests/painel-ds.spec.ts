import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

/**
 * PAINEL DO ORGANIZADOR × DESIGN SYSTEM (lote L3 da rodada shadcn).
 *
 * O `verificar:higiene` mede o projeto INTEIRO contra um baseline, então ele
 * não impede que o painel regrida enquanto outro lote melhora e o total
 * continua caindo. Este teste é a trava LOCAL: o painel migrou por completo, e
 * a partir daqui volta vermelho se um controle nativo ou uma superfície-card à
 * mão reaparecer nas pastas do lote.
 *
 * As duas isenções abaixo não são "o que sobrou": são decisões com nome.
 * - `<input type="hidden">`: não tem visual nenhum; trocar por `<Input>` só
 *   somaria classe morta (mesma isenção do guardrail global).
 * - `<input type="checkbox">` em `components/painel/Campo.tsx`: o DS ainda não
 *   tem `Checkbox` — é peça de `components/ui/`, e nesta rodada só o L1
 *   escreve lá. O pedido está no §5 do `docs/QUADRO-SHADCN-MUNAY.md`. A
 *   isenção é por ARQUIVO de propósito: se alguém escrever uma segunda caixa
 *   de marcar em qualquer outra tela do painel, este teste fica vermelho e
 *   manda usar o `<CampoCheck>`.
 *
 * Para ver o teste falhar (a regra "teste que nunca falhou não é teste"):
 * troque um `<Button>` por `<button>` em qualquer tela de `app/painel/`.
 */

const RAIZ = path.join(__dirname, "..");
const PASTAS = ["app/painel", "components/painel"];

/** O arquivo único onde a caixa de marcar nativa pode aparecer. */
const DONO_DO_CHECKBOX = "components/painel/Campo.tsx";

/** `<button>`, `<select>`, `<textarea>` e `<input>` que não seja `hidden`. */
const CONTROLE_CRU =
  /<(?:button|select|textarea)(?=[\s/>])|<input(?![^>]*type="hidden")(?=[\s/>])/g;

/** Raio grande + borda/fundo = card montado à mão em vez de `<Card>`. */
const SUPERFICIE_A_MAO = /rounded-(?:card|3xl|2xl|xl)\b(?=[^"'`]*\b(?:border|bg-)[a-z])/g;

function arquivosDoLote(): { rel: string; texto: string }[] {
  const saida: { rel: string; texto: string }[] = [];
  const andar = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) andar(p);
      else if (p.endsWith(".tsx")) {
        saida.push({
          rel: path.relative(RAIZ, p).replace(/\\/g, "/"),
          texto: fs.readFileSync(p, "utf8"),
        });
      }
    }
  };
  for (const pasta of PASTAS) andar(path.join(RAIZ, pasta));
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

test.describe("o painel do organizador está inteiro dentro do design system", () => {
  test("o lote tem arquivos de verdade (senão o resto passaria vazio)", () => {
    // Sem esta guarda, renomear `app/painel/` faria os dois testes abaixo
    // ficarem verdes sem medir nada — o modo mais silencioso de perder uma
    // trava.
    expect(arquivosDoLote().length).toBeGreaterThan(15);
  });

  test("zero controle nativo fora do DS (só a caixa de marcar, num arquivo)", () => {
    const achados = arquivosDoLote()
      .filter(({ rel }) => rel !== DONO_DO_CHECKBOX)
      .flatMap(({ rel, texto }) => ocorrencias(rel, texto, CONTROLE_CRU));

    expect(
      achados,
      "use os componentes de components/ui (Button, Input, Textarea, SelectNativo) " +
        "ou o <Campo>/<CampoCheck> do painel",
    ).toEqual([]);
  });

  test("zero superfície-card montada à mão — todo container é <Card>", () => {
    const achados = arquivosDoLote().flatMap(({ rel, texto }) =>
      ocorrencias(rel, texto, SUPERFICIE_A_MAO),
    );

    expect(achados, "troque o raio+borda à mão por <Card> de components/ui").toEqual(
      [],
    );
  });

  test("a caixa de marcar nativa está EXATAMENTE onde a isenção diz", () => {
    // O espelho do teste acima: se um dia o `<CampoCheck>` deixar de existir
    // (porque o DS ganhou um `Checkbox` de verdade), este teste fica vermelho
    // e obriga a apagar a isenção junto — isenção órfã é como uma regra morta
    // vira permissão silenciosa.
    const dono = arquivosDoLote().find(({ rel }) => rel === DONO_DO_CHECKBOX);
    expect(dono, `${DONO_DO_CHECKBOX} sumiu — reveja a isenção`).toBeTruthy();
    expect(ocorrencias(DONO_DO_CHECKBOX, dono!.texto, CONTROLE_CRU)).toHaveLength(1);
  });
});
