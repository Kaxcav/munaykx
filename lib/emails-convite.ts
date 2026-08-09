import { sendEmail, layoutEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

/**
 * E-mail de convite pra administrar uma organização (STORY-009, frente D).
 *
 * Mesma regra dos e-mails do projeto: disparo fora de transação,
 * fire-and-forget, e `sendEmail` engole erro. Sem `EMAIL_PROVIDER` vira no-op
 * logado — nada sai, e o domínio sem MX não quebra nada.
 */

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const linkConvite = (token: string) => `${SITE_URL}/convite/${token}`;

export function conteudoConvite(opts: {
  organizacao: string;
  token: string;
}): { html: string; text: string } {
  const org = escapar(opts.organizacao);
  return layoutEmail({
    titulo: "Você foi convidado a administrar uma organização",
    corpo:
      `Convidaram você para administrar <strong>${org}</strong> na MUNAY. ` +
      `Aceitando, você passa a gerenciar as comunidades, os eventos e a lista ` +
      `de inscritos dessa organização.`,
    botao: { rotulo: "Aceitar convite", url: linkConvite(opts.token) },
    rodape:
      "Se você não esperava este convite, pode ignorar — nada acontece sem você aceitar.",
  });
}

export async function emailConvite(opts: {
  para: string;
  organizacao: string;
  token: string;
}) {
  const { html, text } = conteudoConvite({
    organizacao: opts.organizacao,
    token: opts.token,
  });
  return sendEmail({
    to: opts.para,
    subject: `Convite para administrar ${opts.organizacao} na MUNAY`,
    html,
    text,
  });
}
