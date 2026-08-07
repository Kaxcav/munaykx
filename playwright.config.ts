import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright da MUNAY.
 *
 * Por que isto existe: até 06/08/2026 os testes eram andaimes `.mjs` que
 * alguém rodava à mão contra um `next dev` de pé. Andaime que ninguém roda
 * não protege nada — e o caso mais perigoso do produto (e-mail que falha em
 * silêncio, porque `sendEmail` engole erro de propósito) é justamente o que
 * humano nenhum percebe revisando diff.
 *
 * Roda contra o build de produção (`next start`), não contra `next dev`: dev
 * tem overlay de erro, recompilação sob demanda e comportamento diferente de
 * cache. Testar dev é testar um app que não existe em produção.
 */
const PORTA = 3100;
const BASE = `http://127.0.0.1:${PORTA}`;

export default defineConfig({
  testDir: "./tests",
  // Sem paralelismo entre arquivos: os testes compartilham um Postgres só e
  // o RSVP disputa capacidade de propósito. Paralelizar aqui não acelera
  // nada relevante e cria falha intermitente, que é pior que teste lento.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Escape hatch pra ambiente que já tem um Chromium instalado e não
        // pode (ou não quer) baixar outro — container corporativo, sandbox,
        // CI com cache de imagem. Sem a env, o Playwright usa o dele, que é
        // o caminho normal e o do GitHub Actions.
        ...(process.env.PW_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],

  webServer: {
    command: `npx next start -p ${PORTA}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Credenciais de teste do /admin. Nunca há default no código
      // (regra do projeto: senha default não existe), então o teste
      // precisa fornecer as suas.
      ADMIN_USER: "teste",
      ADMIN_PASSWORD: "senha-de-teste-longa-o-suficiente",
      NEXT_PUBLIC_SITE_URL: BASE,
      // E-mail DESLIGADO de propósito na suíte de UI: o que interessa aqui
      // é que a copy não promete aviso quando não há provedor. O
      // comportamento do envio em si é testado em tests/email-modo.spec.ts,
      // sem servidor.
      EMAIL_PROVIDER: "",
      // Auth DESLIGADA de propósito, pelo mesmo motivo — e este é mais
      // grave que parece. Em 06/08/2026 três páginas chamavam
      // `auth.api.getSession()` sem guard; uma delas era o `<Header />`,
      // que está em TODA página. Sem `BETTER_AUTH_SECRET`, a lib lançava e
      // o site INTEIRO respondia 500. Rodar a suíte sempre sem o segredo
      // faz de cada teste de página uma prova de que o site fica de pé
      // sem ele — e o CI passa a reprovar a volta desse bug.
      // Vazio vence o que estiver no ambiente (o job do CI define o seu).
      BETTER_AUTH_SECRET: "",
    },
  },
});
