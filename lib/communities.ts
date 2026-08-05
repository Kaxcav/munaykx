import { prisma } from "@/lib/db";
import type { Community } from "@prisma/client";

export type CommunityFilters = {
  modalidade?: string;
  regiao?: string;
};

/** Comunidades ativas, com filtro opcional por modalidade e/ou região. */
export function getCommunities(
  filters: CommunityFilters = {},
): Promise<Community[]> {
  return prisma.community.findMany({
    where: {
      ativo: true,
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

/** Valores distintos de modalidade e região entre as comunidades ativas — alimenta os filtros. */
export async function getCommunityFacets(): Promise<{
  modalidades: string[];
  regioes: string[];
}> {
  const [modalidades, regioes] = await Promise.all([
    prisma.community.findMany({
      where: { ativo: true },
      distinct: ["modalidade"],
      select: { modalidade: true },
      orderBy: { modalidade: "asc" },
    }),
    prisma.community.findMany({
      where: { ativo: true },
      distinct: ["regiao"],
      select: { regiao: true },
      orderBy: { regiao: "asc" },
    }),
  ]);

  return {
    modalidades: modalidades.map((m) => m.modalidade),
    regioes: regioes.map((r) => r.regiao),
  };
}
