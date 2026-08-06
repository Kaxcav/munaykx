import Script from "next/script";

/**
 * Umami self-host (Railway). Sem as duas envs NEXT_PUBLIC_UMAMI_*, não
 * renderiza nada — o site funciona igual, só sem métricas. Analytics
 * anônimo, sem cookies de rastreio individual (ver /privacidade).
 */
export default function Analytics() {
  const src = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!src || !websiteId) return null;

  return <Script src={src} data-website-id={websiteId} strategy="afterInteractive" />;
}
