import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /admin é interno (STORY-005): fora do index, além do noindex + Basic Auth.
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
