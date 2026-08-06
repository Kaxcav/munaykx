import Link from "next/link";
import { prisma } from "@/lib/db";

/** Dashboard de operação: os números que o time consulta toda semana. */
export default async function AdminDashboardPage() {
  const [
    comunidadesAtivas,
    eventosFuturos,
    leadsPorTipo,
    rsvpsPorStatus,
  ] = await Promise.all([
    prisma.community.count({ where: { ativo: true } }),
    prisma.event.count({
      where: { ativo: true, startsAt: { gte: new Date() } },
    }),
    prisma.lead.groupBy({ by: ["tipo"], _count: { _all: true } }),
    prisma.rsvp.groupBy({
      by: ["status"],
      where: { canceledAt: null },
      _count: { _all: true },
    }),
  ]);

  const leads = Object.fromEntries(
    leadsPorTipo.map((l) => [l.tipo, l._count._all]),
  );
  const rsvps = Object.fromEntries(
    rsvpsPorStatus.map((r) => [r.status, r._count._all]),
  );
  const totalLeads = (leads.participante ?? 0) + (leads.organizador ?? 0);

  const cards = [
    {
      label: "Comunidades ativas",
      valor: comunidadesAtivas,
      href: "/admin/comunidades",
    },
    { label: "Eventos futuros", valor: eventosFuturos, href: "/admin/eventos" },
    { label: "Leads (total)", valor: totalLeads, href: "/admin/leads" },
    {
      label: "Leads participantes",
      valor: leads.participante ?? 0,
      href: "/admin/leads?tipo=participante",
    },
    {
      label: "Leads organizadores",
      valor: leads.organizador ?? 0,
      href: "/admin/leads?tipo=organizador",
    },
    {
      label: "RSVPs confirmados",
      valor: rsvps.confirmado ?? 0,
      href: "/admin/rsvps?status=confirmado",
    },
    {
      label: "RSVPs em fila",
      valor: rsvps.lista_espera ?? 0,
      href: "/admin/rsvps?status=lista_espera",
    },
  ];

  return (
    <>
      <p className="eyebrow mb-3">Operação</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Dashboard
      </h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-card border border-petroleo/10 bg-white/70 p-6 transition-colors hover:border-petroleo/30"
          >
            <p className="font-mono text-xs uppercase tracking-wider text-petroleo/60">
              {card.label}
            </p>
            <p className="mt-2 font-display text-4xl font-extrabold">
              {card.valor}
            </p>
          </Link>
        ))}
      </div>
      <p className="mt-8 font-mono text-xs text-petroleo/45">
        Leads é a métrica dos 500 do edital. Contagens direto do banco, sem
        cache.
      </p>
    </>
  );
}
