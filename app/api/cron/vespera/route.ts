import { headers } from "next/headers";
import { igualSeguro } from "@/lib/admin-auth";
import { avisarVespera } from "@/lib/vespera";

export const dynamic = "force-dynamic";

/**
 * GATILHO DO LEMBRETE DE VÉSPERA ("O que esperar") — chamado por cron diário,
 * não por gente. Mesmo contrato dos crons de `retencao` e `semana`:
 *
 *  - SEM `CRON_SECRET` → **503** (nunca 200): rota de manutenção aberta é convite
 *    pra alguém disparar o job em laço. Sem segredo, ela nem funciona.
 *  - Header `x-cron-secret` conferido em tempo constante (`igualSeguro`), como o
 *    Basic Auth — comparação normal vaza o prefixo por timing.
 *  - Sempre **POST**: GET é o que prefetch/scanner/crawler dispara sozinho, e
 *    isto ENVIA e-mail — não pode estar atrás de um verbo que qualquer um aciona.
 *
 * ⚠️ AGENDAMENTO: este endpoint precisa entrar no agendador (o mesmo GitHub
 * Actions que já dispara `retencao` e `semana`), rodando UMA vez por dia. Sem o
 * job agendado, o endpoint existe mas nunca é chamado.
 */
export async function POST() {
  const segredo = process.env.CRON_SECRET?.trim();
  if (!segredo) {
    return Response.json(
      { ok: false, motivo: "CRON_SECRET não configurado" },
      { status: 503 },
    );
  }

  const h = await headers();
  const enviado = h.get("x-cron-secret") ?? "";
  if (!igualSeguro(enviado, segredo)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  try {
    const r = await avisarVespera();
    console.info(
      `[vespera] lembretes: ${r.avisados} enviado(s) de ${r.candidatos} candidato(s)`,
    );
    return Response.json({ ok: true, ...r });
  } catch (erro) {
    console.error(
      "[vespera] falha no lote:",
      erro instanceof Error ? erro.message : erro,
    );
    return Response.json({ ok: false, motivo: "falha" }, { status: 500 });
  }
}
