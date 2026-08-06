import Link from "next/link";
import { prisma } from "@/lib/db";
import { desdeQuando } from "@/lib/admin-lista";
import { statusEmail } from "@/lib/email";

/** Dashboard de operação: os números que o time consulta toda semana. */
export default async function AdminDashboardPage() {
  // Recorte de 7 dias: o número que responde "estamos crescendo ou parou?".
  // O total sozinho não responde isso — ele só sobe.
  const seteDias = desdeQuando("7") as Date;

  const [
    comunidadesAtivas,
    eventosFuturos,
    leadsPorTipo,
    rsvpsPorStatus,
    leadsSemana,
    rsvpsSemana,
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
    prisma.lead.count({ where: { createdAt: { gte: seteDias } } }),
    prisma.rsvp.count({
      where: { createdAt: { gte: seteDias }, canceledAt: null },
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
      label: "Leads (total)",
      valor: totalLeads,
      href: "/admin/leads",
      destaque: true,
      nota: `meta do edital: 500`,
    },
    {
      label: "Leads · últimos 7 dias",
      valor: leadsSemana,
      href: "/admin/leads?periodo=7",
      destaque: true,
      nota: leadsSemana === 0 ? "nenhum cadastro nesta semana" : undefined,
    },
    {
      label: "RSVPs · últimos 7 dias",
      valor: rsvpsSemana,
      href: "/admin/rsvps?periodo=7",
    },
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
    {
      label: "Comunidades ativas",
      valor: comunidadesAtivas,
      href: "/admin/comunidades",
    },
    { label: "Eventos futuros", valor: eventosFuturos, href: "/admin/eventos" },
  ];

  // Estado do e-mail em cima, não no log: "modo teste" é justamente o que
  // parece funcionando e não está.
  const email = statusEmail();

  return (
    <>
      <p className="eyebrow mb-3">Operação</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Dashboard
      </h1>

      {email.modo !== "producao" && (
        <div
          className={`mt-8 rounded-card border p-5 ${
            email.modo === "teste"
              ? "border-coral/40 bg-coral/5"
              : "border-petroleo/15 bg-white/70"
          }`}
        >
          <p className="font-display text-sm font-bold">
            {email.modo === "teste"
              ? "E-mail em modo teste — participante real NÃO recebe"
              : "E-mail desligado"}
          </p>
          <p className="mt-1 text-sm text-petroleo/70">{email.detalhe}</p>
          <p className="mt-2 font-mono text-[11px] text-petroleo/50">
            Enquanto isso, a inscrição funciona normal e o site não promete
            aviso por e-mail em lugar nenhum.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-card border bg-white/70 p-6 transition-colors ${
              card.destaque
                ? "border-petroleo/30 hover:border-petroleo"
                : "border-petroleo/10 hover:border-petroleo/30"
            }`}
          >
            <p className="font-mono text-xs uppercase tracking-wider text-petroleo/60">
              {card.label}
            </p>
            <p className="mt-2 font-display text-4xl font-extrabold">
              {card.valor}
            </p>
            {card.nota && (
              <p className="mt-1 font-mono text-[11px] text-petroleo/45">
                {card.nota}
              </p>
            )}
          </Link>
        ))}
      </div>
      <p className="mt-8 font-mono text-xs text-petroleo/45">
        Leads é a métrica dos 500 do edital. Contagens direto do banco, sem
        cache. Os recortes de 7 dias contam a partir de agora, não do domingo.
      </p>
    </>
  );
}
