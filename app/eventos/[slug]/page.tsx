import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RsvpForm from "@/components/RsvpForm";
import CompartilharBotoes from "@/components/CompartilharBotoes";
import { emailConfigurado } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { textoCompartilharEvento, urlEvento } from "@/lib/compartilhar";
import {
  countConfirmados,
  formatarDataEvento,
  getEventBySlug,
} from "@/lib/events";

// Detalhe e vagas vêm do banco a cada request — nada de pré-render no build.
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const evento = await getEventBySlug(slug).catch(() => null);
  if (!evento) return { title: "Evento não encontrado" };
  const descricao = `${evento.titulo} — ${formatarDataEvento(evento.startsAt)} · ${evento.community.nome}, ${evento.community.regiao}.`;
  // openGraph/twitter EXPLÍCITOS: o layout raiz fixa um og:title genérico, então
  // sem isto o preview do link mostraria a marca, não o evento. A imagem vem do
  // `opengraph-image.tsx` ao lado. `type: "article"` é o certo pra página de detalhe.
  return {
    title: evento.titulo,
    description: descricao,
    openGraph: { title: evento.titulo, description: descricao, type: "article" },
    twitter: { title: evento.titulo, description: descricao },
  };
}

export default async function EventoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const evento = await getEventBySlug(slug);
  if (!evento) notFound();

  const jaPassou = evento.startsAt < new Date();
  const confirmados =
    evento.capacidade !== null ? await countConfirmados(evento.id) : null;
  const vagasRestantes =
    evento.capacidade !== null && confirmados !== null
      ? Math.max(0, evento.capacidade - confirmados)
      : null;

  const jsonLdEvento = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: evento.titulo,
    startDate: evento.startsAt.toISOString(),
    url: `${SITE_URL}/eventos/${evento.slug}`,
    eventStatus: evento.canceladoEm
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    // `location` sempre existe: quando o evento não informa o lugar exato, a
    // região da comunidade é a verdade disponível — e é o que a página mostra.
    location: {
      "@type": "Place",
      name: evento.local ?? evento.community.regiao,
      address: {
        "@type": "PostalAddress",
        addressLocality: evento.community.regiao,
        addressRegion: "DF",
        addressCountry: "BR",
      },
    },
    organizer: {
      "@type": "Organization",
      name: evento.community.nome,
      url: `${SITE_URL}/comunidades/${evento.community.slug}`,
    },
    // Preço só quando é fato. "Consultar organização" não vira 0.
    ...(evento.gratuito
      ? {
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "BRL",
            availability:
              vagasRestantes === 0
                ? "https://schema.org/SoldOut"
                : "https://schema.org/InStock",
            url: `${SITE_URL}/eventos/${evento.slug}`,
          },
        }
      : {}),
  };

  const detalhes: Array<{ rotulo: string; valor: string }> = [
    { rotulo: "Quando", valor: formatarDataEvento(evento.startsAt) },
    ...(evento.local ? [{ rotulo: "Onde", valor: evento.local }] : []),
    {
      rotulo: "Investimento",
      valor: evento.gratuito ? "Gratuito" : "Consultar organização",
    },
    ...(evento.capacidade !== null
      ? [
          {
            rotulo: "Vagas",
            valor:
              vagasRestantes === 0
                ? "Confirmadas esgotadas — dá pra entrar na lista de espera"
                : `${vagasRestantes} de ${evento.capacidade} disponíveis`,
          },
        ]
      : []),
  ];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-20">
        <Link
          href={`/comunidades/${evento.community.slug}`}
          className="font-mono text-xs uppercase tracking-[0.14em] text-petroleo/60 hover:text-petroleo"
        >
          ← {evento.community.nome}
        </Link>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <p className="eyebrow">
            Evento · {evento.community.modalidade} · {evento.community.regiao}
          </p>
          {evento.demo && (
            <span className="rounded-full border border-petroleo/15 px-3 py-0.5 font-mono text-[11px] uppercase tracking-wider text-petroleo/50">
              exemplo
            </span>
          )}
        </div>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          {evento.titulo}
        </h1>

        <dl className="mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
          {detalhes.map((d) => (
            <div
              key={d.rotulo}
              className="rounded-card border border-petroleo/10 bg-white/70 p-5"
            >
              <dt className="eyebrow">{d.rotulo}</dt>
              <dd className="mt-2 font-display text-lg font-bold">{d.valor}</dd>
            </div>
          ))}
        </dl>

        <CompartilharBotoes
          className="mt-10"
          url={urlEvento(evento.slug)}
          texto={textoCompartilharEvento(evento)}
          titulo={evento.titulo}
        />

        <section className="mt-16 max-w-3xl">
          {jaPassou ? (
            <div className="rounded-card border border-petroleo/15 bg-white/70 p-8">
              <p className="font-display text-2xl font-bold">
                Esse evento já aconteceu
              </p>
              <p className="mt-2 text-petroleo/70">
                Fica de olho na{" "}
                <Link
                  href={`/comunidades/${evento.community.slug}`}
                  className="underline underline-offset-4"
                >
                  página da comunidade
                </Link>{" "}
                pra saber dos próximos.
              </p>
            </div>
          ) : (
            <>
              <p className="eyebrow mb-3">Confirmar presença</p>
              <h2 className="mb-6 font-display text-2xl font-extrabold tracking-tight">
                Garante sua vaga — leva menos de um minuto.
              </h2>
              <RsvpForm eventSlug={evento.slug} avisaPorEmail={emailConfigurado()} />
            </>
          )}
        </section>
      </main>
      <Footer />
      {/*
        JSON-LD do EVENTO — só dados que a página já mostra.
        Marcar como Event faz o Google exibir data e local direto no
        resultado, o que importa mais aqui do que na maioria das páginas: a
        pessoa decide se vai a um treino pela data e pelo lugar, e ver isso
        antes de clicar é metade da decisão.
        Nada de campo inventado: sem preço quando não é gratuito (a página
        diz "consultar"), sem performer, sem imagem que não existe. Structured
        data que descreve o que a página não mostra é o que o Google chama de
        spam — e o domínio é a evidência da Etapa 2.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdEvento),
        }}
      />
    </>
  );
}
