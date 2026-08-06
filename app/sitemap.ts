import type { MetadataRoute } from "next";
import { getCommunities } from "@/lib/communities";
import { recortesIndexaveis } from "@/lib/descoberta";
import { getUpcomingEvents } from "@/lib/events";
import { SITE_URL } from "@/lib/site";

/**
 * Sitemap gerado A CADA REQUEST, não no build.
 *
 * Por padrão o Next pré-renderiza o sitemap junto do build — e aí comunidade
 * ou evento cadastrado pelo `/admin` só aparecia pro Google no próximo push
 * de código. Como o conteúdo entra pela operação e não pelo repositório, o
 * sitemap ficava semanas desatualizado sem ninguém perceber.
 *
 * O custo é uma consulta por visita de robô — algumas por dia. Barato.
 * (Encontrado pela suíte de testes em 06/08/2026: o teste do recorte
 * indexável falhava porque o sitemap era o do build.)
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), priority: 1 },
    { url: `${base}/comunidades`, lastModified: new Date(), priority: 0.8 },
    { url: `${base}/privacidade`, lastModified: new Date(), priority: 0.3 },
  ];

  // Sitemap roda no build — sem banco de pé, sai só com as rotas fixas.
  if (process.env.DATABASE_URL) {
    try {
      const [comunidades, eventos, recortes] = await Promise.all([
        getCommunities(),
        getUpcomingEvents(),
        // Só os recortes com comunidade REAL — combinação que só tem demo
        // fica de fora do sitemap de propósito (lib/descoberta.ts, regra 2).
        recortesIndexaveis(),
      ]);
      entries.push(
        ...comunidades.map((c) => ({
          url: `${base}/comunidades/${c.slug}`,
          lastModified: c.createdAt,
          priority: 0.6,
        })),
        ...eventos.map((e) => ({
          url: `${base}/eventos/${e.slug}`,
          lastModified: e.createdAt,
          priority: 0.5,
        })),
        ...recortes.map((r) => ({
          url: `${base}/descobrir/${r.slug}`,
          lastModified: new Date(),
          priority: 0.7,
        })),
      );
    } catch {
      // banco indisponível: mantém apenas as rotas fixas
    }
  }

  return entries;
}
