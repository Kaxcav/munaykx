import type { MetadataRoute } from "next";
import { getCommunities } from "@/lib/communities";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://munay.app.br";

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), priority: 1 },
    { url: `${base}/comunidades`, lastModified: new Date(), priority: 0.8 },
  ];

  // Sitemap roda no build — sem banco de pé, sai só com as rotas fixas.
  if (process.env.DATABASE_URL) {
    try {
      const comunidades = await getCommunities();
      entries.push(
        ...comunidades.map((c) => ({
          url: `${base}/comunidades/${c.slug}`,
          lastModified: c.createdAt,
          priority: 0.6,
        })),
      );
    } catch {
      // banco indisponível: mantém apenas as rotas fixas
    }
  }

  return entries;
}
