import { headers } from "next/headers";
import { notFound } from "next/navigation";

/**
 * Autorização do /admin — compartilhada entre o middleware (Edge) e as
 * páginas/actions (Node). STORY-007, tarefa 7.
 *
 * POR QUE EXISTE: até aqui a proteção do admin vivia SÓ no middleware. Um
 * bypass de middleware — classe de bug que já apareceu mais de uma vez no
 * Next (CVE-2025-29927 entre elas) — deixaria a tabela de leads (nome,
 * e-mail, WhatsApp: dado pessoal, LGPD) aberta. Middleware deixa de ser
 * ponto único de falha: quem serve a página confere de novo.
 *
 * Sem `node:crypto` de propósito: o mesmo arquivo é importado pelo
 * middleware, que roda no Edge.
 */

/** Comparação em tempo constante — não vaza tamanho/prefixo da senha por timing. */
export function igualSeguro(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  let diff = bufA.length ^ bufB.length;
  const max = Math.max(bufA.length, bufB.length);
  for (let i = 0; i < max; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}

export type ResultadoAdmin = "ok" | "nao-configurado" | "nao-autorizado";

/** Valida um header Authorization: Basic contra as envs. Puro — sem I/O. */
export function conferirBasicAuth(authorization: string | null): ResultadoAdmin {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password) return "nao-configurado";
  if (!authorization?.startsWith("Basic ")) return "nao-autorizado";

  try {
    const decoded = atob(authorization.slice(6));
    const sep = decoded.indexOf(":");
    if (sep < 0) return "nao-autorizado";
    const u = decoded.slice(0, sep);
    const p = decoded.slice(sep + 1);
    return igualSeguro(u, user) && igualSeguro(p, password)
      ? "ok"
      : "nao-autorizado";
  } catch {
    return "nao-autorizado";
  }
}

/**
 * Segunda barreira, chamada por quem realmente serve o /admin (layout e
 * server actions). Sem credencial válida, a rota simplesmente deixa de
 * existir: 404 não confirma nem desmente que o painel está aí.
 */
export async function assertAdmin(): Promise<void> {
  const h = await headers();
  if (conferirBasicAuth(h.get("authorization")) !== "ok") notFound();
}
