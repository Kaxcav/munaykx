#!/usr/bin/env node
/**
 * PREFLIGHT — o que tem que ser verdade ANTES de mexer neste worktree.
 *
 * POR QUE ISTO EXISTE (07/08/2026): num único dia, sete erros. Todos com a
 * mesma raiz — alguém (na maioria das vezes, um agente) agiu sobre uma
 * SUPOSIÇÃO do estado da máquina em vez de medir. E dois deles aconteceram
 * porque há mais de um operador na mesma máquina e eles não se enxergam.
 *
 * O que este script NÃO é: um lembrete. Lembrete depende de disciplina, e
 * disciplina é exatamente o que falha às duas da manhã. Ele mede e **recusa**.
 *
 * Cada checagem aqui nasceu de um erro real, e o comentário diz qual.
 *
 *   node scripts/preflight.mjs            → verifica e sai 1 se algo está errado
 *   node scripts/preflight.mjs --claim    → verifica e reivindica o worktree
 *   node scripts/preflight.mjs --release  → devolve o worktree
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));

const problemas = [];
const avisos = [];
const ok = [];

const falha = (t) => problemas.push(t);
const aviso = (t) => avisos.push(t);
const passa = (t) => ok.push(t);

const sh = (cmd) => {
  try {
    return execSync(cmd, { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

// ─── 1. NODE_ENV ────────────────────────────────────────────────────────────
// Erro real: o shell da ponte exportava NODE_ENV=production. O npm liga
// `omit=dev` sozinho, o `npm ci` instalou só as deps de produção, e o build
// morreu com "Cannot find module 'tailwindcss'" — um erro que não parece ter
// nada a ver com a causa. Custou o começo de um dia.
const nodeEnv = process.env.NODE_ENV ?? "";
if (nodeEnv && nodeEnv !== "development" && nodeEnv !== "test") {
  falha(
    `NODE_ENV='${nodeEnv}'. Com isso o npm liga omit=dev e o install pula as ` +
      `devDependencies. Limpe antes: $env:NODE_ENV='' (PowerShell) ou unset NODE_ENV.`,
  );
} else {
  passa(`NODE_ENV limpo ('${nodeEnv}')`);
}

const omit = sh("npm config get omit");
if (omit && omit !== "undefined" && omit.includes("dev")) {
  falha(`npm config omit='${omit}' — devDependencies não vão ser instaladas.`);
}

// ─── 2. Pra qual banco este worktree aponta ─────────────────────────────────
// Near-miss real: o env do PowerShell apontava pra PRODUÇÃO na hora de rodar
// migration. Não dá pra impedir por código, mas dá pra obrigar a ver.
const envFile = path.join(RAIZ, ".env");
let dbUrl = process.env.DATABASE_URL ?? "";
let dbOrigem = "env do shell";
if (!dbUrl && fs.existsSync(envFile)) {
  const m = fs.readFileSync(envFile, "utf8").match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
  if (m) {
    dbUrl = m[1];
    dbOrigem = ".env";
  }
}
if (!dbUrl) {
  aviso("Nenhuma DATABASE_URL encontrada — o site sobe, mas as APIs respondem 503.");
} else {
  const seguro = dbUrl.replace(/(:\/\/[^:]+:)[^@]+(@)/, "$1***$2");
  const pareceProducao = /railway|rlwy\.net|proxy\.rlwy|amazonaws|neon\.tech|supabase\.co/i.test(dbUrl);
  if (pareceProducao) {
    falha(
      `DATABASE_URL (${dbOrigem}) parece PRODUÇÃO: ${seguro}\n` +
        `      Migration ou seed aqui mexe em dado de gente real. Pare.`,
    );
  } else {
    passa(`Banco (${dbOrigem}): ${seguro}`);
  }
}

// ─── 3. Ninguém pode estar segurando este worktree ──────────────────────────
// Erro real: rodei `npm ci` numa pasta com um `next dev` vivo. O install
// apagou o node_modules e não conseguiu recriar — a pasta ficou pela metade.
// Eu tinha "conferido as portas": conferi uma LISTA ESCOLHIDA A DEDO, e o
// servidor estava numa porta fora da lista. Aqui a lista é a máquina inteira.
function processosNesteWorktree() {
  const alvo = RAIZ.toLowerCase();
  try {
    if (os.platform() === "win32") {
      const saida = execSync(
        'powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq \'node.exe\' } | ForEach-Object { $_.ProcessId.ToString() + \'|\' + $_.CommandLine }"',
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
      return saida
        .split(/\r?\n/)
        .filter((l) => l.includes("|"))
        .map((l) => {
          const [pid, ...resto] = l.split("|");
          return { pid: pid.trim(), cmd: resto.join("|") };
        })
        .filter((p) => p.cmd.toLowerCase().includes(alvo) && p.pid !== String(process.pid));
    }
    const saida = execSync("ps -eo pid=,args=", { encoding: "utf8" });
    return saida
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.toLowerCase().includes(alvo) && !l.includes("preflight"))
      .map((l) => ({ pid: l.split(/\s+/)[0], cmd: l }));
  } catch {
    return null;
  }
}

const vivos = processosNesteWorktree();
if (vivos === null) {
  aviso("Não consegui listar processos — confira à mão antes de instalar dependência.");
} else if (vivos.length > 0) {
  falha(
    `${vivos.length} processo(s) node vivo(s) NESTE worktree. Instalar dependência agora ` +
      `deixa o node_modules pela metade:\n` +
      vivos.map((p) => `      PID ${p.pid}  ${p.cmd.slice(0, 90)}`).join("\n"),
  );
} else {
  passa("Nenhum processo node segurando este worktree");
}

// ─── 4. O prisma local é o da major fixada ──────────────────────────────────
// Erro real: com o node_modules quebrado, `npx prisma` baixou a v7 do
// registro e falhou com "datasource property url is no longer supported".
// Parecia erro de schema; era major errada. A regra 5 do projeto fixa v6.
const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, "package.json"), "utf8"));
const querido = (pkg.devDependencies?.prisma ?? pkg.dependencies?.prisma ?? "").replace(/^[\^~]/, "");
const instaladoPath = path.join(RAIZ, "node_modules", "prisma", "package.json");
if (!querido) {
  aviso("package.json não fixa prisma.");
} else if (!fs.existsSync(instaladoPath)) {
  falha(
    `prisma NÃO está instalado localmente. Sem ele, 'npx prisma' baixa a ÚLTIMA ` +
      `major do registro (hoje v7) e quebra contra o schema v6. Rode npm ci.`,
  );
} else {
  const instalado = JSON.parse(fs.readFileSync(instaladoPath, "utf8")).version;
  if (instalado.split(".")[0] !== querido.split(".")[0]) {
    falha(`prisma instalado ${instalado}, mas o projeto fixa ${querido}. Major diferente.`);
  } else {
    passa(`prisma local ${instalado} (major bate com ${querido})`);
  }
}

// ─── 5. node_modules inteiro, não pela metade ───────────────────────────────
const essenciais = ["next", "react", "tailwindcss", "@playwright/test", "@prisma/client"];
const faltando = essenciais.filter((p) => !fs.existsSync(path.join(RAIZ, "node_modules", ...p.split("/"))));
if (faltando.length) {
  falha(`node_modules incompleto — falta: ${faltando.join(", ")}. Rode npm ci.`);
} else {
  passa("node_modules completo");
}

// ─── 6. Git: onde estou e o que há de solto ─────────────────────────────────
const branch = sh("git rev-parse --abbrev-ref HEAD");
const sujo = sh("git status --porcelain");
passa(`branch: ${branch}`);
if (branch === "main") {
  aviso("Você está na MAIN. Push aqui dispara deploy de produção.");
}
if (sujo) {
  aviso(`${sujo.split("\n").length} arquivo(s) não commitado(s).`);
}

// ─── 7. Porta da suíte ──────────────────────────────────────────────────────
// Erro real: com a porta fixa, a segunda suíte encontra a 3100 ocupada e —
// por reuseExistingServer — reaproveita o servidor da OUTRA branch. Verde
// contra código que não é o seu.
const porta = process.env.PW_PORTA ?? "3100";
passa(`porta da suíte: ${porta}${process.env.PW_PORTA ? "" : "  (padrão)"}`);

export { RAIZ, problemas, avisos, ok, branch, porta };

// ─── 8. Quem está operando este worktree ────────────────────────────────────
// Erro real: dois `npm ci` rodaram ao mesmo tempo na mesma pasta porque havia
// duas bocas mandando comando na mesma máquina e nenhuma sabia da outra. O
// `react` sumiu do node_modules no meio.
//
// Não existe canal entre sessões de agente — cada uma acha que está sozinha.
// A máquina é a única superfície compartilhada, então o combinado mora num
// arquivo. Não é trava de verdade (dá pra ignorar); é AVISO com nome e hora,
// que é o que faltava.
const LOCK = path.join(RAIZ, ".operacao-lock.json");
const agora = new Date().toISOString();
const quem = process.env.AGENTE ?? process.env.USERNAME ?? process.env.USER ?? "desconhecido";

if (args.has("--release")) {
  if (fs.existsSync(LOCK)) fs.rmSync(LOCK);
  console.log(`\n  worktree liberado: ${RAIZ}\n`);
  process.exit(0);
}

let lock = null;
if (fs.existsSync(LOCK)) {
  try {
    lock = JSON.parse(fs.readFileSync(LOCK, "utf8"));
  } catch {
    lock = null;
  }
}

if (lock) {
  const idadeMin = Math.round((Date.now() - Date.parse(lock.em)) / 60000);
  if (lock.quem !== quem) {
    falha(
      `Este worktree está reivindicado por '${lock.quem}' há ${idadeMin} min ` +
        `(${lock.tarefa ?? "sem tarefa declarada"}).\n` +
        `      Se ele terminou, rode: npm run preflight -- --release`,
    );
  } else if (idadeMin > 240) {
    aviso(`Sua própria reivindicação tem ${idadeMin} min. Ainda está nela?`);
  } else {
    passa(`worktree reivindicado por você há ${idadeMin} min`);
  }
} else {
  passa("worktree livre");
}

// ─── Relatório ──────────────────────────────────────────────────────────────
const azul = (s) => `\x1b[36m${s}\x1b[0m`;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const amarelo = (s) => `\x1b[33m${s}\x1b[0m`;
const vermelho = (s) => `\x1b[31m${s}\x1b[0m`;

console.log(`\n${azul("PREFLIGHT")}  ${RAIZ}\n`);
for (const t of ok) console.log(`  ${verde("ok")}    ${t}`);
for (const t of avisos) console.log(`  ${amarelo("aviso")} ${t}`);
for (const t of problemas) console.log(`  ${vermelho("PARE")}  ${t}`);

if (problemas.length) {
  console.log(
    `\n  ${vermelho(`${problemas.length} problema(s).`)} Nada de instalar, migrar ou apagar antes de resolver.\n`,
  );
  process.exit(1);
}

if (args.has("--claim")) {
  const tarefa = process.argv[process.argv.indexOf("--claim") + 1];
  fs.writeFileSync(
    LOCK,
    JSON.stringify({ quem, em: agora, tarefa: tarefa?.startsWith("--") ? null : tarefa }, null, 2),
  );
  console.log(`  ${verde("reivindicado")} por '${quem}'\n`);
} else {
  console.log(`\n  ${verde("tudo certo.")} Pra reivindicar: npm run preflight -- --claim "o que você vai fazer"\n`);
}
