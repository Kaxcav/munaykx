import { notFound } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { inscritosDoEvento } from "@/lib/organizacao";
import { csvDeInscritos } from "@/lib/painel";

export const dynamic = "force-dynamic";

/**
 * CSV dos inscritos de UM evento (STORY-009, decisão 5: nunca global).
 *
 * Route handler NÃO é embrulhado pelo layout do painel, então a sessão é
 * conferida AQUI. Sem sessão → 401. `inscritosDoEvento` é escopado por dono:
 * evento de outra pessoa devolve `null` → 404 (nunca 403). O escopo ao evento
 * é estrutural — o CSV só enxerga a lista que essa função entregou.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return new Response("Faça login para baixar.", { status: 401 });
  }

  const { id } = await params;
  const dados = await inscritosDoEvento(sessao.user.id, id);
  if (!dados) notFound();

  const csv = csvDeInscritos(dados.inscritos);
  const nome = `munay-inscritos-${dados.evento.slug}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
    },
  });
}
