#!/usr/bin/env node
/**
 * RECADO — correio entre agentes que trabalham na mesma máquina.
 *
 * O problema: sessões de agente não se enxergam. Nenhuma fica escutando, e
 * nenhuma sabe que a outra existe. Em 07/08 isso custou um `node_modules`
 * esvaziado e duas mãos no mesmo `prisma/schema.prisma`.
 *
 * A solução NÃO é loop automático — não existe. É caixa de entrada em disco:
 * quem tem algo a dizer escreve, e quem chega lê a sua ANTES de codar. O
 * humano deixa de ser o carteiro (não copia e cola nada) e vira só o relógio
 * (chama cada sessão quando quiser que ela ande).
 *
 * As caixas moram em C:\munay-operacao\caixa\, FORA de qualquer worktree —
 * dentro do git cada worktree teria a sua cópia, que é o mesmo que nenhuma.
 *
 *   npm run recado                    → lê a MINHA caixa e arquiva
 *   npm run recado -- ver             → lê sem arquivar
 *   npm run recado -- B "mensagem"    → deixa recado pro agente B
 *   npm run recado -- B --arquivo x.md → manda o conteúdo de um arquivo
 */

import fs from "node:fs";
import path from "node:path";

const BASE = process.env.MUNAY_OPERACAO ?? "C:\\munay-operacao";
const CAIXA = path.join(BASE, "caixa");
const HISTORICO = path.join(CAIXA, "historico.md");
const EU = (process.env.AGENTE ?? "").replace(/^cowork-/i, "").toUpperCase() || "?";

const arg = process.argv.slice(2);
const caixaDe = (quem) => path.join(CAIXA, `para-${quem.toUpperCase()}.md`);

fs.mkdirSync(CAIXA, { recursive: true });

const azul = (s) => `\x1b[36m${s}\x1b[0m`;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const amarelo = (s) => `\x1b[33m${s}\x1b[0m`;

// ─── enviar ─────────────────────────────────────────────────────────────────
if (arg[0] && /^[A-Za-z]$/.test(arg[0])) {
  const destino = arg[0].toUpperCase();
  if (destino === EU) {
    console.error(`\n  Você é o agente ${EU}. Recado pra si mesmo é anotação — use o QUADRO.\n`);
    process.exit(1);
  }

  let corpo;
  const iArquivo = arg.indexOf("--arquivo");
  if (iArquivo > -1) {
    const f = arg[iArquivo + 1];
    if (!f || !fs.existsSync(f)) {
      console.error(`\n  Arquivo não encontrado: ${f}\n`);
      process.exit(1);
    }
    corpo = fs.readFileSync(f, "utf8");
  } else {
    corpo = arg.slice(1).join(" ");
  }

  if (!corpo.trim()) {
    console.error("\n  Recado vazio.\n");
    process.exit(1);
  }

  // Data vem do sistema no momento do envio — recado sem hora não serve pra
  // nada, porque a primeira pergunta de quem lê é sempre "isso é de quando?".
  const quando = new Date().toISOString().replace("T", " ").slice(0, 16);
  const bloco = `\n---\n\n## De ${EU} · ${quando}\n\n${corpo.trim()}\n`;

  fs.appendFileSync(caixaDe(destino), bloco, "utf8");
  console.log(`\n  ${verde("recado deixado")} na caixa do agente ${destino}.`);
  console.log(`  Ele lê quando rodar 'npm run recado'.\n`);
  process.exit(0);
}

// ─── ler ────────────────────────────────────────────────────────────────────
const soVer = arg[0] === "ver";
const minha = caixaDe(EU);

if (EU === "?") {
  console.log(
    `\n  ${amarelo("Sem AGENTE definido.")} Rode com $env:AGENTE='cowork-A' ` +
      `(ou B) pra saber qual caixa é a sua.\n`,
  );
  process.exit(1);
}

if (!fs.existsSync(minha) || !fs.readFileSync(minha, "utf8").trim()) {
  console.log(`\n  ${azul(`CAIXA DO AGENTE ${EU}`)}  —  vazia.\n`);
  process.exit(0);
}

const conteudo = fs.readFileSync(minha, "utf8").trim();
console.log(`\n  ${azul(`CAIXA DO AGENTE ${EU}`)}\n`);
console.log(conteudo.replace(/^/gm, "  "));
console.log("");

if (soVer) {
  console.log(`  ${amarelo("(só visualizado — nada foi arquivado)")}\n`);
  process.exit(0);
}

const quandoLi = new Date().toISOString().replace("T", " ").slice(0, 16);
fs.appendFileSync(
  HISTORICO,
  `\n\n<!-- lido por ${EU} em ${quandoLi} -->\n${conteudo}\n`,
  "utf8",
);
fs.writeFileSync(minha, "", "utf8");
console.log(`  ${verde("arquivado")} em caixa/historico.md. Sua caixa está limpa.\n`);
