import type { Config } from "tailwindcss";
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
        areia: brand.areia,
        petroleo: {
          DEFAULT: brand.petroleo,
          soft: brand.petroleoSoft,
        },
        lime: brand.lime,
        coral: brand.coral,
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "1.5rem",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pin-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(1.35)" },
        },
      },
      animation: {
        ticker: "ticker 28s linear infinite",
        "pin-pulse": "pin-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
