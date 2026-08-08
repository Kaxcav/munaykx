import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token ASSINADO (HMAC-SHA256) para ações sem login — hoje, o descadastro de
 * aviso (STORY-008). NÃO é guardado: a assinatura É a autorização, e só quem
 * recebeu o e-mail tem o token válido. Anti-forja por comparação em tempo
 * constante — adulterar o payload invalida a assinatura.
 *
 * O segredo é o `BETTER_AUTH_SECRET` (já existe em produção). Sem segredo
 * (dev/CI, onde a suíte roda com ele vazio), a assinatura é determinística com
 * chave vazia: o que os testes exercem é válido-vs-adulterado, não sigilo.
 */
function segredo(): string {
  return process.env.BETTER_AUTH_SECRET ?? "";
}

function assinaturaDe(payload: string): string {
  return createHmac("sha256", segredo()).update(payload).digest("base64url");
}

/** Gera "<payloadB64url>.<assinaturaB64url>" com os dados dados. */
export function assinar(dados: Record<string, string>): string {
  const payload = Buffer.from(JSON.stringify(dados), "utf8").toString("base64url");
  return `${payload}.${assinaturaDe(payload)}`;
}

/** Devolve os dados se a assinatura confere; `null` se malformado ou adulterado. */
export function verificar(token: string): Record<string, string> | null {
  const partes = token.split(".");
  if (partes.length !== 2) return null;
  const [payload, sig] = partes;

  const esperada = assinaturaDe(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const obj: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (obj === null || typeof obj !== "object") return null;
    return obj as Record<string, string>;
  } catch {
    return null;
  }
}
