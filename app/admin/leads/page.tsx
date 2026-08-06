import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatarDataAdmin } from "@/lib/admin";

const TIPOS = ["participante", "organizador"] as const;
const ORIGENS = ["site", "rsvp"] as const;

type SearchParams = Promise<{ tipo?: string; origem?: string }>;

function filtroHref(params: { tipo?: string; origem?: string }) {
  const qs = new URLSearchParams();
  if (params.tipo) qs.set("tipo", params.tipo);
  if (params.origem) qs.set("origem", params.origem);
  const s = qs.toString();
  return s ? `/admin/leads?${s}` : "/admin/leads";
}

const chip = (ativo: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    ativo
      ? "border-petroleo bg-petroleo text-areia"
      : "border-petroleo/15 hover:border-petroleo/40"
  }`;

/** Leads read-only: a métrica dos 500 do edital. Edição não existe de propósito. */
export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tipo = TIPOS.find((t) => t === params.tipo);
  const origem = ORIGENS.find((o) => o === params.origem);

  const where: Prisma.LeadWhereInput = {
    ...(tipo ? { tipo } : {}),
    ...(origem ? { origem } : {}),
  };
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.lead.count({ where }),
  ]);

  const exportHref = `/admin/leads/export${filtroHref({ tipo, origem }).replace("/admin/leads", "")}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Operação</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Leads <span className="text-petroleo/40">({total})</span>
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
          <span className="eyebrow mr-1">Tipo</span>
          <Link href={filtroHref({ origem })} className={chip(!tipo)}>
            Todos
          </Link>
          {TIPOS.map((t) => (
            <Link
              key={t}
              href={filtroHref({ tipo: t, origem })}
              className={chip(tipo === t)}
            >
              {t}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Origem</span>
          <Link href={filtroHref({ tipo })} className={chip(!origem)}>
            Todas
          </Link>
          {ORIGENS.map((o) => (
            <Link
              key={o}
              href={filtroHref({ tipo, origem: o })}
              className={chip(origem === o)}
            >
              {o}
            </Link>
          ))}
        </div>
      </div>

      {leads.length === 0 ? (
        <p className="mt-10 text-petroleo/70">Nenhum lead com esse recorte.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-card border border-petroleo/10 bg-white/70">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-petroleo/10 font-mono text-xs uppercase tracking-wider text-petroleo/60">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Interesses</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-petroleo/5">
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatarDataAdmin(l.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-semibold">{l.nome}</td>
                  <td className="px-4 py-3">{l.email}</td>
                  <td className="px-4 py-3">{l.whatsapp ?? "—"}</td>
                  <td className="px-4 py-3">{l.tipo}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.origem}</td>
                  <td className="px-4 py-3 text-petroleo/70">
                    {[l.modalidades, l.regiao, l.organizacao, l.modalidade]
                      .filter(Boolean)
                      .join(" · ") || "—"}
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
