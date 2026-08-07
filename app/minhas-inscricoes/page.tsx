import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sessaoAtual } from "@/lib/sessao";
import { prisma } from "@/lib/db";
import { formatarDataEvento } from "@/lib/events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minhas inscrições",
  robots: { index: false, follow: false },
};

const BADGES = {
  confirmado: { rotulo: "Confirmada ✓", classe: "border-petroleo/20 bg-lime/30 text-petroleo" },
  lista_espera: { rotulo: "Lista de espera", classe: "border-petroleo/20 bg-white/70 text-petroleo" },
  cancelada: { rotulo: "Cancelada", classe: "border-petroleo/15 bg-white/50 text-petroleo/60" },
} as const;

export default async function MinhasInscricoesPage() {
  // Auth desligada cai aqui como "ninguém logado" e vai pro /entrar, que
  // explica a situação. Antes, lançava e virava 500.
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const inscricoes = await prisma.rsvp.findMany({
    where: { userId: sessao.user.id },
    include: { event: { include: { community: true } } },
    orderBy: { event: { startsAt: "asc" } },
  });

  const agora = new Date();
  const futuras = inscricoes.filter((r) => r.event.startsAt >= agora);
  const passadas = inscricoes.filter((r) => r.event.startsAt < agora);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-20">
        <p className="eyebrow">Sua conta</p>
        <h1 className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Minhas inscrições
        </h1>
        <p className="mt-4 max-w-xl text-petroleo/70">
          Tudo que você confirmou com o e-mail{" "}
          <strong>{sessao.user.email}</strong> — inclusive o que foi feito antes
          de você criar a conta.
        </p>

        {inscricoes.length === 0 ? (
          <div className="mt-12 max-w-xl rounded-card border border-petroleo/10 bg-white/70 p-8">
            <p className="font-display text-xl font-bold">
              Nenhuma inscrição por aqui ainda
            </p>
            <p className="mt-2 text-petroleo/70">
              Quando você confirmar presença em algum evento, ele aparece nesta
              lista automaticamente.
            </p>
            <Link
              href="/comunidades"
              className="mt-6 inline-block rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
            >
              Descobrir comunidades
            </Link>
          </div>
        ) : (
          <>
            <Secao titulo="Próximas" itens={futuras} vazio="Nada marcado no momento." />
            {passadas.length > 0 && (
              <Secao titulo="Já aconteceram" itens={passadas} vazio="" />
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

type ItemLista = Awaited<
  ReturnType<
    typeof prisma.rsvp.findMany<{
      include: { event: { include: { community: true } } };
    }>
  >
>[number];

function Secao({
  titulo,
  itens,
  vazio,
}: {
  titulo: string;
  itens: ItemLista[];
  vazio: string;
}) {
  return (
    <section className="mt-12">
      <h2 className="eyebrow mb-4">{titulo}</h2>
      {itens.length === 0 ? (
        vazio ? <p className="text-petroleo/60">{vazio}</p> : null
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {itens.map((r) => {
            const situacao =
              r.canceledAt !== null ? "cancelada" : (r.status as "confirmado" | "lista_espera");
            const badge = BADGES[situacao];
            return (
              <li
                key={r.id}
                className="rounded-card border border-petroleo/10 bg-white/70 p-6"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-display text-lg font-bold">{r.event.titulo}</p>
                  <span
                    className={`rounded-full border px-3 py-0.5 font-mono text-[11px] uppercase tracking-wider ${badge.classe}`}
                  >
                    {badge.rotulo}
                  </span>
                </div>
                <p className="mt-2 text-sm text-petroleo/70">
                  {formatarDataEvento(r.event.startsAt)} · {r.event.community.nome}
                </p>
                <Link
                  href={`/rsvp/${r.token}`}
                  className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
                >
                  Gerenciar inscrição
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
