/**
 * Fonte única da URL pública do site. Ninguém lê NEXT_PUBLIC_SITE_URL direto:
 * plataformas de deploy (Railway etc.) fornecem o domínio sem protocolo, e um
 * valor cru desses explode o new URL() do metadataBase no build.
 *
 * Sutileza que custou um teste quebrado (06/08/2026): em código de SERVIDOR
 * (middleware, route handler, RSC) esta variável é lida em RUNTIME — trocar
 * no Railway e reiniciar já muda o comportamento. No bundle de CLIENTE ela é
 * embutida no BUILD, e lá só muda com rebuild. As duas coisas são verdade ao
 * mesmo tempo; provado subindo o MESMO `.next` com três valores diferentes e
 * vendo o middleware mudar de destino nas três.
 */
function normalizar(bruto: string | undefined): string {
  const valor = bruto?.trim().replace(/\/+$/, "");
  if (!valor) return "https://sejamunay.com.br";
  return /^https?:\/\//i.test(valor) ? valor : `https://${valor}`;
}

export const SITE_URL = normalizar(process.env.NEXT_PUBLIC_SITE_URL);

/**
 * Host canônico pro middleware. **String vazia = não canonicalizar.**
 *
 * Por que não usar o `SITE_URL` direto aqui: o fallback existe pra o
 * `metadataBase` e as OG images não explodirem sem env — para isso um chute
 * é inofensivo. Pro middleware não é: canonicalizar contra um chute
 * significa que **esquecer uma variável derruba o site inteiro**, com todo
 * visitante levando 308 pra um domínio que talvez nem seja nosso. E o
 * sintoma seria "o site sumiu", não "faltou uma env".
 *
 * Então a regra é: só redireciona quem foi configurado de propósito. Sem
 * `NEXT_PUBLIC_SITE_URL`, o site atende em qualquer host — que é exatamente
 * o comportamento de antes do redirect existir.
 */
export function hostCanonico(
  bruto: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
): string {
  if (!bruto?.trim()) return "";
  try {
    return new URL(normalizar(bruto)).host.toLowerCase();
  } catch {
    // Valor sujo no painel (espaço, aspas, texto solto) não pode virar
    // redirect pra lugar nenhum — melhor não canonicalizar.
    return "";
  }
}
