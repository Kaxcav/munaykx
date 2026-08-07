import Link from "next/link";
import { prisma } from "@/lib/db";
import { EstadoPublicacao } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Lista TODAS as comunidades — inclusive inativas e demo (diferente do site). */
export default async function AdminComunidadesPage() {
  const comunidades = await prisma.community.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { events: true } } },
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Operação</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Comunidades
          </h1>
        </div>
        <Link
          href="/admin/comunidades/nova"
          className={buttonVariants()}
        >
          + Nova comunidade
        </Link>
      </div>

      {comunidades.length === 0 ? (
        <p className="mt-10 text-muted-foreground">
          Nenhuma comunidade cadastrada ainda.
        </p>
      ) : (
        <div className="mt-8">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Região</TableHead>
                <TableHead>Eventos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {comunidades.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">
                    {c.nome}
                    <span className="block font-mono text-xs font-normal text-muted-foreground">
                      /{c.slug}
                    </span>
                  </TableCell>
                  <TableCell>{c.modalidade}</TableCell>
                  <TableCell>{c.regiao}</TableCell>
                  <TableCell>{c._count.events}</TableCell>
                  <TableCell>
                    <EstadoPublicacao ativo={c.ativo} demo={c.demo} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-3">
                      {/* Conferir o resultado sem sair do admin: o erro de
                          cadastro quase sempre só aparece na página pública. */}
                      {c.ativo && (
                        <Link
                          href={`/comunidades/${c.slug}`}
                          target="_blank"
                          className="text-muted-foreground underline underline-offset-4 hover:text-petroleo"
                        >
                          Ver no site ↗
                        </Link>
                      )}
                      <Link
                        href={`/admin/comunidades/${c.id}`}
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
