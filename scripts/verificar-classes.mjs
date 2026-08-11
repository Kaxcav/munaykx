#!/usr/bin/env node
/**
 * GUARDRAIL 1 — classes do Tailwind v4 que FALHAM EM SILÊNCIO neste projeto.
 *
 * O registry do shadcn/ui hoje é escrito para Tailwind v4. A MUNAY está na
 * 3.4 (`package.json`), e essa é uma diferença que NÃO quebra o build: o
 * Tailwind 3.4 simplesmente não conhece `shadow-xs`, não gera regra nenhuma,
 * e o componente renderiza sem sombra. Ninguém vê erro. A peça só fica
 * "meio errada" pra sempre.
 *
 * Silêncio é o perigo — por isso este script existe e por isso ele RECUSA
 * (sai 1) em vez de avisar. Todo componente colado do registry passa por
 * aqui antes de virar `components/ui/*`.
 *
 * Cada padrão abaixo é uma substituição real do checklist de port:
 *   outline-hidden → outline-none · shadow-xs → shadow-sm
 *   rounded-xs     → rounded-sm   · ring-3    → ring-[3px]
 *   w-(--x)        → w-[var(--x)] · --spacing(N) → rem literal
 *   size-8!        → !size-8      · **:algo   → [&_*]:algo
 *   has-focus:     → has-[:focus]:
 *   oklch(/@theme → formato de token de outro projeto; a MUNAY é HSL.
 *
 *   node scripts/verificar-classes.mjs   → sai 1 se achar qualquer uma
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASTAS = ["app", "components", "lib"];

/** Cada regra diz o que achou e o que fazer — mensagem de erro que ensina. */
const REGRAS = [
  {
    re: /\boutline-hidden\b/g,
    conserto: "outline-none (v3 não tem `outline-hidden`)",
  },
  { re: /\bshadow-xs\b/g, conserto: "shadow-sm (v3 não tem `shadow-xs`)" },
  { re: /\brounded-xs\b/g, conserto: "rounded-sm (v3 não tem `rounded-xs`)" },
  { re: /\bring-3\b/g, conserto: "ring-[3px] (v3 só tem ring-0/1/2/4/8)" },
  {
    re: /\b(w|h|size|p[xytblr]?|m[xytblr]?|gap)-\(--[a-z0-9-]+\)/g,
    conserto: "a forma v3: `w-[var(--x)]` em vez de `w-(--x)`",
  },
  {
    re: /--spacing\(\s*[\d.]+\s*\)/g,
    conserto: "o valor em rem literal (a função `--spacing()` é v4)",
  },
  {
    re: /(^|["'\s])\*\*:/g,
    conserto: "o seletor arbitrário v3: `[&_*]:algo` em vez de `**:algo`",
  },
  {
    re: /\bhas-focus:/g,
    conserto: "has-[:focus]: (a forma curta é v4)",
  },
  {
    re: /\b[a-z-]+-[a-z0-9[\]/.-]+!(?=["'\s}])/g,
    conserto: "o important na frente: `!size-8` em vez de `size-8!`",
  },
  {
    re: /\boklch\(/g,
    conserto:
      "HSL — o token da MUNAY é `H S% L%` em `app/globals.css`, gerado de `lib/brand.ts`",
  },
  {
    re: /@theme\b/g,
    conserto:
      "a config da MUNAY: cor nova nasce em `lib/brand.ts` e sai por `tailwind.config.ts`",
  },
];

/** Anda a árvore sem depender de glob (o projeto não tem a dep). */
function arquivos(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      arquivos(p, acc);
    } else if (/\.(tsx?|css)$/.test(e.name)) {
      acc.push(p);
    }
  }
  return acc;
}

const achados = [];

for (const pasta of PASTAS) {
  const abs = path.join(RAIZ, pasta);
  if (!fs.existsSync(abs)) continue;
  for (const arq of arquivos(abs)) {
    const texto = fs.readFileSync(arq, "utf8");
    const linhas = texto.split(/\r?\n/);
    for (const { re, conserto } of REGRAS) {
      linhas.forEach((linha, i) => {
        re.lastIndex = 0;
        const m = re.exec(linha);
        if (m) {
          achados.push({
            arq: path.relative(RAIZ, arq).replace(/\\/g, "/"),
            linha: i + 1,
            trecho: m[0].trim(),
            conserto,
          });
        }
      });
    }
  }
}

if (achados.length === 0) {
  console.log("✓ classes: nenhuma classe de Tailwind v4 no código (v3.4 é a nossa).");
  process.exit(0);
}

console.error(
  `\n✗ ${achados.length} classe(s) de Tailwind v4 — elas NÃO quebram o build, só` +
    ` renderizam errado em silêncio:\n`,
);
for (const a of achados) {
  console.error(`  ${a.arq}:${a.linha}`);
  console.error(`    achou: ${a.trecho}`);
  console.error(`    use:   ${a.conserto}\n`);
}
console.error(
  "Isto é o checklist de port do shadcn (passo 2). Veja docs/QUADRO-SHADCN-MUNAY.md.\n",
);
process.exit(1);
