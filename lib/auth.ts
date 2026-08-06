import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins/magic-link";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";
import { sendEmail, layoutEmail } from "@/lib/email";
import { reivindicarRsvps } from "@/lib/claim";
import { SITE_URL } from "@/lib/site";

/**
 * Auth da MUNAY (STORY-007) — magic link, sem senha.
 *
 * Decisões fechadas na spec, com racional (não mexer sem ler docs/stories/
 * STORY-007-auth-magic-link.md):
 *
 * 1. Better Auth, não Auth.js: a Auth.js foi absorvida pela Better Auth em
 *    09/2025 e está em modo security-patch; a v5 segue em beta.
 * 2. VERSÃO PINADA EXATA no package.json (sem `^`): a 1.6.20 quebrou o
 *    adapter Prisma. Subir é ato deliberado, nunca efeito colateral.
 * 3. SÓ dois plugins: magicLink e nextCookies. O lote de vulnerabilidades de
 *    06/2026 atingiu SSO/OIDC/MCP — plugin que não se instala não te expõe.
 * 4. `nextCookies()` é SEMPRE O ÚLTIMO do array. Fora de ordem, server
 *    actions falham EM SILÊNCIO ao gravar cookie.
 * 5. Sessão em banco (não JWT): revogar é deletar a linha. `cookieCache`
 *    evita bater no banco a cada request.
 */

const MINUTOS = 60;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: SITE_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  // Sem senha em lugar nenhum: a única porta é o magic link.
  emailAndPassword: { enabled: false },

  user: { modelName: "user" },

  session: {
    expiresIn: 30 * 24 * 60 * MINUTOS, // 30 dias
    updateAge: 24 * 60 * MINUTOS, // renova no máximo 1×/dia
    cookieCache: { enabled: true, maxAge: 5 * MINUTOS },
  },

  advanced: {
    // Cookie de sessão só viaja em HTTPS fora do dev.
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  databaseHooks: {
    user: {
      create: {
        // Conta nova: puxa o histórico de inscrições feitas só com e-mail.
        after: async (user) => {
          await reivindicarRsvps(user.id, user.email);
        },
      },
    },
    session: {
      create: {
        // Cada login reconcilia de novo: cobre inscrição anônima feita
        // DEPOIS do cadastro (a pessoa não estava logada naquele momento).
        after: async (session) => {
          const dono = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { email: true },
          });
          if (dono) await reivindicarRsvps(session.userId, dono.email);
        },
      },
    },
  },

  plugins: [
    magicLink({
      // 20 minutos: curto o bastante pra ser seguro, longo o bastante pra
      // sobreviver a fila de entrega de e-mail corporativo.
      expiresIn: 20 * MINUTOS,
      // Token guardado com hash: vazamento de banco não vira login.
      storeToken: "hashed",
      async sendMagicLink({ email, url }) {
        // O `url` do plugin consome o token direto. Nós NÃO usamos ele no
        // e-mail: scanners de segurança (Outlook SafeLinks, gateways .gov.br)
        // fazem GET preventivo e queimariam o token antes da pessoa clicar.
        // Mandamos pra uma página intermediária que só consome no POST.
        const destino = new URL("/entrar/confirmar", SITE_URL);
        destino.searchParams.set("u", url);

        const { html, text } = layoutEmail({
          titulo: "Seu acesso à MUNAY",
          corpo:
            "Clique no botão abaixo pra entrar. O link vale por 20 minutos e só funciona uma vez.",
          botao: { rotulo: "Entrar na MUNAY", url: destino.toString() },
          rodape:
            "Se você não pediu este acesso, pode ignorar este e-mail — nada acontece sem alguém clicar.",
        });

        await sendEmail({
          to: email,
          subject: "Seu acesso à MUNAY",
          html,
          text,
        });
      },
    }),
    // SEMPRE POR ÚLTIMO — ver decisão 4 acima.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
