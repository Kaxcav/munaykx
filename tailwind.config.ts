import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import { brand } from "./lib/brand";
import { misturar } from "./lib/cor";

/**
 * TOKENS DE MARCA — MUNAY ("Vitalidade Serena")
 * Fonte: ELO_Identidade_Visual.docx (paleta oficial). Os hex vivem em
 * lib/brand.ts (fonte única — as OG images também leem de lá). Se o PO
 * trocar a paleta (há uma alternativa petróleo/sage/coral em
 * ELO_Arquitetura_Frontend.docx), mude SOMENTE lib/brand.ts — nenhum
 * componente usa cor hardcoded.
 */

/**
 * ACENTOS DE CATEGORIA (briefing 07/08/2026, item 3: "cada categoria pode
 * ganhar uma cor de destaque sutil, criando reconhecimento visual rápido").
 *
 * São SEIS acentos derivados por mistura das cores da marca — nenhum hex
 * novo, nenhuma cor escolhida a olho. É isso que mantém a regra 4 de pé
 * mesmo com a paleta ampliada: se o PO trocar `brand.ts`, os seis andam
 * junto.
 *
 * Cada acento tem três tons com trabalho definido:
 * - `DEFAULT` — o traço/ponto de identificação. Aparece em pouca área.
 * - `soft` — fundo do card sobre areia. Tingido o suficiente pra
 *   diferenciar a categoria de relance, claro o suficiente pra manter
 *   petróleo legível por cima (é a regra "sutil" do briefing). A proporção
 *   subiu de 0.17 pra 0.28 depois de olhar a home renderizada: em 0.17 os
 *   seis cards ficavam quase indistinguíveis lado a lado — ou seja, a
 *   reclamação do PO ("visualmente neutros demais") continuava de pé. O teto
 *   é o contraste: em 0.28 o pior par ainda dá 4.62:1, acima do AA.
 * - `ink` — a versão escurecida, pra texto do próprio acento sobre `soft`.
 *   O acento puro sobre `soft` não tem contraste de leitura; escurecer
 *   contra o petróleo resolve sem sair da paleta. A proporção 0.65 não é
 *   gosto: em 0.55 o acento 4 (verde vivo) dava 3.98:1 sobre o próprio
 *   `soft` e REPROVAVA no WCAG AA de texto normal. Medido, não estimado —
 *   o pior dos seis agora dá 4.91:1.
 *
 * Por que NUMERADOS e não nomeados por modalidade: a taxonomia de esporte é
 * produto e muda (o briefing já prevê Cursos). Se o token se chamasse
 * `corrida`, trocar a categoria exigiria mexer no design system. O de-para
 * modalidade → acento mora em `lib/modalidades.ts`, onde é dado, não cor.
 */
const ACENTOS_BASE = [
  brand.salvia, // 1 · verde sálvia — o acento de marca
  brand.petroleoSoft, // 2 · petróleo claro
  brand.coral, // 3 · coral
  misturar(brand.salvia, brand.lime, 0.5), // 4 · verde vivo (sálvia puxado ao lime)
  misturar(brand.coral, brand.petroleo, 0.42), // 5 · coral queimado
  misturar(brand.petroleoSoft, brand.lime, 0.38), // 6 · petróleo esverdeado
] as const;

const acento = Object.fromEntries(
  ACENTOS_BASE.map((cor, i) => [
    i + 1,
    {
      DEFAULT: cor,
      soft: misturar(brand.areia, cor, 0.28),
      ink: misturar(cor, brand.petroleo, 0.65),
    },
  ]),
);

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  // Os acentos de categoria são escolhidos em runtime (`lib/modalidades.ts`
  // devolve o índice), então o scanner do Tailwind não vê as classes no
  // código-fonte. Sem esta safelist, o card de categoria sairia sem cor em
  // produção e COM cor em dev — o pior tipo de bug de build.
  safelist: [
    {
      pattern: /(bg|text|border|ring|decoration)-acento-[1-6](-(soft|ink))?/,
    },
  ],
  theme: {
    extend: {
      colors: {
        // Tokens da MARCA — usados no site público, direto do lib/brand.ts.
        areia: brand.areia,
        petroleo: {
          DEFAULT: brand.petroleo,
          soft: brand.petroleoSoft,
        },
        // Verde sálvia — acento de PRESENÇA (pode cobrir área). Ver a nota
        // em lib/brand.ts sobre a divisão de trabalho com o lime.
        salvia: {
          DEFAULT: brand.salvia,
          soft: misturar(brand.areia, brand.salvia, 0.18),
          deep: misturar(brand.salvia, brand.petroleo, 0.55),
        },
        lime: brand.lime,
        coral: brand.coral,
        acento,

        // Tokens do shadcn/ui — apontam pras variáveis CSS do globals.css,
        // que por sua vez são CALCULADAS a partir do mesmo lib/brand.ts
        // (ver lib/tema.ts). Os dois conjuntos convivem de propósito: o
        // público continua escrevendo `bg-areia`, o interno ganha
        // `bg-background`, e nenhum dos dois tem hex solto.
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        // `card` é da marca (1.5rem, bem redondo). Os do shadcn derivam de
        // --radius, que é menor: controle de admin com 1.5rem de raio vira
        // pastilha e some a leitura de "isto é um campo".
        card: "1.5rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "pin-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(1.35)" },
        },
        // Deriva das composições do mosaico: o "movimento" que o briefing
        // pede (item 2) sem vídeo, sem JS e sem peso. Lento de propósito —
        // rápido demais vira banner de anos 2000.
        deriva: {
          "0%, 100%": { transform: "scale(1.06) translate3d(0, 0, 0)" },
          "50%": { transform: "scale(1.12) translate3d(-1.5%, -1.5%, 0)" },
        },
        // Exigidos pelos componentes do shadcn que abrem/fecham.
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "pin-pulse": "pin-pulse 2.4s ease-in-out infinite",
        deriva: "deriva 18s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
