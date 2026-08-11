import Link from "next/link";
import { prisma } from "@/lib/db";
import { EstadoPublicacao } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PaginaAdmin } from "@/components/admin/PaginaAdmin";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
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
    <PaginaAdmin
      eyebrow="Operação"
      titulo="Comunidades"
      descricao="Todas — inclusive as inativas e as ilustrativas, que não aparecem no site."
      acoes={
        <>
          <Link
            href="/admin/comunidades/assistido"
            className={buttonVariants({ variant: "outline" })}
          >
            Colar texto (IA)
          </Link>
          <Link href="/admin/comunidades/nova" className={buttonVariants()}>
            + Nova comunidade
          </Link>
        </>
      }
    >
      {comunidades.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma comunidade cadastrada ainda."
          descricao="Enquanto não houver uma, /comunidades e /mapa respondem vazio pro visitante."
          acao={
            <Link href="/admin/comunidades/nova" className={buttonVariants()}>
              Cadastrar a primeira
            </Link>
          }
        />
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
                          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
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
    </PaginaAdmin>
  );
}
