import Link from "next/link";
import EventForm from "@/components/admin/EventForm";
import { PaginaAdmin } from "@/components/admin/PaginaAdmin";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { salvarEvento } from "../actions";

export default async function NovoEventoPage() {
  const communities = await prisma.community.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <PaginaAdmin
      eyebrow="Eventos"
      titulo="Novo evento"
    >
      {communities.length === 0 ? (
        <EstadoVazio
          titulo="Evento precisa de comunidade."
          descricao="Todo evento pertence a uma comunidade — é por ela que o visitante chega até ele."
          acao={
            <Link
              href="/admin/comunidades/nova"
              className={buttonVariants()}
            >
              Cadastrar uma comunidade primeiro
            </Link>
          }
        />
      ) : (
        <div className="mt-8">
          <EventForm
            action={salvarEvento.bind(null, null)}
            communities={communities}
          />
        </div>
      )}
    </PaginaAdmin>
  );
}
