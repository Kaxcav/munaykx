import { notFound } from "next/navigation";
import CommunityForm from "@/components/admin/CommunityForm";
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
    <>
      <p className="eyebrow mb-3">Comunidades</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Editar: {community.nome}
      </h1>
      <p className="mt-2 font-mono text-xs text-petroleo/50">
        Pra tirar do site sem perder histórico, desmarque “Ativa” (soft
        delete) — não existe deletar.
      </p>
      <div className="mt-8">
        <CommunityForm
          action={salvarComunidade.bind(null, community.id)}
          community={community}
        />
      </div>
    </>
  );
}
