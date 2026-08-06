import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatarDataAdmin } from "@/lib/admin";

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
          className="rounded-full bg-petroleo px-5 py-2.5 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
        >
          + Novo evento
        </Link>
      </div>

      {eventos.length === 0 ? (
        <p className="mt-10 text-petroleo/70">Nenhum evento cadastrado ainda.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-card border border-petroleo/10 bg-white/70">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-petroleo/10 font-mono text-xs uppercase tracking-wider text-petroleo/60">
              <tr>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Comunidade</th>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Confirmados</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id} className="border-b border-petroleo/5">
                  <td className="px-4 py-3 font-semibold">
                    {e.titulo}
                    <span className="block font-mono text-xs font-normal text-petroleo/50">
                      /{e.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3">{e.community.nome}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatarDataAdmin(e.startsAt)}
                    {e.startsAt < agora && (
                      <span className="block text-petroleo/50">passado</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/rsvps?evento=${e.slug}`}
                      className="underline underline-offset-4 hover:text-petroleo/70"
                    >
                      {e._count.rsvps}
                      {e.capacidade != null ? ` / ${e.capacidade}` : ""}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      {!e.ativo && (
                        <span className="rounded-full border border-petroleo/20 px-2 py-0.5 font-mono text-[11px] uppercase text-petroleo/60">
                          inativo
                        </span>
                      )}
                      {e.demo && (
                        <span className="rounded-full border border-coral/40 px-2 py-0.5 font-mono text-[11px] uppercase text-coral">
                          demo
                        </span>
                      )}
                      {e.ativo && !e.demo && (
                        <span className="rounded-full border border-petroleo/20 bg-petroleo px-2 py-0.5 font-mono text-[11px] uppercase text-areia">
                          no ar
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-3">
                      {e.ativo && (
                        <Link
                          href={`/eventos/${e.slug}`}
                          target="_blank"
                          className="text-petroleo/60 underline underline-offset-4 hover:text-petroleo"
                        >
                          Ver no site ↗
                        </Link>
                      )}
                      <Link
                        href={`/admin/eventos/${e.id}`}
                        className="font-semibold underline underline-offset-4 hover:text-petroleo/70"
                      >
                        Editar
                      </Link>
                    </span>
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
