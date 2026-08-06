/**
 * Prova os TRÊS estados do e-mail — o do meio é o que engana.
 *
 * Roda sem servidor: importa lib/email.ts direto via tsx e mexe no
 * process.env. `node --import tsx scripts/testes/teste-email-modo.mjs`
 */
let ok = 0, fail = 0;
const check = (c, l) => { c ? (ok++, console.log("  ✓", l)) : (fail++, console.log("  ✗ FALHOU:", l)); };

const { emailConfigurado, statusEmail } = await import("../../lib/email.ts");

const cenario = (envs) => {
  for (const k of ["EMAIL_PROVIDER", "RESEND_API_KEY", "SMTP_URL", "EMAIL_FROM"])
    delete process.env[k];
  Object.assign(process.env, envs);
};

console.log("\n1) Sem provedor: desligado, e a UI não promete nada");
cenario({});
check(emailConfigurado() === false, "emailConfigurado() = false");
check(statusEmail().modo === "desligado", `modo = ${statusEmail().modo}`);

console.log("\n2) Resend com chave MAS remetente de teste: NÃO conta como configurado");
cenario({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_falsa" });
check(statusEmail().modo === "teste", `modo = ${statusEmail().modo}`);
check(
  emailConfigurado() === false,
  "emailConfigurado() = false mesmo com chave válida (só entrega pro dono da conta)",
);
check(/dono da conta/.test(statusEmail().detalhe), "o detalhe explica o porquê");

console.log("\n   …e EMAIL_FROM apontando pro resend.dev na mão dá no mesmo");
cenario({
  EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: "re_falsa",
  EMAIL_FROM: "MUNAY <ola@resend.dev>",
});
check(emailConfigurado() === false, "EMAIL_FROM com @resend.dev também é teste");

console.log("\n3) Resend com domínio verificado: aí sim é produção");
cenario({
  EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: "re_falsa",
  EMAIL_FROM: "MUNAY <ola@munay.com.br>",
});
check(emailConfigurado() === true, "emailConfigurado() = true");
check(statusEmail().modo === "producao", `modo = ${statusEmail().modo}`);

console.log("\n4) SMTP próprio não é afetado pela regra da Resend");
cenario({
  EMAIL_PROVIDER: "smtp",
  SMTP_URL: "smtp://localhost:1025",
  EMAIL_FROM: "MUNAY <ola@localhost>",
});
check(emailConfigurado() === true, "smtp com SMTP_URL = configurado");
check(statusEmail().modo === "producao", `modo = ${statusEmail().modo}`);

console.log(`\n══ ${ok} ok, ${fail} falhas ══`);
process.exit(fail ? 1 : 0);
