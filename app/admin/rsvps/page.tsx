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
import { SeletorEvento } from "@/components/admin/SeletorEvento";

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

const chip = (ativo: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    ativo
      ? "border-petroleo bg-petroleo text-areia"
      : "border-petroleo/15 hover:border-petroleo/40"
  }`;

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
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Operação</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            RSVPs <span className="text-petroleo/40">({total})</span>
          </h1>
        </div>
        <a
          href={exportHref}
          className="rounded-full border border-petroleo px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-petroleo hover:text-areia"
        >
          Exportar CSV
        </a>
      </div>

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
          <Link
            href={href({ ...base, status: undefined })}
            className={chip(!status)}
          >
            Todos
          </Link>
          {STATUS.map((s) => (
            <Link
              key={s}
              href={href({ ...base, status: s })}
              className={chip(status === s)}
            >
              {s === "lista_espera" ? "fila de espera" : s}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Período</span>
          <Link
            href={href({ ...base, periodo: undefined })}
            className={chip(!periodo)}
          >
            Desde sempre
          </Link>
          {PERIODOS.map((p) => (
            <Link
              key={p.valor}
              href={href({ ...base, periodo: p.valor })}
              className={chip(periodo === p.valor)}
            >
              Últimos {p.label}
            </Link>
          ))}
        </div>
      </div>

      {rsvps.length === 0 ? (
        <p className="mt-10 text-petroleo/70">
          {total > 0
            ? "Essa página não existe nesse recorte."
            : "Nenhum RSVP com esse recorte."}
        </p>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto rounded-card border border-petroleo/10 bg-white/70">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-petroleo/10 font-mono text-xs uppercase tracking-wider text-petroleo/60">
                <tr>
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rsvps.map((r) => (
                  <tr key={r.id} className="border-b border-petroleo/5">
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatarDataAdmin(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-semibold">{r.nome}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`mailto:${r.email}`}
                        className="underline underline-offset-4 hover:text-petroleo/70"
                      >
                        {r.email}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/eventos/${r.event.slug}`}
                        target="_blank"
                        className="underline underline-offset-4 hover:text-petroleo/70"
                      >
                        {r.event.titulo} ↗
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {r.canceledAt ? (
                        <span className="font-mono text-xs uppercase text-petroleo/50">
                          cancelado
                        </span>
                      ) : r.status === "confirmado" ? (
                        "confirmado"
                      ) : (
                        "fila de espera"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacao
            total={total}
            pagina={pagina}
            href={(p) => href({ ...base, p })}
          />
        </>
      )}
    </>
  );
}
