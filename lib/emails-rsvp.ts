import { sendEmail, layoutEmail } from "@/lib/email";
import { formatarDataEvento } from "@/lib/events";
import { SITE_URL } from "@/lib/site";

/**
 * E-mails transacionais de inscrição (STORY-004).
 *
 * REGRA DE OURO DESTE ARQUIVO: nada aqui é chamado DENTRO da transação
 * Serializable. O RSVP e o cancelamento rodam com retry (withSerializableRetry);
 * enviar de dentro faria a pessoa receber o mesmo e-mail várias vezes a cada
 * repetição. Envio é sempre DEPOIS do commit — e nunca derruba a resposta:
 * `sendEmail` engole o erro e loga.
 *
 * O e-mail mais importante daqui é o de PROMOÇÃO. Antes dele, quem estava na
 * lista de espera só descobria que tinha vaga se abrisse o link por conta
 * própria — a fila andava em silêncio.
 */

type DadosEvento = {
  titulo: string;
  startsAt: Date;
  local: string | null;
  slug: string;
};

const linkGestao = (token: string) => `${SITE_URL}/rsvp/${token}`;
const linkEvento = (slug: string) => `${SITE_URL}/eventos/${slug}`;

/** "sáb., 15 de ago., 19h00 · Parque da Cidade" */
function quandoEOnde(evento: DadosEvento): string {
  const quando = formatarDataEvento(evento.startsAt);
  return evento.local ? `${quando} · ${evento.local}` : quando;
}

const RODAPE_LINK =
  "Guarda este e-mail: o link acima é o seu acesso pra ver ou cancelar a inscrição, sem senha nenhuma.";

export async function emailRsvpConfirmado(opts: {
  para: string;
  nome: string;
  evento: DadosEvento;
  token: string;
}) {
  const { html, text } = layoutEmail({
    titulo: "Presença confirmada ✓",
    corpo: `${opts.nome}, sua vaga em <strong>${opts.evento.titulo}</strong> está garantida.<br>${quandoEOnde(opts.evento)}`,
    botao: { rotulo: "Ver minha inscrição", url: linkGestao(opts.token) },
    rodape: `${RODAPE_LINK} Se não puder ir, cancela por lá — a vaga passa pra quem está esperando.`,
  });
  return sendEmail({
    to: opts.para,
    subject: `Presença confirmada — ${opts.evento.titulo}`,
    html,
    text,
  });
}

export async function emailRsvpListaEspera(opts: {
  para: string;
  nome: string;
  evento: DadosEvento;
  token: string;
}) {
  const { html, text } = layoutEmail({
    titulo: "Você entrou na lista de espera",
    corpo: `${opts.nome}, as vagas de <strong>${opts.evento.titulo}</strong> acabaram — mas você está na fila.<br>${quandoEOnde(opts.evento)}<br><br>Se alguém desistir, sua vaga é confirmada automaticamente e <strong>a gente te avisa por e-mail</strong>. Não precisa ficar conferindo.`,
    botao: { rotulo: "Acompanhar minha inscrição", url: linkGestao(opts.token) },
    rodape: RODAPE_LINK,
  });
  return sendEmail({
    to: opts.para,
    subject: `Lista de espera — ${opts.evento.titulo}`,
    html,
    text,
  });
}

/** O e-mail que fazia falta: a fila andou e a pessoa precisa saber. */
export async function emailRsvpPromovido(opts: {
  para: string;
  nome: string;
  evento: DadosEvento;
  token: string;
}) {
  const { html, text } = layoutEmail({
    titulo: "Abriu vaga — você está confirmado ✓",
    corpo: `${opts.nome}, alguém desistiu e <strong>a sua vez chegou</strong>: sua inscrição em <strong>${opts.evento.titulo}</strong> saiu da lista de espera e está confirmada.<br>${quandoEOnde(opts.evento)}<br><br>Não precisa fazer nada. Só aparecer.`,
    botao: { rotulo: "Ver minha inscrição", url: linkGestao(opts.token) },
    rodape: `${RODAPE_LINK} Se não puder mais ir, cancela por lá pra vaga passar adiante.`,
  });
  return sendEmail({
    to: opts.para,
    subject: `Abriu vaga: você está confirmado — ${opts.evento.titulo}`,
    html,
    text,
  });
}

export async function emailRsvpCancelado(opts: {
  para: string;
  nome: string;
  evento: DadosEvento;
}) {
  const { html, text } = layoutEmail({
    titulo: "Inscrição cancelada",
    corpo: `${opts.nome}, sua inscrição em <strong>${opts.evento.titulo}</strong> foi cancelada e a vaga já foi liberada.<br><br>Mudou de ideia? Dá pra se inscrever de novo enquanto houver vaga.`,
    botao: {
      rotulo: "Voltar para o evento",
      url: linkEvento(opts.evento.slug),
    },
    rodape:
      "Se não foi você que cancelou, se inscreve de novo pelo link acima — nada foi perdido.",
  });
  return sendEmail({
    to: opts.para,
    subject: `Inscrição cancelada — ${opts.evento.titulo}`,
    html,
    text,
  });
}

/**
 * Dispara sem travar a resposta HTTP. E-mail é efeito colateral: se falhar,
 * a inscrição continua válida e o problema vai pro log, não pro usuário.
 */
export function dispararEmail(promessa: Promise<unknown>): void {
  void promessa.catch((error) => {
    console.error(
      "[emails-rsvp] falha ao disparar:",
      error instanceof Error ? error.message : error,
    );
  });
}
