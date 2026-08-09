import { SITE_URL } from "@/lib/site";

/**
 * Contato público da MUNAY — fonte única.
 *
 * POR QUE ESTE ARQUIVO EXISTE (07/08/2026): o rodapé, a política de
 * privacidade e as duas imagens de OG mostravam `contato@munay.app.br`,
 * cada um com a sua cópia da string e um `TODO: trocar quando o domínio
 * for registrado`. O domínio foi registrado — `sejamunay.com.br` — e os
 * TODOs ficaram pra trás, como TODO sempre fica.
 *
 * Pior: `munay.app.br` **não existe** (NXDOMAIN, verificado no DNS). Ou
 * seja, o endereço que o site publicava não era só o errado — era um
 * endereço pra onde e-mail nenhum consegue nem tentar chegar. E um deles
 * estava na política de privacidade, como canal do titular de dados. Um
 * canal de LGPD que devolve bounce é pior que não ter canal: promete
 * atendimento que não pode acontecer.
 *
 * PENDÊNCIA DE INFRAESTRUTURA, e ela é do Kaxcav, não do código:
 * `sejamunay.com.br` ainda **não tem registro MX**. O domínio envia (a
 * Resend está verificada e o magic link sai daqui), mas não recebe. Até
 * existir MX apontando pra algum provedor, e-mail mandado pra este
 * endereço volta. O endereço abaixo é o certo; o que falta é a caixa.
 */
export const EMAIL_CONTATO = "ola@sejamunay.com.br";

/**
 * ── CANAIS DO RODAPÉ (briefing 07/08/2026, item 13.1) ────────────────────
 *
 * O PO pediu e-mail, telefone, WhatsApp, Instagram e os perfis pessoais dos
 * fundadores no rodapé.
 *
 * ⚠️ NENHUM DESSES DADOS EXISTE NO PROJETO. Não estão no repositório, não
 * estão em doc nenhum e não foram passados. Então este arquivo os declara
 * **vazios**, e o `<Footer />` só renderiza canal que tem valor.
 *
 * POR QUE VAZIO EM VEZ DE PLACEHOLDER: a alternativa era cravar
 * `(61) 9xxxx-xxxx` ou `@munay` "pra ajustar depois". Foi exatamente isso
 * que produziu o `contato@munay.app.br` — um endereço inventado que ficou
 * semanas no ar, inclusive na política de privacidade e no cartão de
 * compartilhamento. Telefone errado no rodapé é pior que rodapé sem
 * telefone: um não atende, o outro faz a pessoa achar que foi ignorada. E
 * `@munay` no Instagram pertence a outra pessoa — publicar seria mandar
 * nosso tráfego pro perfil de um terceiro.
 *
 * COMO PREENCHER: troque a string vazia pelo valor real. O rodapé se monta
 * sozinho. Zero mudança de componente.
 */
/**
 * NOTA DE TIPO — o `: Canais` explícito não é decoração. Com `as const`, o
 * TypeScript infere o tipo literal `""` pra cada campo, conclui que
 * `if (CANAIS.telefone)` é sempre falso e reduz o corpo do `if` a `never` —
 * o rodapé nem compilava. Pior: no dia em que alguém preenchesse o número,
 * o tipo mudaria junto e a checagem viraria "sempre verdadeira". O tipo tem
 * que ser `string` porque o VALOR é temporário, não o contrato.
 */
type Canais = { whatsapp: string; telefone: string; instagram: string };

export const CANAIS: Canais = {
  /** Formato internacional, só dígitos — vira link wa.me. Ex.: "5561999999999". */
  whatsapp: "",
  /** Como deve APARECER pra pessoa. Ex.: "(61) 99999-9999". */
  telefone: "",
  /** Handle sem o @. Ex.: "sejamunay". */
  instagram: "",
};

export type Fundador = {
  nome: string;
  /** O que a pessoa faz — uma linha, sem cargo corporativo. */
  papel: string;
  /** Handle do Instagram sem @, ou "" se não for expor. */
  instagram?: string;
  /** URL completa de LinkedIn ou site pessoal, ou "" . */
  link?: string;
};

/**
 * ── FUNDADORES (briefing 07/08/2026, item 13.2) ──────────────────────────
 *
 * Transcrição do racional do PO, porque ele muda o desenho da seção:
 * "O objetivo é que os usuários conheçam e se aproximem dos fundadores. A
 * lógica é de mão dupla: nós também somos usuários da plataforma, e essa
 * proximidade valida a comunidade de dentro para fora. Não é um rodapé
 * corporativo — é um convite a fazer parte."
 *
 * ⚠️ VAZIO DE PROPÓSITO, e aqui o motivo é mais forte que nos canais: expor
 * o perfil pessoal de alguém é decisão DA PESSOA, não de quem escreve o
 * componente. Publicar o Instagram pessoal do Mateus ou do Kaxcav sem os
 * dois confirmarem seria decidir pela exposição de terceiro — e o briefing
 * chama isso de "perfis pessoais", ou seja, conta pessoal mesmo, não
 * institucional.
 *
 * Preencher exige: nome como querem ser chamados, uma linha de papel e o
 * OK explícito de cada um sobre qual perfil vai ao ar.
 */
export const FUNDADORES: Fundador[] = [];

/**
 * Link de WhatsApp já com a mensagem inicial — só quando há número.
 *
 * Recebe o número por parâmetro desde a Onda 1 do ULTRAPLAN: o valor agora
 * pode vir do conteúdo editável no /admin, e `CANAIS` virou o PADRÃO de
 * fábrica em vez da única fonte. Sem argumento, mantém o comportamento antigo.
 */
export function linkWhatsApp(numero: string = CANAIS.whatsapp): string | null {
  if (!numero) return null;
  const texto = encodeURIComponent("Oi! Vim pelo site da MUNAY.");
  return `https://wa.me/${numero}?text=${texto}`;
}

export function linkInstagram(handle: string): string {
  return `https://instagram.com/${handle}`;
}

/**
 * Domínio pra exibir (imagens de OG, rodapé). Derivado do `SITE_URL` de
 * propósito: assim nunca mais diverge de onde o site realmente está — foi
 * exatamente esse tipo de cópia solta que fez o cartão de compartilhamento
 * anunciar um domínio inexistente por semanas.
 */
export function dominioPublico(): string {
  try {
    return new URL(SITE_URL).host.replace(/^www\./, "");
  } catch {
    return "sejamunay.com.br";
  }
}
