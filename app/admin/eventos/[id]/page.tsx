import { notFound } from "next/navigation";
import EventForm from "@/components/admin/EventForm";
import { PaginaAdmin } from "@/components/admin/PaginaAdmin";
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
    <PaginaAdmin
      eyebrow="Eventos"
      titulo={`Editar: ${event.titulo}`}
      descricao="Pra tirar do site sem perder RSVPs, desmarque “Ativo” (soft delete) — não existe deletar."
    >
      <div className="mt-8">
        <EventForm
          action={salvarEvento.bind(null, event.id)}
          event={event}
          communities={communities}
        />
      </div>
    </PaginaAdmin>
  );
}
