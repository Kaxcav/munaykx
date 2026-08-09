import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { igualSeguro } from "@/lib/admin-auth";
import { gerarResumoDaSemana } from "@/lib/ai/semana";

export const dynamic = "force-dynamic";

/**
 * GATILHO DA CURADORIA SEMANAL — chamado por cron, não por gente.
 *
 * Mesmo desenho da purga de retenção: rota POST protegida por `CRON_SECRET`,
 * sem default (503 sem segredo), comparação em tempo constante, e nunca GET —
 * prefetch e crawler disparam GET sozinhos, e este endpoint gasta chamada de
 * IA.
 *
 * Idempotente por semana: `gerarResumoDaSemana` devolve o resumo existente em
 * vez de gerar outro, então um cron que dispara duas vezes não paga duas.
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
  if (!igualSeguro(h.get("x-cron-secret") ?? "", segredo)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  try {
    const r = await gerarResumoDaSemana();
    if (!r) {
      // Sem evento na janela, ou texto recusado pela guarda. Não é erro: é a
      // semana não ter o que curar, e a página já mostra estado vazio.
      return Response.json({ ok: true, gerado: false });
    }

    revalidatePath("/semana");
    console.info(`[semana] curadoria gerada: ${r.eventos} evento(s)`);
    return Response.json({ ok: true, gerado: true, eventos: r.eventos });
  } catch (erro) {
    console.error(
      "[semana] falha ao gerar:",
      erro instanceof Error ? erro.message : erro,
    );
    // 500 aqui é informativo, não crítico: a página continua servindo o
    // resumo anterior ou o estado vazio. Ninguém fica sem site por isso.
    return Response.json({ ok: false, motivo: "falha" }, { status: 500 });
  }
}
