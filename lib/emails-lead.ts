import { sendEmail, layoutEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import type { LeadInput } from "@/lib/leads";

/**
 * E-mail de confirmação da lista de espera.
 *
 * Existe para fechar um buraco medido em 09/08/2026: o `LeadSection` diz
 * "você está na lista, te avisamos", e `app/api/leads/route.ts` gravava o
 * lead sem mandar nada. A pessoa entregava o contato e recebia silêncio —
 * sem recibo, sem prova de que o cadastro funcionou, e sem nenhum jeito de
 * saber o que a MUNAY guardou dela.
 *
 * Isto é uma CONFIRMAÇÃO, não a campanha de lançamento. O aviso de "a MUNAY
 * abriu" continua sendo decisão do dono e sai por outro caminho.
 *
 * Três regras de copy nascem de fatos do projeto, não de gosto:
 *
 * 1. **Não promete data.** Não existe data de lançamento decidida. Prometer
 *    prazo aqui seria o mesmo erro do bullet de comissão que saiu da landing
 *    em 07/08 — publicar oferta sem nada atrás.
 * 2. **Não manda responder o e-mail.** O domínio `sejamunay.com.br` não tem
 *    registro MX: resposta a este endereço volta como bounce. Enquanto isso
 *    for verdade, o caminho de contato é a política de privacidade.
 * 3. **Serve de recibo do consentimento.** Diz o que foi guardado, por que a
 *    pessoa está recebendo e para onde ir para pedir remoção — que é o que a
 *    `/privacidade` promete e até agora ninguém entregava por escrito.
 *
 * Mesmo padrão de envio dos outros `emails-*`: disparo pós-commit,
 * fire-and-forget, `sendEmail` engole erro. Sem `EMAIL_PROVIDER` vira no-op
 * logado — o lead já está gravado, e e-mail não pode derrubar cadastro.
 */

type TipoLead = LeadInput["tipo"];

/**
 * A data do cadastro entra formatada em Brasília, não em UTC.
 *
 * Recibo com a data errada é pior que recibo sem data, e o projeto já pagou
 * por isso uma vez: `new Date("2006-08-08")` é meia-noite UTC e vira dia 7
 * aqui, o que abriu o portão de idade da LGPD um dia cedo (STORY-011).
 */
function dataPorExtenso(quando: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "long",
  }).format(quando);
}

const RECIBO = (quando: Date) =>
  `Você recebeu este e-mail porque deixou seu contato em ` +
  `<a href="${SITE_URL}">sejamunay.com.br</a> em ${dataPorExtenso(quando)}. ` +
  `Guardamos só o que você preencheu no formulário, e não repassamos para ` +
  `ninguém. Para consultar ou pedir a remoção dos seus dados, veja a ` +
  `<a href="${SITE_URL}/privacidade">Política de Privacidade</a>.`;

export function conteudoListaEspera(opts: {
  nome: string;
  tipo: TipoLead;
  quando: Date;
}): { html: string; text: string } {
  const { nome, tipo, quando } = opts;
  // Só o primeiro nome: o e-mail fica com voz de gente, e um "nome" que veio
  // de campo livre não é exibido inteiro sem necessidade.
  const primeiro = nome.trim().split(/\s+/)[0] ?? nome.trim();

  if (tipo === "organizador") {
    return layoutEmail({
      titulo: "Você está na lista da MUNAY",
      corpo:
        `Oi, ${primeiro}. Deu certo — seu contato entrou na lista de ` +
        `organizadores da MUNAY.<br><br>` +
        `Quando abrirmos o cadastro de comunidades, o aviso chega neste ` +
        `mesmo endereço. Não temos data para prometer, e preferimos não ` +
        `inventar uma.<br><br>` +
        `Enquanto isso, dá uma olhada no que já está no ar.`,
      botao: { rotulo: "Ver a MUNAY", url: `${SITE_URL}/#organizador` },
      rodape: RECIBO(quando),
    });
  }

  return layoutEmail({
    titulo: "Você está na lista da MUNAY",
    corpo:
      `Oi, ${primeiro}. Deu certo — seu contato está na lista.<br><br>` +
      `A MUNAY junta num lugar só as comunidades esportivas e culturais de ` +
      `Brasília: onde é, que horas, quem organiza e se pega bem chegar sem ` +
      `conhecer ninguém.<br><br>` +
      `Quando abrir, o aviso chega neste mesmo endereço. Não temos data para ` +
      `prometer, e preferimos não inventar uma.<br><br>` +
      `Enquanto isso, dá uma conferida no que já está no ar.`,
    botao: { rotulo: "Ver as comunidades", url: `${SITE_URL}/comunidades` },
    rodape: RECIBO(quando),
  });
}

export async function emailListaEspera(opts: {
  para: string;
  nome: string;
  tipo: TipoLead;
  quando: Date;
}) {
  const { html, text } = conteudoListaEspera(opts);
  return sendEmail({
    to: opts.para,
    subject: "Você está na lista da MUNAY",
    html,
    text,
  });
}
