import { prisma } from "@/lib/db";
import type { Community } from "@prisma/client";
import { REGIAO_OUTRA, REGIOES_DF } from "@/lib/regioes";

/** Cidade padrão da descoberta enquanto não existe seletor na UI (Blueprint C1). */
export const CIDADE_PADRAO = "Brasília";

export type CommunityFilters = {
  modalidade?: string;
  regiao?: string;
  city?: string;
};

/** Comunidades ativas da cidade, com filtro opcional por modalidade e/ou região. */
export function getCommunities(
  filters: CommunityFilters = {},
): Promise<Community[]> {
  return prisma.community.findMany({
    where: {
      ativo: true,
      city: filters.city ?? CIDADE_PADRAO,
      ...(filters.modalidade ? { modalidade: filters.modalidade } : {}),
      ...(filters.regiao ? { regiao: filters.regiao } : {}),
    },
    orderBy: { nome: "asc" },
  });
}

export function getCommunityBySlug(slug: string): Promise<Community | null> {
  return prisma.community.findFirst({
    where: { slug, ativo: true },
  });
}

/** Valores de modalidade e região que alimentam os filtros de /comunidades.
 *  Modalidades: distintas entre as comunidades ativas da cidade.
 *  Regiões: as 35 RAs oficiais ∪ valores distintos do banco (o conteúdo demo
 *  usa recortes como "Asa Norte" que não são RA — a união garante que nenhum
 *  card suma do filtro; converge sozinho quando os parceiros reais entrarem
 *  pelo admin), com "Outra região" sempre no fim. */
export async function getCommunityFacets(
  city: string = CIDADE_PADRAO,
): Promise<{
  modalidades: string[];
  regioes: string[];
}> {
  const [modalidades, regioesDb] = await Promise.all([
    prisma.community.findMany({
      where: { ativo: true, city },
      distinct: ["modalidade"],
      select: { modalidade: true },
      orderBy: { modalidade: "asc" },
    }),
    prisma.community.findMany({
      where: { ativo: true, city },
      distinct: ["regiao"],
      select: { regiao: true },
    }),
  ]);

  const collator = new Intl.Collator("pt-BR");
  const regioes = Array.from(
    new Set<string>([...REGIOES_DF, ...regioesDb.map((r) => r.regiao)]),
  )
    .filter((r) => r !== REGIAO_OUTRA)
    .sort(collator.compare);
  regioes.push(REGIAO_OUTRA);

  return {
    modalidades: modalidades.map((m) => m.modalidade),
    regioes,
  };
}
