import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { conteudoLancamento } from "@/lib/emails-lancamento";
import {
  enviarLoteDeLancamento,
  pendentesDeAviso,
  jaAvisados,
  LOTE_MAX,
  ORIGEM_DA_LISTA,
} from "@/lib/lancamento";
import { prisma, PREFIXO, DOMINIO_TESTE, AUTH_ADMIN } from "./fixtures";

const BASE = `http://127.0.0.1:${process.env.PW_PORTA ?? "3100"}`;

/**
 * AVISO DE LANÇAMENTO — o que estes testes protegem.
 *
 * A feature manda e-mail para a base inteira de uma vez. Não existe desfazer.
 * Então as invariantes aqui não são de UX:
 *
 * 1. **Não envia sozinha.** Nada em deploy, cron ou boot chama esta camada.
 * 2. **Só quem pediu.** Lead com `origem: "rsvp"` entrou na tabela pedindo
 *    vaga em evento, não aviso de lançamento.
 * 3. **Não reenvia.** A marca é gravada antes do envio, e a reserva é atômica.
 * 4. **E-mail que falha não derruba nem trava o lote.**
 * 5. **Só admin dispara.**
 *
 * A suíte roda com `EMAIL_PROVIDER=""` (playwright.config.ts), então nenhum
 * e-mail sai de verdade: `sendEmail` vira no-op logado e devolve
 * `{ok:false, motivo:"nao-configurado"}`. Isso é exatamente o cenário de
 * "envio falhou" — e é o que torna o teste 4 real, sem mock.
 */

const email = (n: string) => `${PREFIXO}lanc-${n}${DOMINIO_TESTE}`;

async function limpar() {
  await prisma.lead.deleteMany({ where: { email: { startsWith: PREFIXO } } });
}

async function semear(
  quantos: number,
  origem = ORIGEM_DA_LISTA,
  prefixo = "p",
) {
  for (let i = 0; i < quantos; i++) {
    await prisma.lead.create({
      data: {
        tipo: "participante",
        nome: `Zzt Pessoa ${prefixo}${i}`,
        email: email(`${prefixo}${i}`),
        origem,
      },
    });
  }
}

/** Conta só os leads do teste — a base pode ter outros. */
const meusPendentes = () =>
  prisma.lead.count({
    where: {
      email: { startsWith: PREFIXO },
      origem: ORIGEM_DA_LISTA,
      avisadoLancamentoEm: null,
    },
  });

test.beforeEach(limpar);
test.afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

// ── Copy ──────────────────────────────────────────────────────────────────

test.describe("o que o e-mail diz", () => {
  test("participante e organizador recebem textos diferentes", () => {
    const p = conteudoLancamento({ nome: "Ana Paula", tipo: "participante" });
    const o = conteudoLancamento({ nome: "Ana Paula", tipo: "organizador" });
    expect(p.html).toContain("Oi, Ana.");
    expect(p.html).toContain("/comunidades");
    expect(o.html).toContain("/painel");
    expect(o.html).toContain("cadastro de comunidades");
    expect(p.html).not.toBe(o.html);
  });

  test("traz o recibo: por que chegou e como sair", () => {
    const { html } = conteudoLancamento({ nome: "Ana", tipo: "participante" });
    expect(html).toMatch(/você recebeu este e-mail porque/i);
    expect(html).toContain("/privacidade");
  });

  test("não manda responder o e-mail — o domínio não tem MX", () => {
    const { html, text } = conteudoLancamento({ nome: "Ana", tipo: "participante" });
    const responder = /respond[ea] (a )?(este|esse) e-?mail|é só responder/i;
    expect(html).not.toMatch(responder);
    expect(text).not.toMatch(responder);
  });

  test("a versão text/plain não carrega tag HTML", () => {
    const { text } = conteudoLancamento({ nome: "Ana", tipo: "organizador" });
    expect(text).not.toMatch(/<[a-z][^>]*>/i);
  });
});

// ── Quem entra na fila ────────────────────────────────────────────────────

test.describe("só recebe quem pediu", () => {
  test("lead de RSVP não entra na fila", async () => {
    await semear(2, "rsvp", "r");
    expect(await meusPendentes()).toBe(0);

    const r = await enviarLoteDeLancamento({ pausaMs: 0 });
    expect(r.tentados).toBe(0);

    // E continua intocado depois: ninguém foi marcado.
    const marcados = await prisma.lead.count({
      where: { email: { startsWith: PREFIXO }, avisadoLancamentoEm: { not: null } },
    });
    expect(marcados).toBe(0);
  });

  test("lead do site entra na fila", async () => {
    await semear(3);
    expect(await meusPendentes()).toBe(3);
    expect(await pendentesDeAviso()).toBeGreaterThanOrEqual(3);
  });
});

// ── Idempotência ──────────────────────────────────────────────────────────

test.describe("não reenvia", () => {
  test("quem já recebeu não volta para a fila", async () => {
    await semear(3);
    const primeiro = await enviarLoteDeLancamento({ pausaMs: 0 });
    expect(primeiro.tentados).toBe(3);
    expect(await meusPendentes()).toBe(0);

    // Segundo clique: não sobrou ninguém meu.
    await enviarLoteDeLancamento({ pausaMs: 0 });
    const marcados = await prisma.lead.findMany({
      where: { email: { startsWith: PREFIXO } },
      select: { avisadoLancamentoEm: true },
    });
    expect(marcados).toHaveLength(3);
    expect(marcados.every((m) => m.avisadoLancamentoEm !== null)).toBe(true);
  });

  test("a marca é gravada mesmo quando o envio falha", async () => {
    // Na suíte não há provedor, então TODO envio falha. Se a marca dependesse
    // do sucesso, um segundo clique reenviaria para a base inteira — que é o
    // desastre que a ordem "reserva antes do envio" existe para impedir.
    await semear(2);
    const r = await enviarLoteDeLancamento({ pausaMs: 0 });
    expect(r.tentados).toBe(2);
    expect(r.enviados).toBe(0);
    expect(r.falharam).toBe(2);
    expect(await meusPendentes()).toBe(0);
  });

  test("falha de e-mail não derruba a operação nem para o lote", async () => {
    await semear(4);
    // Nenhuma exceção escapa, e os 4 são processados apesar de todos falharem.
    const r = await enviarLoteDeLancamento({ pausaMs: 0 });
    expect(r.tentados).toBe(4);
    expect(r.enviados + r.falharam).toBe(4);
  });

  test("fila vazia devolve zero, sem estourar", async () => {
    const r = await enviarLoteDeLancamento({ pausaMs: 0 });
    expect(r.tentados).toBe(0);
    expect(r.enviados).toBe(0);
  });

  test("o contador de avisados sobe depois do lote", async () => {
    const antes = await jaAvisados();
    await semear(2);
    await enviarLoteDeLancamento({ pausaMs: 0 });
    expect(await jaAvisados()).toBe(antes + 2);
  });
});

// ── Lote ──────────────────────────────────────────────────────────────────

test.describe("sai em lote, não de uma vez", () => {
  test("o limite por clique é respeitado e o resto fica na fila", async () => {
    await semear(5);
    const r = await enviarLoteDeLancamento({ limite: 2, pausaMs: 0 });
    expect(r.tentados).toBe(2);
    expect(await meusPendentes()).toBe(3);
  });

  test("limite acima do teto é cortado no teto", async () => {
    await semear(3);
    const r = await enviarLoteDeLancamento({ limite: 9999, pausaMs: 0 });
    // Não dá para pedir mais que LOTE_MAX; com 3 na fila, saem 3.
    expect(r.tentados).toBeLessThanOrEqual(LOTE_MAX);
    expect(r.tentados).toBe(3);
  });
});

// ── Só admin ──────────────────────────────────────────────────────────────

test.describe("só o admin chega perto disso", () => {
  test("/admin/leads sem credencial é 401", async ({ request }) => {
    const r = await request.get(`${BASE}/admin/leads`, { maxRedirects: 0 });
    expect(r.status()).toBe(401);
  });

  // `AUTH_ADMIN` é um header de Basic Auth já montado, não um par
  // usuário/senha — é assim que o resto da suíte entra no /admin.
  test.describe("já autenticado", () => {
    test.use({ extraHTTPHeaders: AUTH_ADMIN });

    test("com credencial, a ferramenta aparece na tela", async ({ page }) => {
      // Precisa de alguém na fila: com zero pendentes a tela mostra "não há
      // ninguém" e o formulário nem existe — que é o comportamento certo, e o
      // teste abaixo cobre justamente o contrário disso.
      await semear(1);
      await page.goto(`${BASE}/admin/leads`);
      await expect(
        page.getByRole("heading", { name: "Aviso de lançamento" }),
      ).toBeVisible();
      // O gesto tem que ser deliberado: nasce desmarcado.
      await expect(
        page.getByRole("checkbox", { name: /Confirmo/ }),
      ).not.toBeChecked();
    });

    test("com a fila vazia, não existe botão para clicar", async ({ page }) => {
      await prisma.lead.updateMany({
        where: { origem: ORIGEM_DA_LISTA, avisadoLancamentoEm: null },
        data: { avisadoLancamentoEm: new Date() },
      });
      await page.goto(`${BASE}/admin/leads`);
      await expect(
        page.getByRole("button", { name: /Enviar aviso de lançamento/ }),
      ).toHaveCount(0);
    });
  });

  test("a action confere o admin antes de qualquer coisa", () => {
    const codigo = readFileSync("app/admin/leads/actions.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const corpo = codigo.slice(codigo.indexOf("export async function"));
    expect(corpo).toContain("await assertAdmin()");
    // Antes do envio, não depois.
    expect(corpo.indexOf("assertAdmin")).toBeLessThan(
      corpo.indexOf("enviarLoteDeLancamento"),
    );
  });

  test("sem a confirmação marcada, a action não chama o envio", () => {
    const codigo = readFileSync("app/admin/leads/actions.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(codigo).toContain('formData.get("confirmo") !== "sim"');
    expect(codigo.indexOf('"confirmo"')).toBeLessThan(
      codigo.indexOf("enviarLoteDeLancamento("),
    );
  });
});

// ── A invariante que mais importa: não dispara sozinho ────────────────────

test.describe("NÃO envia sozinho", () => {
  const semComentarios = (caminho: string) =>
    readFileSync(caminho, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  test("o único chamador do envio é a action do admin", () => {
    // Comentários deste projeto EXPLICAM o mecanismo e casariam com a busca —
    // por isso o corte. Mesma lição do teste de CPF da STORY-011.
    const suspeitos = [
      "app/api/cron/retencao/route.ts",
      "app/api/cron/semana/route.ts",
      "middleware.ts",
      "app/layout.tsx",
      "prisma/seed.ts",
      "next.config.mjs",
    ];
    for (const caminho of suspeitos) {
      let codigo: string;
      try {
        codigo = semComentarios(caminho);
      } catch {
        continue; // arquivo pode não existir; o teste não é sobre isso
      }
      expect(codigo, `${caminho} não pode disparar o lançamento`).not.toContain(
        "enviarLoteDeLancamento",
      );
      expect(codigo, `${caminho} não pode montar o e-mail`).not.toContain(
        "emailLancamento",
      );
    }
  });

  test("a camada não é chamada em módulo nenhum fora do admin", () => {
    // A varredura de verdade: qualquer arquivo que importe lib/lancamento tem
    // que ser a página do admin (que só LÊ contadores) ou a action dele.
    const permitidos = [
      "app/admin/leads/actions.ts",
      "app/admin/leads/page.tsx",
      "lib/lancamento.ts",
      "tests/lancamento.spec.ts",
    ];
    const saida = execSync(
      'git grep -l "lib/lancamento" -- "*.ts" "*.tsx" || true',
      { encoding: "utf8" },
    );
    const arquivos = saida.split("\n").map((s) => s.trim()).filter(Boolean);
    for (const a of arquivos) {
      expect(permitidos, `${a} importa lib/lancamento`).toContain(a);
    }
  });

  test("a página do admin só LÊ contadores, não envia", () => {
    const codigo = semComentarios("app/admin/leads/page.tsx");
    expect(codigo).toContain("pendentesDeAviso");
    expect(codigo).not.toContain("enviarLoteDeLancamento");
  });
});
