import { test, expect } from "@playwright/test";
import { emailConfigurado, statusEmail } from "@/lib/email";

/**
 * Os três estados do e-mail. Sem servidor, sem banco — só a função de decisão.
 *
 * O estado do meio (`teste`) é o que engana e o motivo desta suíte existir:
 * com o remetente `onboarding@resend.dev`, a Resend entrega SÓ pro dono da
 * conta e devolve 403 pro resto. Como `sendEmail` engole erro de propósito
 * (e-mail não pode derrubar inscrição), o sintoma é silêncio — o dono testa,
 * recebe, conclui "funciona", e nenhum participante real recebe nada.
 */

const cenario = (envs: Record<string, string>) => {
  for (const k of ["EMAIL_PROVIDER", "RESEND_API_KEY", "SMTP_URL", "EMAIL_FROM"]) {
    delete process.env[k];
  }
  Object.assign(process.env, envs);
};

test.describe("estados do e-mail", () => {
  test.afterEach(() => cenario({}));

  test("sem provedor: desligado, e a UI não promete nada", () => {
    cenario({});
    expect(emailConfigurado()).toBe(false);
    expect(statusEmail().modo).toBe("desligado");
  });

  test("resend com chave mas remetente de teste NÃO conta como configurado", () => {
    cenario({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_falsa" });
    expect(statusEmail().modo).toBe("teste");
    expect(emailConfigurado()).toBe(false);
    expect(statusEmail().detalhe).toMatch(/dono da conta/);
  });

  test("EMAIL_FROM apontado na mão pro resend.dev dá no mesmo", () => {
    cenario({
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_falsa",
      EMAIL_FROM: "MUNAY <ola@resend.dev>",
    });
    expect(emailConfigurado()).toBe(false);
  });

  test("com domínio verificado, aí sim é produção", () => {
    cenario({
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_falsa",
      EMAIL_FROM: "MUNAY <ola@sejamunay.com.br>",
    });
    expect(emailConfigurado()).toBe(true);
    expect(statusEmail().modo).toBe("producao");
  });

  test("SMTP próprio não é afetado pela regra da Resend", () => {
    cenario({
      EMAIL_PROVIDER: "smtp",
      SMTP_URL: "smtp://localhost:1025",
      EMAIL_FROM: "MUNAY <ola@sejamunay.com.br>",
    });
    expect(emailConfigurado()).toBe(true);
    expect(statusEmail().modo).toBe("producao");
  });

  test("provedor configurado pela metade é desligado, não meio-ligado", () => {
    cenario({ EMAIL_PROVIDER: "resend" });
    expect(statusEmail().modo).toBe("desligado");
    cenario({ EMAIL_PROVIDER: "smtp" });
    expect(statusEmail().modo).toBe("desligado");
  });
});
