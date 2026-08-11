import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CancelarInscricao from "@/components/CancelarInscricao";
import { Pagina } from "@/components/comum/Pagina";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { formatarDataEvento } from "@/lib/events";
import { emailConfigurado } from "@/lib/email";

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
  const avisaPorEmail = emailConfigurado();
  const situacao: "cancelado" | "confirmado" | "lista_espera" =
    rsvp.canceledAt !== null ? "cancelado" : rsvp.status;

  /*
    O selo de situação é `<Badge>`, e a variante diz o estado em vez de
    descrevê-lo em classe: `outline` pra fila (neutro), `secondary` pra
    cancelada (rebaixada). A confirmada é a única que carrega classe própria —
    o lime é o acento RARO da marca (checklist item 5), e "sua vaga está
    garantida" é exatamente o momento de gastá-lo.
  */
  const badges: Record<
    typeof situacao,
    { rotulo: string; variante: "outline" | "secondary"; classe?: string }
  > = {
    confirmado: {
      rotulo: "Confirmada ✓",
      variante: "outline",
      classe: "border-primary/20 bg-lime/30 text-foreground",
    },
    lista_espera: { rotulo: "Lista de espera", variante: "outline" },
    cancelado: { rotulo: "Cancelada", variante: "secondary" },
  };
  const selo = badges[situacao];

  return (
    <>
      <Header />
      <Pagina
        eyebrow="Sua inscrição"
        titulo={evento.titulo}
        descricao={
          <>
            {formatarDataEvento(evento.startsAt)}
            {evento.local ? ` · ${evento.local}` : ""} ·{" "}
            <Link
              href={`/eventos/${evento.slug}`}
              className="underline underline-offset-4"
            >
              página do evento
            </Link>
          </>
        }
      >
        <Card className="mt-10 max-w-xl p-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-xl font-bold">{rsvp.nome}</p>
            <Badge variant={selo.variante} className={selo.classe}>
              {selo.rotulo}
            </Badge>
          </div>

          {situacao === "confirmado" && (
            <p className="mt-3 text-foreground/70">
              Sua vaga está garantida. Se não puder ir, cancela por aqui — a
              vaga passa pra quem está na fila.
            </p>
          )}
          {situacao === "lista_espera" && (
            <p className="mt-3 text-foreground/70">
              Você está na fila. Se abrir vaga, sua inscrição é confirmada
              automaticamente{" "}
              {avisaPorEmail
                ? "e a gente te avisa por e-mail — não precisa ficar conferindo."
                : "— acompanha por este link."}
            </p>
          )}
          {situacao === "cancelado" && (
            <p className="mt-3 text-foreground/70">
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
            <p className="mt-3 text-sm text-foreground/50">
              Esse evento já aconteceu — não há o que cancelar por aqui.
            </p>
          )}

          {!jaPassou && situacao !== "cancelado" && (
            <CancelarInscricao token={rsvp.token} />
          )}
        </Card>

        <p className="mt-6 max-w-xl text-xs text-foreground/50">
          Guarda este link: é por ele que você gerencia sua inscrição.
        </p>
      </Pagina>
      <Footer />
    </>
  );
}
