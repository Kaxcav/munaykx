/**
 * Compartilhamento — o laço de crescimento da MUNAY.
 *
 * A plataforma cresce quando um membro joga o link no WhatsApp do grupo. Este
 * módulo monta a URL pública e o TEXTO que acompanha o link — e o texto é
 * **grounded**: só usa dado que a página já mostra, nada inventado. É o mesmo
 * princípio do JSON-LD de evento (`lib/events.ts`) e da busca (`lib/ia.ts`):
 * descrever o que existe, nunca o que seria bonito existir.
 *
 * Funções puras de propósito — sem I/O, sem React — para serem testáveis sem
 * subir servidor. A UI (WhatsApp / copiar / Web Share) vive em
 * `components/CompartilharBotoes.tsx`.
 */
import { SITE_URL } from "@/lib/site";
import { formatarDataEvento } from "@/lib/events";

/** URL pública absoluta de uma comunidade. */
export function urlComunidade(slug: string): string {
  return `${SITE_URL}/comunidades/${slug}`;
}

/** URL pública absoluta de um evento. */
export function urlEvento(slug: string): string {
  return `${SITE_URL}/eventos/${slug}`;
}

/** Só o que o compartilhamento precisa saber de um evento (estrutural, não Prisma). */
export type EventoCompartilhavel = {
  titulo: string;
  startsAt: Date;
  local: string | null;
  community: { regiao: string };
};

/** Só o que o compartilhamento precisa saber de uma comunidade. */
export type ComunidadeCompartilhavel = {
  modalidade: string;
  regiao: string;
};

/**
 * Texto natural para o evento. Ex.:
 *   "Bora nesse? Treino de Corrida — sáb., 15 de ago., 19h00, no Parque da Cidade"
 *
 * `local` cai na REGIÃO da comunidade quando não há lugar exato — a mesma
 * verdade disponível que a página de evento e o JSON-LD já usam (nunca um
 * endereço inventado).
 */
export function textoCompartilharEvento(ev: EventoCompartilhavel): string {
  const local = ev.local?.trim() || ev.community.regiao;
  return `Bora nesse? ${ev.titulo} — ${formatarDataEvento(ev.startsAt)}, no ${local}`;
}

/**
 * Texto natural para a comunidade. Ex.:
 *   "Achei essa galera de Jiu-jítsu no Plano Piloto, dá uma olhada:"
 * (o link vem logo em seguida, montado pelo componente.)
 */
export function textoCompartilharComunidade(c: ComunidadeCompartilhavel): string {
  return `Achei essa galera de ${c.modalidade} no ${c.regiao}, dá uma olhada:`;
}

/**
 * Monta o link de compartilhamento do WhatsApp (`wa.me`), com texto + URL já
 * codificados. É o mesmo link que abre o WhatsApp no celular e no desktop.
 */
export function linkWhatsApp(texto: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`;
}
