import { headers } from "next/headers";
import { auth, authDisponivel, type Session } from "@/lib/auth";

/**
 * Sessão atual — fonte única de "quem está logado" no servidor.
 *
 * POR QUE ISTO EXISTE (achado em 06/08/2026, rodando a suíte numa máquina
 * sem `BETTER_AUTH_SECRET`): três páginas chamavam `auth.api.getSession()`
 * direto. Sem o segredo, a Better Auth **lança** nessa chamada — e como uma
 * delas é o `<Header />`, que aparece em toda página, o site INTEIRO passava
 * a responder 500. Não só o login: a home, as comunidades, os eventos.
 *
 * Isso contradizia a decisão que o próprio `lib/auth.ts` documenta ("sem
 * segredo, a auth simplesmente não atende; o resto do site continua de pé")
 * — a intenção estava certa, faltava o guard no caminho de leitura.
 *
 * Em produção o sintoma fica escondido porque a variável está lá. É esse o
 * problema: uma variável esquecida num deploy novo não degradaria o login,
 * derrubaria o site — e a Etapa 2 do edital tem "site no ar" como evidência.
 *
 * Contrato: **nunca lança**. Auth desligada = ninguém logado, e a UI cai no
 * estado deslogado, que já existe e já é o caminho normal de quem nunca fez
 * conta (inscrição em evento não exige conta e nunca vai exigir).
 */
export async function sessaoAtual(): Promise<Session | null> {
  if (!authDisponivel()) return null;
  return auth.api.getSession({ headers: await headers() });
}
