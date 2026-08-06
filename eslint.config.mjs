import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

/**
 * ESLint da MUNAY — flat config (ESLint 9).
 *
 * Por que assim, e não `next lint`: o `next lint` está deprecado e SOME no
 * Next 16. Pior: enquanto não existia config, ele abria um menu interativo
 * e o `npm run lint` simplesmente travava esperando resposta — ou seja, o
 * projeto passou semanas achando que tinha lint quando não tinha nenhum.
 * Aqui é a CLI do ESLint direto, que roda igual no terminal e no CI.
 *
 * O `eslint-config-next` 15.5 ainda só publica config no formato antigo
 * (eslintrc), então o `FlatCompat` traduz. Quando a Vercel publicar o flat
 * config nativo, isto vira dois imports e o compat sai.
 */
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "prisma/migrations/**",
      // Andaimes de teste rodam fora do app (node puro, sem alias @/).
      "scripts/testes/**",
      // TUDO que começa com ponto: .aiox-core, .claude, .github, .cursor…
      // São arquivos de ferramenta, não código do produto — e o .aiox-core
      // é read-only por regra do projeto. O flat config do ESLint 9 deixou
      // de pular pasta oculta sozinho (o eslintrc pulava), então sem esta
      // linha o lint acusa 2.400 erros em código que não é nosso.
      "**/.*",
    ],
  },

  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    rules: {
      // Variável ignorada de propósito começa com _ — o padrão do projeto
      // em destructuring de resultado que não interessa.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // `any` é erro, não aviso: TypeScript strict é regra do projeto e
      // aviso que ninguém lê não protege nada.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },

  {
    // O seed e as libs de servidor logam de propósito — console ali é feature.
    files: ["prisma/seed.ts", "lib/**/*.ts", "app/api/**/*.ts"],
    rules: { "no-console": "off" },
  },

  {
    files: ["app/layout.tsx"],
    rules: {
      // A regra manda mover a fonte pro `pages/_document.js` — arquivo que
      // não existe em App Router, ou seja, ela aponta pra um conserto
      // impossível. A decisão real (fonte por <link> pra o build não
      // depender de rede, `next/font` depois) está registrada no CLAUDE.md.
      // Aviso que ninguém pode resolver só ensina a ignorar aviso.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
