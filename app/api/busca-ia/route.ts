import { getCommunityFacets } from "@/lib/communities";
import { iaDisponivel, interpretarBusca } from "@/lib/ia";
import { recomendar } from "@/lib/ai/recomendacao";

export const dynamic = "force-dynamic";

/**
 * Interpreta uma busca em linguagem natural e devolve os filtros.
 *
 * Não devolve comunidades: quem lista é a página `/comunidades`, com a
 * mesma query de sempre. Assim a busca por IA e a busca por filtro
 * produzem exatamente o mesmo resultado pro mesmo recorte — e o link é
 * compartilhável, porque vira querystring.
 */
export async function POST(req: Request) {
  if (!iaDisponivel()) {
    return Response.json({ ok: false, motivo: "desligada" }, { status: 503 });
  }

  let texto = "";
  try {
    const corpo = (await req.json()) as { texto?: unknown };
    texto = typeof corpo.texto === "string" ? corpo.texto : "";
  } catch {
    return Response.json({ ok: false, motivo: "corpo inválido" }, { status: 400 });
  }

  if (texto.trim().length < 3) {
    return Response.json({ ok: false, motivo: "muito curto" }, { status: 400 });
  }

  // IP pra contabilizar o teto. Atrás da Cloudflare e do Railway, o IP real
  // vem no cabeçalho — `req` só enxergaria o proxy. Sem identificação, todo
  // mundo cairia no mesmo balde e um abusador derrubaria a busca de todos.
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconhecido";

  try {
    const facetas = await getCommunityFacets();
    // As duas chamadas em paralelo: a interpretação continua alimentando os
    // filtros (o caminho que sempre funcionou) e a recomendação acrescenta as
    // três comunidades. Uma falhar não derruba a outra — cada uma devolve
    // `null` por conta própria, e a UI degrada no que sobrou.
    const [resultado, descoberta] = await Promise.all([
      interpretarBusca(texto, facetas, ip),
      recomendar(texto, ip),
    ]);

    // `null` não é erro: é "não deu pra interpretar com confiança". A UI
    // cai no filtro normal, que sempre funciona.
    if (!resultado) {
      // Sem interpretação mas COM recomendação ainda vale a pena responder:
      // as três comunidades são o que a pessoa queria, e o filtro era só o
      // meio de chegar nelas.
      if (descoberta && descoberta.recomendacoes.length > 0) {
        return Response.json({
          ok: true,
          modalidade: null,
          regiao: null,
          entendimento: "",
          observacao: descoberta.observacao,
          recomendacoes: descoberta.recomendacoes,
        });
      }
      return Response.json({ ok: false, motivo: "sem-interpretacao" });
    }

    return Response.json({
      ok: true,
      ...resultado,
      recomendacoes: descoberta?.recomendacoes ?? [],
      // A observação da descoberta ("só achei duas") tem prioridade: ela fala
      // do resultado que a pessoa vai ver, não do filtro.
      observacao: descoberta?.observacao ?? resultado.observacao,
    });
  } catch (erro) {
    console.error(
      "[busca-ia] falha:",
      erro instanceof Error ? erro.message : erro,
    );
    return Response.json({ ok: false, motivo: "erro" }, { status: 500 });
  }
}
