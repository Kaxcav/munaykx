import { sendEmail, layoutEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { formatarDataEvento } from "@/lib/events";
import { CAMPOS_GUIA, temGuia, type GuiaIniciante } from "@/lib/guia";

/**
 * E-MAIL "O QUE ESPERAR" — a véspera do evento (1 dia antes) pro confirmado.
 *
 * Ataca o maior ponto de abandono da jornada: confirmou e não vai. A pessoa
 * chega mais provável quando sabe o que levar, como chegar, quem vai estar lá e
 * o nível — então o e-mail é EXATAMENTE isso, montado do guia de primeira vez
 * (`guiaIniciante`, #33) + dos dados reais do evento/comunidade.
 *
 * GROUNDED: se a comunidade acolhe iniciante E tem guia, mostra o guia; senão,
 * uma versão genérica curta e honesta (sem inventar ponto de encontro que não
 * foi informado). Nível/local/rota entram só quando existem.
 *
 * Mesma regra dos e-mails do projeto: `sendEmail` engole erro; sem
 * `EMAIL_PROVIDER` vira no-op logado (nada quebra). O rodapé leva à gestão da
 * inscrição SEM login (via token) — "não vai poder ir?" libera a vaga pra fila.
 */

const linkEvento = (slug: string) => `${SITE_URL}/eventos/${slug}`;
const linkGestao = (token: string) => `${SITE_URL}/rsvp/${token}`;

export type DadosVespera = {
  evento: { titulo: string; slug: string; startsAt: Date };
  comunidade: string;
  local: string | null;
  modoRota: boolean;
  origem: string | null;
  destino: string | null;
  percursoObs: string | null;
  nivel: string | null;
  acolheIniciante: boolean;
  guia: GuiaIniciante;
  tokenGestao: string;
};

/** O bloco "onde" em texto: rota (saída→chegada) ou local único. `null` se não
 *  há nenhum dos dois (não inventa lugar). */
export function blocoOnde(d: DadosVespera): string | null {
  if (d.modoRota && (d.origem || d.destino)) {
    const partes = [
      d.origem ? `Saída: ${d.origem}` : null,
      d.destino ? `Chegada: ${d.destino}` : null,
      d.percursoObs,
    ].filter(Boolean);
    return partes.join(" · ");
  }
  return d.local || null;
}

/** Conteúdo do e-mail. Puro e exportado pra ser testado sem servidor de e-mail. */
export function conteudoVespera(d: DadosVespera): { html: string; text: string } {
  const linhas: string[] = [
    `<strong>${d.evento.titulo}</strong>`,
    formatarDataEvento(d.evento.startsAt),
  ];
  const onde = blocoOnde(d);
  if (onde) linhas.push(onde);
  if (d.nivel) linhas.push(`Nível: ${d.nivel}`);

  // Guia de primeira vez (grounded): só quando acolhe iniciante E tem conteúdo.
  // Senão, uma orientação genérica honesta — não inventa ponto de encontro.
  let guiaHtml: string;
  if (d.acolheIniciante && temGuia(d.guia)) {
    const itens = CAMPOS_GUIA.filter((c) => d.guia[c.chave]).map(
      (c) => `<strong>${c.rotulo}:</strong> ${d.guia[c.chave]}`,
    );
    guiaHtml = `Pra sua primeira vez:<br>${itens.join("<br>")}`;
  } else {
    guiaHtml =
      "Dica: chega uns 10 minutinhos antes e procura o pessoal do grupo — eles te recebem. Qualquer dúvida, é só responder este e-mail.";
  }

  const corpo =
    `É amanhã! Separamos o que esperar pra você chegar tranquilo.<br><br>` +
    `${linhas.join("<br>")}<br><br>` +
    `${guiaHtml}`;

  const url = linkGestao(d.tokenGestao);
  return layoutEmail({
    titulo: `Amanhã tem: ${d.evento.titulo}`,
    corpo,
    botao: { rotulo: "Ver o evento", url: linkEvento(d.evento.slug) },
    rodape:
      `Não vai poder ir? Avise a gente e libere a vaga pra quem está na fila: ` +
      `<a href="${url}">${url}</a>`,
  });
}

export async function emailVesperaEvento(opts: { para: string } & DadosVespera) {
  const { html, text } = conteudoVespera(opts);
  return sendEmail({
    to: opts.para,
    subject: `Amanhã tem: ${opts.evento.titulo}`,
    html,
    text,
  });
}
