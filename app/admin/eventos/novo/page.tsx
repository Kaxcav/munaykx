import Link from "next/link";
import EventForm from "@/components/admin/EventForm";
import { prisma } from "@/lib/db";
import { salvarEvento } from "../actions";

export default async function NovoEventoPage() {
  const communities = await prisma.community.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <>
      <p className="eyebrow mb-3">Eventos</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Novo evento
      </h1>
      {communities.length === 0 ? (
        <p className="mt-8 text-petroleo/70">
          Evento precisa de comunidade.{" "}
          <Link
            href="/admin/comunidades/nova"
            className="underline underline-offset-4"
          >
            Cadastre uma comunidade primeiro
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8">
          <EventForm
            action={salvarEvento.bind(null, null)}
            communities={communities}
          />
        </div>
      )}
    </>
  );
}
