import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { PREFIXO, limparFixtures, prisma } from "./fixtures";
import { recortesComDado } from "@/lib/descoberta";

/**
 * DESIGN SYSTEM — as travas da adoção do shadcn/ui.
 *
 * Duas famílias de teste, e as duas nasceram de regras do CLAUDE.md:
 *
 * 1. **"Teste que nunca falhou não é teste."** Os dois guardrails
 *    (`verificar:classes` e `verificar:higiene`) são guardas de segurança, e
 *    guarda de segurança se valida QUEBRANDO ela de propósito. Aqui a gente
 *    escreve um arquivo com uma classe de Tailwind v4 e com um hex cru, roda
 *    o script e exige que ele fique VERMELHO. Se um dia alguém "consertar" o
 *    regex e a guarda parar de pegar, é este teste que avisa.
 *
 * 2. **A divergência que a migração corrigiu.** O card de comunidade estava
 *    duplicado entre `/comunidades` e `/descobrir/[recorte]`, e as duas
 *    cópias já tinham divergido: só uma mostrava o selo "acolhe iniciantes".
 *    Agora é uma peça só (`components/comum/CardComunidade`). O teste prova
 *    que as DUAS portas de entrada mostram o selo — e volta a ficar vermelho
 *    no dia em que alguém reescrever o card à mão numa das telas.
 */

const RAIZ = path.join(__dirname, "..");
const ARQ_TEMP = path.join(RAIZ, "components", "comum", "__quebra-de-proposito.tsx");

/** Roda um script de guardrail e devolve o código de saída (0 = passou). */
function rodarGuardrail(script: string, args: string[] = []): number {
  try {
    execFileSync(process.execPath, [path.join(RAIZ, "scripts", script), ...args], {
      cwd: RAIZ,
      stdio: "pipe",
    });
    return 0;
  } catch (e) {
    return (e as { status?: number }).status ?? 1;
  }
}

test.describe("guardrails — quebrar a guarda de propósito", () => {
  test.afterEach(() => {
    if (fs.existsSync(ARQ_TEMP)) fs.unlinkSync(ARQ_TEMP);
  });

  test("com o código limpo, os dois guardrails passam", () => {
    expect(rodarGuardrail("verificar-classes.mjs")).toBe(0);
    expect(rodarGuardrail("verificar-higiene.mjs")).toBe(0);
  });

  test("classe de Tailwind v4 deixa o verificar:classes VERMELHO", () => {
    // `shadow-xs` não existe no Tailwind 3.4: não quebra o build, só não
    // gera regra e a sombra some. É exatamente o erro silencioso que o
    // guardrail existe pra pegar.
    fs.writeFileSync(
      ARQ_TEMP,
      'export const Quebra = () => <div className="shadow-xs" />;\n',
    );
    expect(rodarGuardrail("verificar-classes.mjs")).toBe(1);
  });

  test("hex cru fora do brand.ts deixa o verificar:higiene VERMELHO", () => {
    fs.writeFileSync(
      ARQ_TEMP,
      'export const Quebra = () => <div style={{ color: "#123456" }} />;\n',
    );
    expect(rodarGuardrail("verificar-higiene.mjs")).toBe(1);
  });

  test("controle nativo novo fora do DS deixa o verificar:higiene VERMELHO", () => {
    // Multilinha de propósito: a primeira versão do script varria linha a
    // linha e perdia toda tag JSX quebrada — contou 19 onde havia 65.
    fs.writeFileSync(
      ARQ_TEMP,
      "export const Quebra = () => (\n  <button\n    type=\"button\"\n  >\n    oi\n  </button>\n);\n",
    );
    expect(rodarGuardrail("verificar-higiene.mjs")).toBe(1);
  });

  test("`<input type=\"hidden\">` NÃO conta como controle cru", () => {
    // Input escondido não tem visual nenhum; trocar por <Input> só somaria
    // classe morta. Se essa isenção sumir, o painel inteiro fica vermelho
    // por nada — e é isso que este teste segura.
    fs.writeFileSync(
      ARQ_TEMP,
      'export const Quebra = () => <input type="hidden" name="x" value="1" />;\n',
    );
    expect(rodarGuardrail("verificar-higiene.mjs")).toBe(0);
  });
});

test.describe("o card de comunidade é UM só nas duas portas de entrada", () => {
  test.beforeAll(async () => {
    await limparFixtures();
    await prisma.community.createMany({
      data: [
        {
          slug: `${PREFIXO}ds-acolhe`,
          nome: "Comunidade Zzt Ds Acolhe",
          modalidade: "Slackline",
          regiao: "Ceilândia",
          demo: false,
          acolheIniciante: true,
        },
      ],
    });
  });
  test.afterAll(async () => {
    await limparFixtures();
    await prisma.$disconnect();
  });

  test("o selo aparece na /comunidades E na /descobrir do mesmo recorte", async ({
    page,
  }) => {
    await page.goto("/comunidades?iniciantes=1");
    await expect(page.getByText("Comunidade Zzt Ds Acolhe")).toBeVisible();
    await expect(page.getByText("Acolhe iniciantes").first()).toBeVisible();

    // O recorte vem do banco (`lib/descoberta.ts` nunca inventa página):
    // se a comunidade acima existe, o recorte dela existe.
    const recortes = await recortesComDado();
    const recorte = recortes.find(
      (r) => r.modalidade === "Slackline" && r.regiao === "Ceilândia",
    );
    expect(recorte, "o recorte da fixture deveria existir").toBeTruthy();

    await page.goto(`/descobrir/${recorte!.slug}`);
    await expect(page.getByText("Comunidade Zzt Ds Acolhe")).toBeVisible();
    // ESTE é o assert que era falso antes da migração: a /descobrir tinha
    // uma cópia do card sem o selo.
    await expect(page.getByText("Acolhe iniciantes").first()).toBeVisible();
  });
});

test.describe("a descoberta continua funcionando depois da migração", () => {
  test.beforeAll(async () => {
    await limparFixtures();
    await prisma.community.createMany({
      data: [
        {
          slug: `${PREFIXO}ds-corrida`,
          nome: "Comunidade Zzt Ds Corrida",
          modalidade: "Corrida",
          regiao: "Asa Sul",
          demo: false,
        },
        {
          slug: `${PREFIXO}ds-yoga`,
          nome: "Comunidade Zzt Ds Yoga",
          modalidade: "Yoga",
          regiao: "Asa Sul",
          demo: false,
        },
      ],
    });
  });
  test.afterAll(async () => {
    await limparFixtures();
    await prisma.$disconnect();
  });

  test("o chip de filtro continua sendo LINK e filtra pela URL", async ({ page }) => {
    await page.goto("/comunidades");
    await expect(page.getByText("Comunidade Zzt Ds Yoga")).toBeVisible();

    await page.getByRole("link", { name: "Corrida", exact: true }).first().click();
    await expect(page).toHaveURL(/modalidade=Corrida/);
    await expect(page.getByText("Comunidade Zzt Ds Corrida")).toBeVisible();
    await expect(page.getByText("Comunidade Zzt Ds Yoga")).toHaveCount(0);
  });

  test("o toggle de iniciantes mantém aria-pressed (é o único que alterna)", async ({
    page,
  }) => {
    await page.goto("/comunidades");
    const toggle = page.getByRole("link", { name: /acolhem iniciantes/ });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(page).toHaveURL(/iniciantes=1/);
    await expect(
      page.getByRole("link", { name: /acolhem iniciantes/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
