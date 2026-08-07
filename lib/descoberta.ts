import { prisma } from "@/lib/db";
import { CIDADE_PADRAO, PUBLICO } from "@/lib/communities";
import { slugify } from "@/lib/slug";

/**
 * SEO programático das páginas de descoberta (`/descobrir/...`).
 *
 * O problema que isto resolve: ninguém pesquisa "plataforma de comunidades
 * esportivas". Pesquisa "corrida em Ceilândia", "vôlei Taguatinga",
 * "jiu-jítsu Asa Norte". Sem uma página por recorte, a MUNAY não aparece
 * pra nenhuma dessas buscas — o filtro de `/comunidades?modalidade=` vive
 * atrás de querystring, que o Google indexa mal e nunca com esse título.
 *
 * DUAS REGRAS QUE NÃO SE NEGOCIAM AQUI:
 *
 * 1. **Só existe página onde existe dado.** As combinações são geradas a
 *    partir do banco, não do produto cartesiano modalidade × 35 RAs. O
 *    cartesiano daria ~centenas de páginas vazias — isso tem nome (doorway
 *    pages) e derruba o domínio inteiro, não só as páginas ruins.
 *
 * 2. **Conteúdo demo não vai pro índice.** Enquanto o recorte só tiver
 *    comunidade `demo: true`, a página funciona no site mas sai `noindex`.
 *    Publicar parceiro ilustrativo no Google seria transformar exemplo em
 *    afirmação pública — exatamente o que a regra 3 do projeto proíbe.
 *
 * A rota vive em `/descobrir/` e não em `/comunidades/` de propósito:
 * `/comunidades/[slug]` já é a página de UMA comunidade, e um parceiro com
 * slug "corrida-em-ceilandia" sequestraria o recorte (ou vice-versa).
 */

export type Recorte = {
  /** Slug da URL, ex.: "corrida-em-ceilandia". */
  slug: string;
  modalidade?: string;
  regiao?: string;
  /** Quantas comunidades ativas casam com o recorte. */
  total: number;
  /** Quantas delas NÃO são demo — é isto que decide indexar ou não. */
  reais: number;
};

const SEPARADOR = "-em-";
const PREFIXO_REGIAO = "em-";

function slugDoRecorte(modalidade?: string, regiao?: string): string {
  if (modalidade && regiao)
    return `${slugify(modalidade)}${SEPARADOR}${slugify(regiao)}`;
  if (modalidade) return slugify(modalidade);
  return `${PREFIXO_REGIAO}${slugify(regiao ?? "")}`;
}

/**
 * Todos os recortes que têm ao menos uma comunidade ativa: a combinação
 * modalidade+região, a modalidade sozinha e a região sozinha.
 *
 * Uma consulta só (`groupBy`) e o resto é agregação em memória — são
 * dezenas de linhas, não milhões.
 */
export async function recortesComDado(
  city: string = CIDADE_PADRAO,
): Promise<Recorte[]> {
  const grupos = await prisma.community.groupBy({
    by: ["modalidade", "regiao", "demo"],
    // `PUBLICO` e não `ativo: true` solto: recorte de SEO montado sobre
    // comunidade pendente publicaria no Google conteúdo que ninguém aprovou.
    where: { ...PUBLICO, city },
    _count: { _all: true },
  });

  const mapa = new Map<string, Recorte>();

  const somar = (modalidade: string | undefined, regiao: string | undefined, total: number, reais: number) => {
    const slug = slugDoRecorte(modalidade, regiao);
    if (!slug) return;
    const atual = mapa.get(slug);
    if (atual) {
      atual.total += total;
      atual.reais += reais;
    } else {
      mapa.set(slug, { slug, modalidade, regiao, total, reais });
    }
  };

  for (const g of grupos) {
    const n = g._count._all;
    const reais = g.demo ? 0 : n;
    somar(g.modalidade, g.regiao, n, reais);
    somar(g.modalidade, undefined, n, reais);
    somar(undefined, g.regiao, n, reais);
  }

  return [...mapa.values()].sort((a, b) => a.slug.localeCompare(b.slug, "pt-BR"));
}

/**
 * Resolve o slug da URL. Devolve `null` quando o recorte não tem dado —
 * a página vira 404 em vez de "nada por aqui", que é o certo: página que
 * nunca teve conteúdo não deve responder 200 pro robô.
 *
 * Casar contra a lista gerada (em vez de fazer parse de "-em-") elimina a
 * ambiguidade de modalidade ou região que contenha a palavra: o que não foi
 * gerado, não existe.
 */
export async function acharRecorte(
  slug: string,
  city: string = CIDADE_PADRAO,
): Promise<Recorte | null> {
  const alvo = slug.trim().toLowerCase();
  const recortes = await recortesComDado(city);
  return recortes.find((r) => r.slug === alvo) ?? null;
}

/** Só entram no sitemap os recortes com comunidade real — ver regra 2. */
export async function recortesIndexaveis(
  city: string = CIDADE_PADRAO,
): Promise<Recorte[]> {
  return (await recortesComDado(city)).filter((r) => r.reais > 0);
}

/** "corrida" + "Ceilândia" → "Corrida em Ceilândia" (título e <h1>). */
export function tituloDoRecorte(recorte: Recorte): string {
  const modalidade = recorte.modalidade
    ? recorte.modalidade.charAt(0).toUpperCase() + recorte.modalidade.slice(1)
    : "Comunidades";
  if (recorte.modalidade && recorte.regiao)
    return `${modalidade} em ${recorte.regiao}`;
  if (recorte.modalidade) return `${modalidade} em Brasília`;
  return `Comunidades em ${recorte.regiao}`;
}
