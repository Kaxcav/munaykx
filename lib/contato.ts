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
