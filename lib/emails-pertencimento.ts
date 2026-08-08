import { sendEmail, layoutEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { formatarDataEvento } from "@/lib/events";

/**
 * E-mail de "evento novo" pros seguidores (STORY-008, tarefa 6). Mesma regra
 * dos e-mails do projeto: disparo pós-commit, fire-and-forget, `sendEmail`
 * engole erro; sem `EMAIL_PROVIDER` vira no-op logado (domínio sem MX não
 * quebra). O rodapé traz o link de descadastro assinado (uma volta, sem login).
 */

const linkEvento = (slug: string) => `${SITE_URL}/eventos/${slug}`;
const linkDescadastro = (token: string) => `${SITE_URL}/descadastrar/${token}`;

export function conteudoEventoNovo(opts: {
  comunidade: string;
  evento: { titulo: string; slug: string; startsAt: Date };
  tokenDescadastro: string;
}): { html: string; text: string } {
  const { comunidade, evento, tokenDescadastro } = opts;
  const url = linkDescadastro(tokenDescadastro);
  return layoutEmail({
    titulo: `Novo evento em ${comunidade}`,
    corpo:
      `<strong>${evento.titulo}</strong><br>${formatarDataEvento(evento.startsAt)}<br><br>` +
      `Você recebe este aviso porque segue <strong>${comunidade}</strong> na MUNAY.`,
    botao: { rotulo: "Ver o evento", url: linkEvento(evento.slug) },
    // URL crua também no texto, pra sobreviver ao text/plain do e-mail.
    rodape:
      `Não quer mais avisos desta comunidade? Descadastre sem login: ` +
      `<a href="${url}">${url}</a>`,
  });
}

export async function emailEventoNovo(opts: {
  para: string;
  comunidade: string;
  evento: { titulo: string; slug: string; startsAt: Date };
  tokenDescadastro: string;
}) {
  const { html, text } = conteudoEventoNovo(opts);
  return sendEmail({
    to: opts.para,
    subject: `Novo evento em ${opts.comunidade}: ${opts.evento.titulo}`,
    html,
    text,
  });
}
