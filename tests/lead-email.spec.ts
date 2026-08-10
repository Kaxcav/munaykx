import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { conteudoListaEspera, emailListaEspera } from "@/lib/emails-lead";
import { dispararEmail } from "@/lib/emails-rsvp";
import { prisma, PREFIXO, DOMINIO_TESTE } from "./fixtures";

// Espelha o PORTA do playwright.config.ts — em worktree paralela a suíte
// sobe noutra porta, e host cravado faria o teste falhar por ambiente.
const BASE = `http://127.0.0.1:${process.env.PW_PORTA ?? "3100"}`;

/**
 * CONFIRMAÇÃO DA LISTA DE ESPERA.
 *
 * O buraco que estes testes fecham foi medido em 09/08/2026: o formulário
 * dizia "você está na lista, te avisamos" e a rota gravava o lead sem mandar
 * nada. Não era falha silenciosa de entrega — era ausência de envio.
 *
 * O que se prova aqui:
 *  - o conteúdo diz o que tem que dizer e NÃO diz o que não pode (data de
 *    lançamento, "responda este e-mail" num domínio sem MX);
 *  - falha de e-mail não derruba o cadastro, com erro de transporte REAL;
 *  - sem provedor configurado o lead entra igual (é o modo da suíte inteira);
 *  - o disparo está fiado DEPOIS do create e FORA do caminho "já existia".
 */

const QUANDO = new Date("2026-08-10T14:30:00.000Z");

// ---------------------------------------------------------------- conteúdo

test.describe("o que o e-mail diz", () => {
  test("participante: confirma a entrada e chama pelo primeiro nome", () => {
    const { html, text } = conteudoListaEspera({
      nome: "Ana Paula Ribeiro",
      tipo: "participante",
      quando: QUANDO,
    });
    expect(html).toContain("Você está na lista da MUNAY");
    expect(html).toContain("Oi, Ana.");
    // Nome inteiro veio de campo livre: não é exibido sem necessidade.
    expect(html).not.toContain("Ana Paula Ribeiro");
    expect(html).toContain("/comunidades");
    expect(text).toContain("Você está na lista da MUNAY");
  });

  test("organizador recebe copy própria, não a do participante", () => {
    const org = conteudoListaEspera({
      nome: "Bruno",
      tipo: "organizador",
      quando: QUANDO,
    });
    const part = conteudoListaEspera({
      nome: "Bruno",
      tipo: "participante",
      quando: QUANDO,
    });
    expect(org.html).toContain("lista de organizadores");
    expect(org.html).toContain("#organizador");
    expect(part.html).not.toContain("lista de organizadores");
    expect(org.html).not.toBe(part.html);
  });

  test("NÃO promete data de lançamento", () => {
    for (const tipo of ["participante", "organizador"] as const) {
      const { html, text } = conteudoListaEspera({
        nome: "Ana",
        tipo,
        quando: QUANDO,
      });
      // Prometer prazo sem prazo decidido é o erro que tirou o bullet de
      // comissão da landing em 07/08. Vale para o corpo e para o texto puro.
      const prazo =
        /em breve|nas próximas semanas|semana que vem|no próximo mês|lançamos em|a partir de \d|até \w+ de \d{4}/i;
      expect(html).not.toMatch(prazo);
      expect(text).not.toMatch(prazo);
      // Dizer que NÃO há data, isso pode — e é o que o texto faz.
      expect(html).toMatch(/não temos data/i);
    }
  });

  test("NÃO manda responder o e-mail — o domínio não tem MX", () => {
    const { html, text } = conteudoListaEspera({
      nome: "Ana",
      tipo: "participante",
      quando: QUANDO,
    });
    const responder = /respond[ea] (a )?(este|esse) e-?mail|é só responder/i;
    expect(html).not.toMatch(responder);
    expect(text).not.toMatch(responder);
  });

  test("serve de recibo: diz por que chegou, o que guardamos e como sair", () => {
    const { html } = conteudoListaEspera({
      nome: "Ana",
      tipo: "participante",
      quando: QUANDO,
    });
    expect(html).toMatch(/você recebeu este e-mail porque/i);
    expect(html).toContain("/privacidade");
    expect(html).toMatch(/remoção dos seus dados/i);
  });

  test("a data do recibo é a de Brasília, não a de UTC", () => {
    // 10/08 às 14h30 UTC é 11h30 do dia 10 em Brasília — mesmo dia. O caso
    // que pega o bug é a virada: 23h00 UTC ainda é dia 9 aqui.
    const viradaUTC = new Date("2026-08-10T02:00:00.000Z"); // 9/08 23h em BSB
    const { html } = conteudoListaEspera({
      nome: "Ana",
      tipo: "participante",
      quando: viradaUTC,
    });
    expect(html).toContain("9 de agosto de 2026");
    expect(html).not.toContain("10 de agosto de 2026");
  });

  test("a versão text/plain não carrega tag HTML", () => {
    const { text } = conteudoListaEspera({
      nome: "Ana",
      tipo: "participante",
      quando: QUANDO,
    });
    expect(text).not.toMatch(/<[a-z][^>]*>/i);
  });
});

// ------------------------------------------------------------------ envio

test.describe("envio que falha não pode derrubar nada", () => {
  const limpar = () => {
    for (const k of ["EMAIL_PROVIDER", "RESEND_API_KEY", "SMTP_URL", "EMAIL_FROM"]) {
      delete process.env[k];
    }
  };
  test.afterEach(limpar);

  test("sem provedor: no-op logado, sem exceção", async () => {
    limpar();
    const r = await emailListaEspera({
      para: `${PREFIXO}sem-provedor${DOMINIO_TESTE}`,
      nome: "Ana",
      tipo: "participante",
      quando: QUANDO,
    });
    expect(r).toEqual({ ok: false, motivo: "nao-configurado" });
  });

  test("transporte quebrado devolve erro em vez de lançar", async () => {
    limpar();
    // Porta 1 fechada: erro de conexão REAL, local e imediato — sem rede
    // externa e sem mock. É o cenário que importa, porque `sendEmail`
    // engolir erro é justamente o que torna o silêncio possível.
    process.env.EMAIL_PROVIDER = "smtp";
    process.env.SMTP_URL = "smtp://127.0.0.1:1";
    process.env.EMAIL_FROM = "MUNAY <ola@sejamunay.com.br>";
    const r = await emailListaEspera({
      para: `${PREFIXO}transporte${DOMINIO_TESTE}`,
      nome: "Ana",
      tipo: "participante",
      quando: QUANDO,
    });
    expect(r).toEqual({ ok: false, motivo: "erro" });
  });

  test("dispararEmail não propaga rejeição para quem chamou", async () => {
    // Se isto regredir, uma falha de e-mail vira unhandledRejection no
    // route handler — e aí o cadastro que JÁ está no banco responde 500.
    expect(() =>
      dispararEmail(Promise.reject(new Error("provedor fora do ar"))),
    ).not.toThrow();
    await new Promise((r) => setTimeout(r, 20));
  });
});

// ------------------------------------------------------------------ fluxo

test.describe("POST /api/leads com o e-mail desligado", () => {
  const email = `${PREFIXO}confirma${DOMINIO_TESTE}`;

  const apagar = () =>
    prisma.lead.deleteMany({ where: { email: { startsWith: PREFIXO } } });

  test.beforeEach(apagar);
  test.afterAll(apagar);

  test("grava o lead e responde ok — a suíte roda sem provedor", async ({
    request,
  }) => {
    const r = await request.post(`${BASE}/api/leads`, {
      data: { tipo: "participante", nome: "Zzt Teste", email },
    });
    expect(r.status()).toBe(200);
    expect(await r.json()).toEqual({ ok: true });

    const lead = await prisma.lead.findFirst({ where: { email } });
    expect(lead).not.toBeNull();
    expect(lead?.origem).toBe("site");
  });

  test("cadastro repetido não grava de novo nem manda outro e-mail", async ({
    request,
  }) => {
    const dados = { tipo: "participante", nome: "Zzt Teste", email };
    await request.post(`${BASE}/api/leads`, { data: dados });
    const r = await request.post(`${BASE}/api/leads`, { data: dados });

    expect(r.status()).toBe(200);
    expect(await r.json()).toEqual({ ok: true, jaExistia: true });
    expect(await prisma.lead.count({ where: { email } })).toBe(1);
  });

  test("honeypot continua sem gravar (e sem e-mail)", async ({ request }) => {
    const r = await request.post(`${BASE}/api/leads`, {
      data: {
        tipo: "participante",
        nome: "Zzt Bot",
        email: `${PREFIXO}bot${DOMINIO_TESTE}`,
        site: "http://spam.example",
      },
    });
    expect(await r.json()).toEqual({ ok: true });
    expect(
      await prisma.lead.count({ where: { email: `${PREFIXO}bot${DOMINIO_TESTE}` } }),
    ).toBe(0);
  });
});

// -------------------------------------------------------------- o fio

test.describe("onde o disparo está fiado", () => {
  const fonte = readFileSync("app/api/leads/route.ts", "utf8");
  // Comentários explicam o mecanismo e casariam com as buscas abaixo, o que
  // daria verde por acidente. Mesma lição do teste de CPF da STORY-011.
  const codigo = fonte
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  // Posição da CHAMADA, não do import — `dispararEmail` sozinho casa com a
  // linha de import no topo do arquivo, que fica antes de tudo e faria os
  // testes de ordem abaixo passarem/falharem pelo motivo errado.
  const chamada = codigo.indexOf("dispararEmail(");

  test("a rota realmente dispara a confirmação", () => {
    expect(codigo).toContain("emailListaEspera({");
    expect(chamada).toBeGreaterThan(-1);
  });

  test("o disparo vem DEPOIS do create, nunca antes", () => {
    expect(codigo.indexOf("lead.create")).toBeGreaterThan(-1);
    expect(chamada).toBeGreaterThan(codigo.indexOf("lead.create"));
  });

  test("o caminho 'já existia' (P2002) sai sem disparar", () => {
    // O `return` do P2002 tem que acontecer ANTES do disparo, senão quem se
    // recadastra recebe o mesmo e-mail toda vez que preencher o formulário.
    expect(codigo.indexOf("jaExistia")).toBeLessThan(chamada);
  });

  test("o disparo não está dentro do catch de erro", () => {
    // Sem esta linha o teste passaria vazio quando o disparo some do arquivo
    // — medido: as outras três guardas ficam vermelhas, esta não ficava.
    expect(chamada).toBeGreaterThan(-1);
    const trecho = codigo.slice(codigo.indexOf("} catch (error) {"), chamada);
    // Entre o catch e o disparo tem que existir o fechamento do bloco e o
    // return de erro — o e-mail vive no caminho feliz, fora do catch.
    expect(trecho).toContain("status: 500");
  });
});
