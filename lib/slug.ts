/**
 * Slugify — fonte única. Mora aqui, e não em `lib/admin.ts`, porque agora
 * também serve as páginas públicas de descoberta (`/descobrir/...`). Duas
 * cópias divergiriam e a URL geradora deixaria de bater com a URL lida.
 */

/** "Corrida Asa Norte à noite" → "corrida-asa-norte-a-noite". */
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}
