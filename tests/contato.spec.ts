import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { EMAIL_CONTATO, dominioPublico } from "@/lib/contato";

/**
 * O contato público não pode apontar pra lugar nenhum.
 *
 * O que aconteceu (07/08/2026): rodapé, política de privacidade e as duas
 * imagens de OG anunciavam `contato@munay.app.br` — domínio que **não
 * existe** (NXDOMAIN no DNS). Cada arquivo tinha a sua cópia da string e um
 * `TODO: trocar quando registrar o domínio`. O domínio foi registrado e os
 * TODOs continuaram lá.
 *
 * O caso mais grave era a política de privacidade: o endereço está lá como
 * canal do titular de dados (LGPD). Canal que devolve bounce promete
 * atendimento que não pode acontecer.
 */

const RAIZ = path.join(__dirname, "..");
const DOMINIO_MORTO = "munay.app.br";

/**
 * Varre só o que o site PUBLICA: `app/`, `components/` e `lib/`.
 *
 * `docs/` fica de fora de propósito — lá o domínio antigo aparece como
 * registro histórico, e apagar história pra teste passar seria o tipo
 * errado de verde. O que não pode é ele voltar pra algo que renderiza.
 */
function arquivosPublicados(dir: string, achados: string[] = []): string[] {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name.startsWith(".")) continue;
    const caminho = path.join(dir, item.name);
    if (item.isDirectory()) arquivosPublicados(caminho, achados);
    else if (/\.(ts|tsx|css)$/.test(item.name)) achados.push(caminho);
  }
  return achados;
}

test("o domínio morto não sobrou em nada que renderiza", () => {
  const culpados = ["app", "components", "lib"]
    .flatMap((p) => arquivosPublicados(path.join(RAIZ, p)))
    .filter((f) => fs.readFileSync(f, "utf8").includes(DOMINIO_MORTO))
    .map((f) => path.relative(RAIZ, f));

  // `lib/contato.ts` cita o domínio no comentário que explica o estrago,
  // nunca como valor — os outros testes garantem isso.
  expect(
    culpados.filter((f) => f !== path.join("lib", "contato.ts")),
    `ainda citam ${DOMINIO_MORTO}: ${culpados.join(", ")}`,
  ).toEqual([]);
});

test("o e-mail de contato é do domínio que a MUNAY realmente tem", () => {
  expect(EMAIL_CONTATO).toContain("@sejamunay.com.br");
  expect(EMAIL_CONTATO).not.toContain(DOMINIO_MORTO);
});

test("o domínio exibido acompanha onde o site está de fato", () => {
  // Derivado do SITE_URL: foi a cópia solta que deixou o cartão de
  // compartilhamento anunciar endereço inexistente.
  expect(dominioPublico()).not.toContain(DOMINIO_MORTO);
  expect(dominioPublico()).not.toMatch(/^www\./);
});

test("rodapé e política mostram o MESMO endereço", async ({ page }) => {
  for (const rota of ["/", "/privacidade"]) {
    await page.goto(rota);
    const mailtos = await page
      .locator('a[href^="mailto:"]')
      .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    expect(mailtos.length, rota).toBeGreaterThan(0);
    for (const href of mailtos) {
      expect(href, rota).toBe(`mailto:${EMAIL_CONTATO}`);
    }
  }
});
