/**
 * Purga manual do texto das buscas antigas (retenção de 12 meses).
 *
 * O caminho normal é o cron batendo em POST /api/cron/retencao. Este script
 * existe pra rodar à mão numa janela de manutenção, ou pra conferir o que a
 * purga faria antes de agendar — sem depender de segredo nem de rede.
 *
 *   node scripts/purgar-buscas.mjs
 */
import { PrismaClient } from "@prisma/client";

const MESES = 12;
const prisma = new PrismaClient();

function dataDeCorte(agora = new Date()) {
  const d = new Date(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
  );
  d.setUTCMonth(d.getUTCMonth() - MESES);
  return d;
}

const corte = dataDeCorte();
const r = await prisma.buscaRegistro.updateMany({
  where: { dia: { lt: corte }, texto: { not: null } },
  data: { texto: null },
});

console.log(
  `[retencao] ${r.count} texto(s) anulado(s); corte em ${corte.toISOString().slice(0, 10)} (${MESES} meses).`,
);
await prisma.$disconnect();
