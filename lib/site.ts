/**
 * Fonte única da URL pública do site. Ninguém lê NEXT_PUBLIC_SITE_URL direto:
 * plataformas de deploy (Railway etc.) fornecem o domínio sem protocolo, e um
 * valor cru desses explode o new URL() do metadataBase no build.
 */
function normalizar(bruto: string | undefined): string {
  const valor = bruto?.trim().replace(/\/+$/, "");
  if (!valor) return "https://munay.app.br";
  return /^https?:\/\//i.test(valor) ? valor : `https://${valor}`;
}

export const SITE_URL = normalizar(process.env.NEXT_PUBLIC_SITE_URL);
