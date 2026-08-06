import Link from "next/link";
import { prisma } from "@/lib/db";

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
          className="rounded-full bg-petroleo px-5 py-2.5 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
        >
          + Nova comunidade
        </Link>
      </div>

      {comunidades.length === 0 ? (
        <p className="mt-10 text-petroleo/70">
          Nenhuma comunidade cadastrada ainda.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-card border border-petroleo/10 bg-white/70">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-petroleo/10 font-mono text-xs uppercase tracking-wider text-petroleo/60">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Modalidade</th>
                <th className="px-4 py-3">Região</th>
                <th className="px-4 py-3">Eventos</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {comunidades.map((c) => (
                <tr key={c.id} className="border-b border-petroleo/5">
                  <td className="px-4 py-3 font-semibold">
                    {c.nome}
                    <span className="block font-mono text-xs font-normal text-petroleo/50">
                      /{c.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.modalidade}</td>
                  <td className="px-4 py-3">{c.regiao}</td>
                  <td className="px-4 py-3">{c._count.events}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      {!c.ativo && (
                        <span className="rounded-full border border-petroleo/20 px-2 py-0.5 font-mono text-[11px] uppercase text-petroleo/60">
                          inativa
                        </span>
                      )}
                      {c.demo && (
                        <span className="rounded-full border border-coral/40 px-2 py-0.5 font-mono text-[11px] uppercase text-coral">
                          demo
                        </span>
                      )}
                      {c.ativo && !c.demo && (
                        <span className="rounded-full border border-petroleo/20 bg-petroleo px-2 py-0.5 font-mono text-[11px] uppercase text-areia">
                          no ar
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-3">
                      {/* Conferir o resultado sem sair do admin: o erro de
                          cadastro quase sempre só aparece na página pública. */}
                      {c.ativo && (
                        <Link
                          href={`/comunidades/${c.slug}`}
                          target="_blank"
                          className="text-petroleo/60 underline underline-offset-4 hover:text-petroleo"
                        >
                          Ver no site ↗
                        </Link>
                      )}
                      <Link
                        href={`/admin/comunidades/${c.id}`}
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
