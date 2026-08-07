import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import { brand } from "./lib/brand";

/**
 * TOKENS DE MARCA — MUNAY ("Vitalidade Serena")
 * Fonte: ELO_Identidade_Visual.docx (paleta oficial). Os hex vivem em
 * lib/brand.ts (fonte única — as OG images também leem de lá). Se o PO
 * trocar a paleta (há uma alternativa petróleo/sage/coral em
 * ELO_Arquitetura_Frontend.docx), mude SOMENTE lib/brand.ts — nenhum
 * componente usa cor hardcoded.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
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
        lime: brand.lime,
        coral: brand.coral,

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
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
