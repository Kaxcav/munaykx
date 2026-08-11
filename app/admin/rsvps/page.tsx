import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatarDataAdmin } from "@/lib/admin";
import {
  PERIODOS,
  desdeQuando,
  fatia,
  parseBusca,
  parsePagina,
  parsePeriodo,
  query,
} from "@/lib/admin-lista";
import { BuscaAdmin } from "@/components/admin/BuscaAdmin";
import { Paginacao } from "@/components/admin/Paginacao";
import { buttonVariants } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { SeletorEvento } from "@/components/admin/SeletorEvento";
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

const STATUS = ["confirmado", "lista_espera"] as const;

type Filtros = {
  status?: string;
  evento?: string;
  q?: string;
  periodo?: string;
  p?: number;
};

type SearchParams = Promise<{
  status?: string;
  evento?: string;
  q?: string;
  periodo?: string;
  p?: string;
}>;

const href = (f: Filtros) => `/admin/rsvps${query({ ...f })}`;

/** RSVPs read-only por decisão de escopo — mexer em inscrição é com o próprio
 *  inscrito, via token (STORY-003). */
export default async function AdminRsvpsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = STATUS.find((s) => s === params.status);
  const q = parseBusca(params.q);
  const periodo = parsePeriodo(params.periodo);
  const pagina = parsePagina(params.p);
  const desde = desdeQuando(periodo);

  const eventos = await prisma.event.findMany({
    orderBy: { startsAt: "desc" },
    select: { slug: true, titulo: true },
  });
  // Slug da querystring só vale se existir de verdade — senão a tela diria
  // "nenhum RSVP" pra um evento inventado, o que parece bug de dado.
  const evento = eventos.find((e) => e.slug === params.evento)?.slug;

  const where: Prisma.RsvpWhereInput = {
    ...(status ? { status } : {}),
    ...(evento ? { event: { slug: evento } } : {}),
    ...(desde ? { createdAt: { gte: desde } } : {}),
    ...(q
      ? {
          OR: [
            { nome: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rsvps, total] = await Promise.all([
    prisma.rsvp.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { event: { select: { titulo: true, slug: true } } },
      ...fatia(pagina),
    }),
    prisma.rsvp.count({ where }),
  ]);

  const exportHref = `/admin/rsvps/export${query({ status, evento, q, periodo })}`;
  const base = { status, evento, q, periodo };

  return (
    <PaginaAdmin
      eyebrow="Operação"
      titulo={
        <>
          RSVPs{" "}
          <span className="text-muted-foreground tabular-nums">({total})</span>
        </>
      }
      descricao="Leitura apenas: mexer em inscrição é com o próprio inscrito, pelo link com token."
      acoes={
        <a href={exportHref} className={buttonVariants({ variant: "outline" })}>
          Exportar CSV
        </a>
      }
    >
      <div className="mt-6 space-y-2">
        <BuscaAdmin
          action="/admin/rsvps"
          valor={q}
          placeholder="Buscar por nome ou e-mail"
          ocultos={{ status, evento, periodo }}
        />

        <div className="pt-2">
          <SeletorEvento
            action="/admin/rsvps"
            eventos={eventos}
            selecionado={evento}
            ocultos={{ status, q, periodo }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="eyebrow mr-1">Status</span>
          <Chip
            href={href({ ...base, status: undefined })}
            ativo={!status}
            tamanho="sm"
          >
            Todos
          </Chip>
          {STATUS.map((s) => (
            <Chip
              key={s}
              href={href({ ...base, status: s })}
              ativo={status === s}
              tamanho="sm"
            >
              {s === "lista_espera" ? "fila de espera" : s}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Período</span>
          <Chip
            href={href({ ...base, periodo: undefined })}
            ativo={!periodo}
            tamanho="sm"
          >
            Desde sempre
          </Chip>
          {PERIODOS.map((p) => (
            <Chip
              key={p.valor}
              href={href({ ...base, periodo: p.valor })}
              ativo={periodo === p.valor}
              tamanho="sm"
            >
              Últimos {p.label}
            </Chip>
          ))}
        </div>
      </div>

      {rsvps.length === 0 ? (
        <EstadoVazio
          titulo={
            total > 0
              ? "Essa página não existe nesse recorte."
              : "Nenhum RSVP com esse recorte."
          }
          descricao={
            total > 0
              ? `O recorte tem ${total} inscrição(ões), mas não nesta página.`
              : "Afrouxe um filtro ou amplie o período — os filtros vivem na URL, dá pra voltar."
          }
          acao={
            <Chip href="/admin/rsvps" tamanho="sm">
              Limpar filtros
            </Chip>
          }
        />
      ) : (
        <>
          <div className="mt-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rsvps.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {formatarDataAdmin(r.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold">{r.nome}</TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${r.email}`}
                        className="underline underline-offset-4 hover:text-muted-foreground"
                      >
                        {r.email}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/eventos/${r.event.slug}`}
                        target="_blank"
                        className="underline underline-offset-4 hover:text-muted-foreground"
                      >
                        {r.event.titulo} ↗
                      </Link>
                    </TableCell>
                    <TableCell>
                      {r.canceledAt ? (
                        <span className="font-mono text-xs uppercase text-muted-foreground">
                          cancelado
                        </span>
                      ) : r.status === "confirmado" ? (
                        "confirmado"
                      ) : (
                        "fila de espera"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Paginacao
            total={total}
            pagina={pagina}
            href={(p) => href({ ...base, p })}
          />
        </>
      )}
    </PaginaAdmin>
  );
}
