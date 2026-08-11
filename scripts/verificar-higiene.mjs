#!/usr/bin/env node
/**
 * GUARDRAIL 2 — a higiene do design system não pode REGREDIR.
 *
 * A regra é uma só: **cada número aqui só anda pra baixo.** O script conta,
 * compara com `scripts/baseline-higiene.json` e sai 1 se algum contador
 * subiu. Quando um lote derruba um número, roda-se
 * `npm run verificar:higiene -- --atualizar` e o baseline novo vai NO MESMO
 * PR — é isso que trava a melhoria e impede que a próxima tela regrida por
 * baixo.
 *
 * POR QUE NÃO SÓ COR (o guardrail clássico do playbook): a MUNAY já nasceu
 * com a cor sob controle — `lib/brand.ts` é fonte única desde o dia 1, e a
 * medição de 11/08 achou ZERO paleta Tailwind crua e ZERO `dark:` manual.
 * A dívida real daqui é outra: 65 `<button>` crus e 124 superfícies-card à
 * mão em 43 rotas. Um guardrail só de cor ficaria verde pra sempre sem
 * medir a dívida que existe. Então ele conta as duas coisas.
 *
 * Os contadores de cor FICAM mesmo em zero, de propósito: eles não estão
 * aqui pra baixar, estão aqui pra não deixar subir.
 *
 *   node scripts/verificar-higiene.mjs              → compara com o baseline
 *   node scripts/verificar-higiene.mjs --atualizar  → grava o baseline novo
 *   node scripts/verificar-higiene.mjs --detalhe    → lista arquivo:linha
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = path.join(RAIZ, "scripts", "baseline-higiene.json");
const args = new Set(process.argv.slice(2));
const atualizar = args.has("--atualizar");
const detalhe = args.has("--detalhe");

/**
 * Fora da conta:
 * - `components/ui/**` é O design system. Ele PODE ter `<button>` cru — é o
 *   único lugar onde o elemento nativo deve aparecer.
 * - `components/registry/**` é a quarentena da CLI: código de fora, ainda
 *   não traduzido, nunca commitado. Contar ele seria contar dívida alheia.
 * - `lib/brand.ts`, `lib/cor.ts`, `lib/tema.ts` são a fonte dos hex. É o
 *   trabalho deles ter hex.
 */
const ISENTOS = [
  /^components\/ui\//,
  /^components\/registry\//,
  /^lib\/(brand|cor|tema)\.ts$/,
];

const CONTADORES = [
  {
    id: "cor-hex",
    titulo: "hex hardcoded (regra 4 do CLAUDE.md: cor só via token)",
    // `\b` no fim evita o falso positivo clássico: href="#cadastro" casa
    // com "#cad" se a borda não for checada.
    re: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g,
    ext: /\.tsx?$/,
  },
  {
    id: "cor-paleta-crua",
    titulo: "paleta Tailwind crua (bg-blue-100 e parentes)",
    re: /\b(?:bg|text|border|ring|from|via|to|decoration|divide|outline|shadow|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g,
    ext: /\.tsx?$/,
    // `lime` é token DA MARCA na MUNAY (`bg-lime`, sem número). Só entra na
    // conta com número — `bg-lime-400` seria a paleta do Tailwind.
  },
  {
    id: "dark-manual",
    titulo: "`dark:` escrito à mão (o tema sai do token, não da classe)",
    re: /\bdark:/g,
    ext: /\.tsx?$/,
  },
  {
    id: "controle-cru",
    titulo: "controle nativo fora do DS (<button>, <input>, <select>, <textarea>)",
    // `type="hidden"` fica de fora: input escondido não tem visual nenhum,
    // trocar por <Input> só adicionaria classe morta.
    //
    // O `[\s>]` é lookahead de propósito. A varredura é no TEXTO INTEIRO, não
    // linha a linha, porque JSX quebra a tag: `<button\n  type="submit"` é o
    // caso comum, e um regex por linha perde todos eles — foi assim que a
    // primeira versão deste script contou 19 onde havia 65.
    re: /<(?:button|select|textarea)(?=[\s/>])|<input(?![^>]*type="hidden")(?=[\s/>])/g,
    ext: /\.tsx$/,
  },
  {
    id: "superficie-a-mao",
    titulo: "superfície-card montada à mão (deveria ser <Card>)",
    // Um card à mão é sempre a mesma receita: raio grande + (borda ou
    // fundo). Exigir os dois evita contar pílula, avatar e badge.
    re: /rounded-(?:card|3xl|2xl|xl)\b(?=[^"'`]*\b(?:border|bg-)[a-z])/g,
    ext: /\.tsx$/,
  },
];

function arquivos(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      arquivos(p, acc);
    } else {
      acc.push(p);
    }
  }
  return acc;
}

const alvos = ["app", "components", "lib"]
  .map((d) => path.join(RAIZ, d))
  .filter((d) => fs.existsSync(d))
  .flatMap((d) => arquivos(d))
  .map((p) => ({ abs: p, rel: path.relative(RAIZ, p).replace(/\\/g, "/") }))
  .filter(({ rel }) => !ISENTOS.some((re) => re.test(rel)));

const resultado = {};
const ocorrencias = {};

for (const c of CONTADORES) {
  let total = 0;
  const lista = [];
  for (const { abs, rel } of alvos) {
    if (!c.ext.test(rel)) continue;
    // Varredura no texto INTEIRO (não linha a linha): tag JSX quebrada em
    // várias linhas é a regra, não a exceção. A linha vem do índice.
    const texto = fs.readFileSync(abs, "utf8");
    const quebras = [];
    for (let i = 0; i < texto.length; i++) if (texto[i] === "\n") quebras.push(i);
    const linhaDe = (idx) => quebras.findIndex((q) => q >= idx) + 1 || quebras.length + 1;

    c.re.lastIndex = 0;
    let m;
    while ((m = c.re.exec(texto)) !== null) {
      total++;
      lista.push(`${rel}:${linhaDe(m.index)}  ${m[0].replace(/\s+/g, " ").trim()}`);
      if (m.index === c.re.lastIndex) c.re.lastIndex++; // regex de largura zero
    }
  }
  resultado[c.id] = total;
  ocorrencias[c.id] = lista;
}

// Métrica de progresso (informativa, não trava): quantos arquivos de tela já
// importam o DS. É o número que a migração faz SUBIR — o oposto dos outros.
const telas = alvos.filter(({ rel }) => /\.tsx$/.test(rel));
const adotam = telas.filter(({ abs }) =>
  /from "@\/components\/ui\//.test(fs.readFileSync(abs, "utf8")),
);
const adocao = { arquivos: adotam.length, de: telas.length };

if (atualizar) {
  const novo = { atualizado: new Date().toISOString().slice(0, 10), contadores: resultado, adocao };
  fs.writeFileSync(BASELINE, JSON.stringify(novo, null, 2) + "\n");
  console.log(`✓ baseline gravado em scripts/baseline-higiene.json:`);
  for (const c of CONTADORES) console.log(`    ${c.id.padEnd(20)} ${resultado[c.id]}`);
  console.log(`    ${"adoção do DS".padEnd(20)} ${adocao.arquivos}/${adocao.de} arquivos`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error(
    "✗ scripts/baseline-higiene.json não existe. Rode `npm run verificar:higiene -- --atualizar` uma vez.",
  );
  process.exit(1);
}

const base = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
const subiram = [];
const cairam = [];

for (const c of CONTADORES) {
  const antes = base.contadores[c.id];
  const agora = resultado[c.id];
  if (antes === undefined) {
    subiram.push({ ...c, antes: "(novo)", agora });
    continue;
  }
  if (agora > antes) subiram.push({ ...c, antes, agora });
  else if (agora < antes) cairam.push({ ...c, antes, agora });
}

console.log(`higiene do DS — baseline de ${base.atualizado}\n`);
for (const c of CONTADORES) {
  const antes = base.contadores[c.id];
  const agora = resultado[c.id];
  const seta = agora === antes ? "=" : agora < antes ? "↓" : "↑";
  console.log(`  ${seta} ${c.id.padEnd(20)} ${String(agora).padStart(4)}  (baseline ${antes})`);
}
console.log(
  `    ${"adoção do DS".padEnd(20)} ${String(adocao.arquivos).padStart(4)}/${adocao.de} arquivos importam components/ui\n`,
);

if (detalhe) {
  for (const c of CONTADORES) {
    if (!ocorrencias[c.id].length) continue;
    console.log(`── ${c.id} — ${c.titulo}`);
    for (const o of ocorrencias[c.id]) console.log(`   ${o}`);
    console.log();
  }
}

if (subiram.length) {
  console.error("✗ a higiene REGREDIU. Estes contadores só andam pra baixo:\n");
  for (const c of subiram) {
    console.error(`  ${c.id}: ${c.antes} → ${c.agora}`);
    console.error(`     ${c.titulo}`);
  }
  console.error(
    "\nConserte no seu lote, ou — se a subida for deliberada e justificada —" +
      " explique no PR e rode `npm run verificar:higiene -- --atualizar`.\n" +
      "Rode com `-- --detalhe` pra ver arquivo:linha.\n",
  );
  process.exit(1);
}

if (cairam.length) {
  console.log("✓ higiene melhorou. Trave o ganho: `npm run verificar:higiene -- --atualizar`");
  console.log("  e commite o baseline novo NO MESMO PR.\n");
  // Não é erro — mas o baseline desatualizado deixa a porta aberta pra
  // regressão silenciosa até o teto antigo. Avisa e passa.
}

console.log("✓ higiene: nenhum contador subiu.");
process.exit(0);
