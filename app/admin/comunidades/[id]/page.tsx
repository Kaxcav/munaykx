import { notFound } from "next/navigation";
import CommunityForm from "@/components/admin/CommunityForm";
import { PaginaAdmin } from "@/components/admin/PaginaAdmin";
import { prisma } from "@/lib/db";
import { salvarComunidade } from "../actions";

export default async function EditarComunidadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const community = await prisma.community.findUnique({ where: { id } });
  if (!community) notFound();

  return (
    <PaginaAdmin
      eyebrow="Comunidades"
      titulo={`Editar: ${community.nome}`}
      descricao="Pra tirar do site sem perder histórico, desmarque “Ativa” (soft delete) — não existe deletar."
    >
      <div className="mt-8">
        <CommunityForm
          action={salvarComunidade.bind(null, community.id)}
          community={community}
        />
      </div>
    </PaginaAdmin>
  );
}
