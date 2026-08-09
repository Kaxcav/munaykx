import { sendEmail, layoutEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { corpoParaEmailHtml } from "@/lib/posts";

/**
 * E-mail de AVISO NOVO da comunidade (STORY-010, tarefa 7). Mesma regra dos
 * outros e-mails do projeto: disparo pós-commit, fire-and-forget, `sendEmail`
 * engole erro; sem `EMAIL_PROVIDER` vira no-op logado.
 *
 * Diferença que importa: este e-mail é **opt-in** (a pessoa ligou), enquanto o
 * de evento novo é opt-out. O rodapé traz o descadastro assinado de um clique,
 * na mesma URL `/descadastrar/[token]` do aviso de evento — uma URL só de
 * descadastro é o que o provedor de e-mail e o leitor esperam.
 */

const linkComunidade = (slug: string) => `${SITE_URL}/comunidades/${slug}`;
const linkDescadastro = (token: string) => `${SITE_URL}/descadastrar/${token}`;

/** Primeira linha do aviso, cortada — assunto de e-mail não é o corpo inteiro. */
function resumo(corpo: string, limite = 60): string {
  const linha = corpo.split(/\r?\n/)[0]?.trim() ?? "";
  return linha.length > limite ? `${linha.slice(0, limite - 1)}…` : linha;
}

export function conteudoAvisoNovo(opts: {
  comunidade: { nome: string; slug: string };
  corpo: string;
  tokenDescadastro: string;
}): { html: string; text: string } {
  const { comunidade, corpo, tokenDescadastro } = opts;
  const url = linkDescadastro(tokenDescadastro);
  return layoutEmail({
    titulo: `Aviso de ${comunidade.nome}`,
    // Corpo escapado e linkificado aqui: é texto de terceiro entrando em HTML.
    corpo:
      `${corpoParaEmailHtml(corpo)}<br><br>` +
      `Você recebe este aviso porque ligou os avisos de <strong>${comunidade.nome}</strong> na MUNAY.`,
    botao: { rotulo: "Ver a comunidade", url: linkComunidade(comunidade.slug) },
    rodape:
      `Não quer mais os avisos desta comunidade? Descadastre sem login: ` +
      `<a href="${url}">${url}</a>`,
  });
}

export async function emailAvisoNovo(opts: {
  para: string;
  comunidade: { nome: string; slug: string };
  corpo: string;
  tokenDescadastro: string;
}) {
  const { html, text } = conteudoAvisoNovo(opts);
  return sendEmail({
    to: opts.para,
    subject: `${opts.comunidade.nome}: ${resumo(opts.corpo)}`,
    html,
    text,
  });
}
