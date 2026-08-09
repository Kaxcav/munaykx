import { headers } from "next/headers";
import { igualSeguro } from "@/lib/admin-auth";
import { purgarTextosAntigos, MESES_DE_RETENCAO } from "@/lib/ai/retencao";

export const dynamic = "force-dynamic";

/**
 * GATILHO DA PURGA DE RETENÇÃO — chamado por cron, não por gente.
 *
 * Por que uma rota HTTP e não um worker: o site já está de pé, então a purga
 * custa uma requisição por dia. Um worker always-on cobraria 24h de container
 * pra fazer um `UPDATE` que leva milissegundos. O agendamento fica fora do
 * código — Railway cron, GitHub Actions, cron-job.org, tanto faz: qualquer
 * coisa que saiba fazer um POST com um cabeçalho.
 *
 * ── SEGREDO OBRIGATÓRIO, SEM DEFAULT ────────────────────────────────────
 *
 * Sem `CRON_SECRET` a rota responde **503**, nunca 200 — mesma regra do
 * /admin ("senha default não existe"). Uma rota de manutenção aberta é convite
 * pra alguém disparar o job em laço; aqui ela nem existe até haver segredo.
 *
 * Comparação em tempo constante (`igualSeguro`), pelo mesmo motivo do Basic
 * Auth: comparação normal vaza o prefixo do segredo por timing.
 *
 * ── SEMPRE POST ─────────────────────────────────────────────────────────
 *
 * GET é o que prefetch de navegador, scanner corporativo e crawler disparam
 * sozinhos. Uma operação que escreve não pode estar atrás de um verbo que
 * qualquer um dispara sem querer — a mesma lição do magic link.
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
    const r = await purgarTextosAntigos();
    console.info(
      `[retencao] purga concluída: ${r.purgados} texto(s) anulado(s), corte ${r.corte}`,
    );
    return Response.json({ ok: true, ...r, mesesDeRetencao: MESES_DE_RETENCAO });
  } catch (erro) {
    console.error(
      "[retencao] falha na purga:",
      erro instanceof Error ? erro.message : erro,
    );
    // 500 de propósito: aqui o silêncio seria pior que o erro. Se a purga
    // falhar, alguém precisa ver — dado sensível ficando além do prazo é o
    // problema que este job existe pra evitar.
    return Response.json({ ok: false, motivo: "falha" }, { status: 500 });
  }
}
