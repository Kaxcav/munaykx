import type { Metadata } from "next";
import "./globals.css";
import Analytics from "@/components/Analytics";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MUNAY — Comunidades esportivas e culturais de Brasília",
    template: "%s · MUNAY",
  },
  description:
    "A MUNAY conecta você às comunidades, eventos e experiências esportivas e culturais de Brasília — por modalidade, região, horário e nível. Entre na lista de espera.",
  keywords: [
    "comunidades esportivas Brasília",
    "run club Brasília",
    "esporte DF",
    "eventos esportivos Brasília",
    "wellness Brasília",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "MUNAY",
    title: "MUNAY — sua próxima comunidade está em Brasília",
    description:
      "Descubra grupos de corrida, lutas, yoga e muito mais, filtrados por modalidade, região, horário e nível.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MUNAY — Comunidades esportivas e culturais de Brasília",
    description:
      "Descubra grupos de corrida, lutas, yoga e muito mais em Brasília.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        {/*
          Fontes via <link> para o MVP (zero fricção de build em qualquer ambiente).
          Melhoria futura: migrar para next/font/google (self-hosting automático).
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
