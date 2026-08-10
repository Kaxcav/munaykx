import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */

/**
 * Headers de segurança HTTP.
 *
 * REGRA DE OURO: um header não pode derrubar o site. Por isso a divisão abaixo
 * é deliberada — os cinco primeiros são seguros e vão ENFORCING; o CSP, que é o
 * único capaz de quebrar a página (o Next injeta script/estilo inline, e o
 * Umami vem de um host em env), vai em **Report-Only**: ele REPORTA violação e
 * **não bloqueia nada**. É impossível o CSP abaixo apagar o mapa, o OG, o
 * login ou o analytics — no máximo aparece um aviso no console.
 *
 * Caminho para tornar o CSP enforcing depois (recomendação, NÃO feito aqui):
 *   1. Observar o console/relatórios com o Report-Only no ar por um tempo.
 *   2. Trocar `'unsafe-inline'` em script-src por nonce por request (middleware
 *      que injeta o nonce no header e o Next propaga aos scripts do framework).
 *   3. Só então trocar o cabeçalho de `-Report-Only` para o enforcing.
 * Sem o passo 2, enforcing exigiria `'unsafe-inline'`, que esvazia o CSP — não
 * vale o risco agora.
 */

/** Origem (esquema+host) de uma URL, ou null se ausente/inválida. */
function origem(url) {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

// O Umami é self-host; o script e os beacons saem para essa origem. Vem de env
// (NEXT_PUBLIC_*, embutida no build). Sem ela, o CSP simplesmente não a lista —
// e como é Report-Only, no pior caso reporta, nunca bloqueia.
const umami = origem(process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL);

// Google Fonts: a folha de estilo vem de fonts.googleapis.com e os arquivos de
// fonte de fonts.gstatic.com (ver app/layout.tsx).
const FONTS_CSS = "https://fonts.googleapis.com";
const FONTS_FILES = "https://fonts.gstatic.com";

// Mapa real (Fase 1): quando o dono ativa `MAPA_TILES_URL`, o NAVEGADOR busca o
// .pmtiles (por HTTP range) e os glyphs do Protomaps — ambos via fetch, então
// entram em connect-src. Sem a env, `mapaTiles` é null e não é listado. Como o
// CSP é Report-Only, no pior caso reporta; nunca bloqueia o mapa.
const mapaTiles = origem(process.env.MAPA_TILES_URL);
const PROTOMAPS_GLYPHS = "https://protomaps.github.io";

const csp = [
  `default-src 'self'`,
  // 'unsafe-inline' é necessário porque o Next injeta bootstrap/flight inline.
  // Como isto é Report-Only, ele descreve a realidade para observação — não é a
  // política final (ver recomendação no topo).
  `script-src 'self' 'unsafe-inline'${umami ? ` ${umami}` : ""}`,
  `style-src 'self' 'unsafe-inline' ${FONTS_CSS}`,
  `font-src 'self' ${FONTS_FILES} data:`,
  // OG images e uploads são same-origin; data:/blob: cobrem inline e canvas.
  `img-src 'self' data: blob:`,
  // ⚠️ QUANDO O CSP VIRAR ENFORCING (hoje é Report-Only, não bloqueia): incluir
  // aqui a origem de ingestão do Sentry (ex.: https://<id>.ingest.sentry.io) pra
  // o cliente conseguir enviar erro. Enquanto for Report-Only e sem DSN, não há
  // envio nenhum, então nada a adicionar agora.
  // + tiles do mapa (pmtiles por range) e glyphs do Protomaps, quando ativo.
  `connect-src 'self'${umami ? ` ${umami}` : ""}${mapaTiles ? ` ${mapaTiles} ${PROTOMAPS_GLYPHS}` : ""}`,
  `frame-ancestors 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join("; ");

const securityHeaders = [
  // Só HTTPS por 2 anos. SEM `preload` de propósito: preload entra em listas de
  // navegador difíceis de reverter — postura conservadora primeiro.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Navegador não "adivinha" o tipo do conteúdo (bloqueia MIME sniffing).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Ninguém embute o site em iframe de outra origem (anti-clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Não vaza a URL completa para outros sites; mantém origem em navegação same-site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Trava capacidades que o MUNAY não usa (confirmado no código: sem geolocalização,
  // sem câmera, sem microfone) — reduz superfície e reforça a postura de privacidade.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // CSP em Report-Only: reporta, não bloqueia. Ver o cabeçalho deste arquivo.
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Todas as rotas — inclusive páginas, API e as rotas de OG image.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

/**
 * Opções de BUILD do Sentry (não é o `Sentry.init` — isso mora nos
 * `sentry.*.config.ts`). `withSentryConfig` COMPÕE com o `nextConfig` acima:
 * preserva os headers/CSP do #32 e só acrescenta a instrumentação.
 *
 * Nada aqui exige rede ou credencial pra buildar:
 *  - `sourcemaps.disable` liga o upload SÓ quando há `SENTRY_AUTH_TOKEN`. Sem
 *    token, o build NÃO tenta subir source map e NÃO quebra.
 *  - `org`/`project` vêm de env (ausentes = sem upload).
 *  - `silent` fora do CI pra não poluir o log local.
 * Ou seja: sem env nenhuma de Sentry, o build é idêntico ao de hoje.
 */
const sentryBuildOptions = {
  silent: !process.env.CI,
  disableLogger: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
};

export default withSentryConfig(nextConfig, sentryBuildOptions);
