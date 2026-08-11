import { sendEmail, layoutEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import type { LeadInput } from "@/lib/leads";

/**
 * O AVISO DE LANÇAMENTO — a outra ponta da promessa da landing.
 *
 * O formulário da lista de espera diz "te avisamos assim que a MUNAY abrir".
 * O PR #37 fechou metade disso (a confirmação imediata, que é o recibo). Esta
 * é a outra metade: o e-mail que a pessoa entrou na lista para receber.
 *
 * ── Este arquivo não decide QUANDO ─────────────────────────────────────
 *
 * Ele só monta e envia. Quem decide é o dono, clicando no `/admin/leads`.
 * Nada aqui roda em deploy, em cron ou em boot — ver `lib/lancamento.ts`, que
 * tem o teste estrutural garantindo que o único chamador é a action do admin.
 *
 * ── Copy ───────────────────────────────────────────────────────────────
 *
 * Sóbrio, e sem inventar o que não existe. O texto não promete evento, não
 * promete quantidade de comunidade e não diz "a maior plataforma de Brasília":
 * quando este e-mail sair, o site vai ter o que tiver, e a pessoa vai clicar e
 * conferir na hora. Promessa que a próxima tela desmente é pior que e-mail
 * nenhum.
 *
 * O rodapé repete o recibo do cadastro (por que chegou, como sair) pelo mesmo
 * motivo do `emails-lead.ts`: pode ter passado muito tempo entre entrar na
 * lista e receber isto, e "quem é você e por que tem meu e-mail" é a primeira
 * pergunta de quem esqueceu.
 */

type TipoLead = LeadInput["tipo"];

const RECIBO =
  `Você recebeu este e-mail porque deixou seu contato na lista de espera da ` +
  `MUNAY em <a href="${SITE_URL}">sejamunay.com.br</a>. Para consultar ou ` +
  `pedir a remoção dos seus dados, veja a ` +
  `<a href="${SITE_URL}/privacidade">Política de Privacidade</a>.`;

export function conteudoLancamento(opts: {
  nome: string;
  tipo: TipoLead;
}): { html: string; text: string } {
  const primeiro = opts.nome.trim().split(/\s+/)[0] ?? opts.nome.trim();

  if (opts.tipo === "organizador") {
    return layoutEmail({
      titulo: "A MUNAY abriu",
      corpo:
        `Oi, ${primeiro}. Você pediu para saber quando desse — deu.<br><br>` +
        `A MUNAY está no ar, e o cadastro de comunidades está aberto. Dá para ` +
        `colocar a sua no mapa, marcar os horários e receber inscrição sem ` +
        `depender de print de grupo.<br><br>` +
        `Se ainda não for a hora, tudo bem: seu contato continua com a gente e ` +
        `você não precisa fazer nada.`,
      botao: { rotulo: "Cadastrar minha comunidade", url: `${SITE_URL}/painel` },
      rodape: RECIBO,
    });
  }

  return layoutEmail({
    titulo: "A MUNAY abriu",
    corpo:
      `Oi, ${primeiro}. Você entrou na lista para saber quando desse — ` +
      `deu.<br><br>` +
      `A MUNAY está no ar: dá para procurar por modalidade, região e horário, ` +
      `ver quem organiza e saber, antes de sair de casa, se o grupo recebe ` +
      `quem está chegando agora.<br><br>` +
      `Chegar sozinho é só na primeira vez.`,
    botao: { rotulo: "Ver as comunidades", url: `${SITE_URL}/comunidades` },
    rodape: RECIBO,
  });
}

export async function emailLancamento(opts: {
  para: string;
  nome: string;
  tipo: TipoLead;
}) {
  const { html, text } = conteudoLancamento(opts);
  return sendEmail({
    to: opts.para,
    subject: "A MUNAY abriu",
    html,
    text,
  });
}
