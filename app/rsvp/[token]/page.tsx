import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CancelarInscricao from "@/components/CancelarInscricao";
import { prisma } from "@/lib/db";
import { formatarDataEvento } from "@/lib/events";

// Estado da inscrição vem do banco a cada visita; página é pessoal → noindex.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sua inscrição",
  robots: { index: false, follow: false },
};

type Params = Promise<{ token: string }>;

export default async function RsvpPage({ params }: { params: Params }) {
  const { token } = await params;

  const rsvp = await prisma.rsvp.findUnique({
    where: { token },
    include: { event: true },
  });
  if (!rsvp) notFound();

  const evento = rsvp.event;
  const jaPassou = evento.startsAt < new Date();
  const situacao: "cancelado" | "confirmado" | "lista_espera" =
    rsvp.canceledAt !== null ? "cancelado" : rsvp.status;

  const badges: Record<typeof situacao, { rotulo: string; classe: string }> = {
    confirmado: {
      rotulo: "Confirmada ✓",
      classe: "border-petroleo/20 bg-lime/30 text-petroleo",
    },
    lista_espera: {
      rotulo: "Lista de espera",
      classe: "border-petroleo/20 bg-white/70 text-petroleo",
    },
    cancelado: {
      rotulo: "Cancelada",
      classe: "border-petroleo/15 bg-white/50 text-petroleo/60",
    },
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-20">
        <p className="eyebrow">Sua inscrição</p>
        <h1 className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          {evento.titulo}
        </h1>
        <p className="mt-2 text-petroleo/70">
          {formatarDataEvento(evento.startsAt)}
          {evento.local ? ` · ${evento.local}` : ""} ·{" "}
          <Link
            href={`/eventos/${evento.slug}`}
            className="underline underline-offset-4"
          >
            página do evento
          </Link>
        </p>

        <div className="mt-10 max-w-xl rounded-card border border-petroleo/10 bg-white/70 p-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-xl font-bold">{rsvp.nome}</p>
            <span
              className={`rounded-full border px-3 py-0.5 font-mono text-[11px] uppercase tracking-wider ${badges[situacao].classe}`}
            >
              {badges[situacao].rotulo}
            </span>
          </div>

          {situacao === "confirmado" && (
            <p className="mt-3 text-petroleo/70">
              Sua vaga está garantida. Se não puder ir, cancela por aqui — a
              vaga passa pra quem está na fila.
            </p>
          )}
          {situacao === "lista_espera" && (
            <p className="mt-3 text-petroleo/70">
              Você está na fila. Se abrir vaga, sua inscrição é confirmada
              automaticamente — acompanha por este link.
            </p>
          )}
          {situacao === "cancelado" && (
            <p className="mt-3 text-petroleo/70">
              Inscrição cancelada. Mudou de ideia? É só{" "}
              <Link
                href={`/eventos/${evento.slug}`}
                className="underline underline-offset-4"
              >
                confirmar presença de novo
              </Link>
              {" "}na página do evento.
            </p>
          )}

          {jaPassou && situacao !== "cancelado" && (
            <p className="mt-3 text-sm text-petroleo/50">
              Esse evento já aconteceu — não há o que cancelar por aqui.
            </p>
          )}

          {!jaPassou && situacao !== "cancelado" && (
            <CancelarInscricao token={rsvp.token} />
          )}
        </div>

        <p className="mt-6 max-w-xl text-xs text-petroleo/50">
          Guarda este link: é por ele que você gerencia sua inscrição.
        </p>
      </main>
      <Footer />
    </>
  );
}
