import Link from "next/link";
import { prisma } from "@/lib/db";
import { EstadoPublicacao } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatarDataAdmin } from "@/lib/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Lista TODOS os eventos — inclusive passados, inativos e demo. */
export default async function AdminEventosPage() {
  const eventos = await prisma.event.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      community: { select: { nome: true } },
      _count: {
        select: {
          rsvps: { where: { status: "confirmado", canceledAt: null } },
        },
      },
    },
  });

  const agora = new Date();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Operação</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Eventos
          </h1>
        </div>
        <Link
          href="/admin/eventos/novo"
          className={buttonVariants()}
        >
          + Novo evento
        </Link>
      </div>

      {eventos.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Nenhum evento cadastrado ainda.</p>
      ) : (
        <div className="mt-8">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Comunidade</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Confirmados</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-semibold">
                    {e.titulo}
                    <span className="block font-mono text-xs font-normal text-muted-foreground">
                      /{e.slug}
                    </span>
                  </TableCell>
                  <TableCell>{e.community.nome}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatarDataAdmin(e.startsAt)}
                    {e.startsAt < agora && (
                      <span className="block text-muted-foreground">passado</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/rsvps?evento=${e.slug}`}
                      className="underline underline-offset-4 hover:text-muted-foreground"
                    >
                      {e._count.rsvps}
                      {e.capacidade != null ? ` / ${e.capacidade}` : ""}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <EstadoPublicacao ativo={e.ativo} demo={e.demo} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-3">
                      {e.ativo && (
                        <Link
                          href={`/eventos/${e.slug}`}
                          target="_blank"
                          className="text-muted-foreground underline underline-offset-4 hover:text-petroleo"
                        >
                          Ver no site ↗
                        </Link>
                      )}
                      <Link
                        href={`/admin/eventos/${e.id}`}
                        className="font-semibold underline underline-offset-4 hover:text-muted-foreground"
                      >
                        Editar
                      </Link>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
