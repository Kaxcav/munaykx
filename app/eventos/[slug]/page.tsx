import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RsvpForm from "@/components/RsvpForm";
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
  return {
    title: evento.titulo,
    description: `${evento.titulo} — ${formatarDataEvento(evento.startsAt)} · ${evento.community.nome}, ${evento.community.regiao}.`,
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
              <RsvpForm eventSlug={evento.slug} />
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
