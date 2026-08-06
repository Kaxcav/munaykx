import { notFound } from "next/navigation";
import EventForm from "@/components/admin/EventForm";
import { prisma } from "@/lib/db";
import { salvarEvento } from "../actions";

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, communities] = await Promise.all([
    prisma.event.findUnique({ where: { id } }),
    prisma.community.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);
  if (!event) notFound();

  return (
    <>
      <p className="eyebrow mb-3">Eventos</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Editar: {event.titulo}
      </h1>
      <p className="mt-2 font-mono text-xs text-petroleo/50">
        Pra tirar do site sem perder RSVPs, desmarque “Ativo” (soft delete) —
        não existe deletar.
      </p>
      <div className="mt-8">
        <EventForm
          action={salvarEvento.bind(null, event.id)}
          event={event}
          communities={communities}
        />
      </div>
    </>
  );
}
