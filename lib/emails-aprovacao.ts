import { sendEmail, layoutEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

/**
 * E-mail de recusa de comunidade (STORY-009, frente B).
 *
 * Mesma regra de ouro dos e-mails do projeto: NUNCA sai de dentro de uma
 * transação, o disparo é DEPOIS do commit da decisão, e `sendEmail` engole o
 * erro (e-mail não derruba a operação). Na suíte e em qualquer ambiente sem
 * `EMAIL_PROVIDER`, `sendEmail` vira no-op logado — nada sai, e o domínio sem
 * MX não quebra nada.
 *
 * Este é o ÚNICO lugar onde o motivo escrito pelo admin fica registrado: o
 * schema da fundação não tem coluna de motivo (ver `lib/aprovacao.ts`, nota 3).
 */

/** Escapa o mínimo pra o texto do admin não injetar HTML no corpo do e-mail. */
function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Conteúdo puro (sem I/O), pra dar pra testar sem servidor nem provedor. */
export function conteudoRecusa(opts: {
  nome: string;
  motivo: string;
}): { html: string; text: string } {
  const nome = escapar(opts.nome.trim());
  const motivo = escapar(opts.motivo.trim());
  return layoutEmail({
    titulo: "Sobre o cadastro da sua comunidade",
    corpo:
      `Olá! Revisamos o cadastro de <strong>${nome}</strong> na MUNAY e, ` +
      `por ora, ele não foi aprovado.<br><br>` +
      `<strong>Motivo:</strong> ${motivo}<br><br>` +
      `Você pode ajustar os pontos acima e cadastrar de novo — nada foi publicado.`,
    botao: { rotulo: "Voltar para a MUNAY", url: SITE_URL },
    rodape:
      "Recebeu isto por engano? Pode ignorar — sua comunidade não foi ao ar.",
  });
}

/** Dispara o e-mail de recusa. Retorna o resultado do `sendEmail` (nunca lança). */
export async function emailComunidadeRecusada(opts: {
  para: string;
  nome: string;
  motivo: string;
}) {
  const { html, text } = conteudoRecusa({ nome: opts.nome, motivo: opts.motivo });
  return sendEmail({
    to: opts.para,
    subject: `Cadastro de ${opts.nome.trim()} — precisa de ajustes`,
    html,
    text,
  });
}
