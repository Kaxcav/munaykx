import { getCommunityFacets } from "@/lib/communities";
import { iaDisponivel, interpretarBusca } from "@/lib/ia";

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
    const resultado = await interpretarBusca(texto, facetas, ip);

    // `null` não é erro: é "não deu pra interpretar com confiança". A UI
    // cai no filtro normal, que sempre funciona.
    if (!resultado) {
      return Response.json({ ok: false, motivo: "sem-interpretacao" });
    }

    return Response.json({ ok: true, ...resultado });
  } catch (erro) {
    console.error(
      "[busca-ia] falha:",
      erro instanceof Error ? erro.message : erro,
    );
    return Response.json({ ok: false, motivo: "erro" }, { status: 500 });
  }
}
