import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatarDataAdmin } from "@/lib/admin";

const STATUS = ["confirmado", "lista_espera"] as const;

type SearchParams = Promise<{ status?: string; evento?: string }>;

function filtroHref(params: { status?: string; evento?: string }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.evento) qs.set("evento", params.evento);
  const s = qs.toString();
  return s ? `/admin/rsvps?${s}` : "/admin/rsvps";
}

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
  const evento = params.evento;

  const where: Prisma.RsvpWhereInput = {
    ...(status ? { status } : {}),
    ...(evento ? { event: { slug: evento } } : {}),
  };
  const [rsvps, total, eventos] = await Promise.all([
    prisma.rsvp.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { event: { select: { titulo: true, slug: true } } },
    }),
    prisma.rsvp.count({ where }),
    prisma.event.findMany({
      orderBy: { startsAt: "desc" },
      select: { slug: true, titulo: true },
    }),
  ]);

  const exportHref = `/admin/rsvps/export${filtroHref({ status, evento }).replace("/admin/rsvps", "")}`;

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
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Status</span>
          <Link href={filtroHref({ evento })} className={chip(!status)}>
            Todos
          </Link>
          {STATUS.map((s) => (
            <Link
              key={s}
              href={filtroHref({ status: s, evento })}
              className={chip(status === s)}
            >
              {s === "lista_espera" ? "fila de espera" : s}
            </Link>
          ))}
        </div>
        {eventos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Evento</span>
            <Link href={filtroHref({ status })} className={chip(!evento)}>
              Todos
            </Link>
            {eventos.map((e) => (
              <Link
                key={e.slug}
                href={filtroHref({ status, evento: e.slug })}
                className={chip(evento === e.slug)}
              >
                {e.titulo}
              </Link>
            ))}
          </div>
        )}
      </div>

      {rsvps.length === 0 ? (
        <p className="mt-10 text-petroleo/70">Nenhum RSVP com esse recorte.</p>
      ) : (
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
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3">{r.event.titulo}</td>
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
      )}
    </>
  );
}
