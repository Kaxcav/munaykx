import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCommunities } from "@/lib/communities";
import {
  acharRecorte,
  recortesComDado,
  tituloDoRecorte,
  type Recorte,
} from "@/lib/descoberta";
import { formatarDataEvento, getUpcomingEventsByCommunity } from "@/lib/events";
import { SITE_URL } from "@/lib/site";

// Recorte vem do banco a cada request: comunidade cadastrada pelo admin
// aparece na hora, sem esperar deploy.
export const dynamic = "force-dynamic";

type Params = Promise<{ recorte: string }>;

function descricao(r: Recorte): string {
  const onde = r.regiao ? `${r.regiao}, Brasília` : "Brasília";
  const o = r.modalidade ? `comunidades de ${r.modalidade}` : "comunidades";
  return `Encontre ${o} em ${onde}: horários, local e próximos treinos abertos. Inscrição gratuita pela MUNAY.`;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { recorte: slug } = await params;
  const recorte = await acharRecorte(slug).catch(() => null);
  if (!recorte) return { title: "Recorte não encontrado" };

  const titulo = tituloDoRecorte(recorte);
  return {
    title: titulo,
    description: descricao(recorte),
    alternates: { canonical: `${SITE_URL}/descobrir/${recorte.slug}` },
    // Regra 2 de lib/descoberta.ts: recorte só com conteúdo demo não vai
    // pro índice. A página funciona; o Google só não é convidado.
    robots:
      recorte.reais > 0
        ? undefined
        : { index: false, follow: true },
    openGraph: {
      title: `${titulo} · MUNAY`,
      description: descricao(recorte),
      url: `${SITE_URL}/descobrir/${recorte.slug}`,
    },
  };
}

export default async function DescobrirPage({ params }: { params: Params }) {
  const { recorte: slug } = await params;
  const recorte = await acharRecorte(slug);
  // Recorte sem dado é 404, não página vazia: 200 em página oca ensina o
  // robô que o site tem lixo.
  if (!recorte) notFound();

  const comunidades = await getCommunities({
    modalidade: recorte.modalidade,
    regiao: recorte.regiao,
  });

  // Próximos treinos abertos: é o que dá razão pra pessoa voltar, e o que
  // diferencia esta página de uma lista estática.
  const eventos = (
    await Promise.all(
      comunidades.map(async (c) => ({
        comunidade: c,
        proximos: await getUpcomingEventsByCommunity(c.id),
      })),
    )
  ).flatMap(({ comunidade, proximos }) =>
    proximos.map((e) => ({ evento: e, comunidade })),
  );
  eventos.sort((a, b) => a.evento.startsAt.getTime() - b.evento.startsAt.getTime());

  // Recortes irmãos: link interno é como o robô acha as outras páginas —
  // sem isto cada recorte vira ilha e não é rastreado.
  const todos = await recortesComDado();
  const irmaos = todos
    .filter((r) => r.slug !== recorte.slug)
    .filter((r) =>
      recorte.modalidade
        ? r.modalidade === recorte.modalidade || r.regiao === recorte.regiao
        : r.regiao === recorte.regiao || !r.regiao,
    )
    .slice(0, 12);

  const titulo = tituloDoRecorte(recorte);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-20">
        <Link
          href="/comunidades"
          className="font-mono text-xs uppercase tracking-[0.14em] text-petroleo/60 hover:text-petroleo"
        >
          ← Todas as comunidades
        </Link>

        <p className="eyebrow mb-3 mt-8">Descoberta</p>
        <h1 className="max-w-3xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          {titulo}
        </h1>
        <p className="mt-4 max-w-2xl text-petroleo/70">
          {comunidades.length === 1
            ? "1 comunidade mapeada"
            : `${comunidades.length} comunidades mapeadas`}
          {recorte.regiao ? ` em ${recorte.regiao}` : " em Brasília"}
          {eventos.length > 0 &&
            ` · ${eventos.length} ${eventos.length === 1 ? "treino aberto" : "treinos abertos"} com inscrição`}
          .
        </p>

        {comunidades.length > 0 && (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {comunidades.map((c) => (
              <Link
                key={c.id}
                href={`/comunidades/${c.slug}`}
                className="group rounded-card border border-petroleo/10 bg-white/70 p-6 transition-colors hover:border-petroleo/30"
              >
                <article>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-xl font-bold">{c.nome}</h2>
                    <span className="shrink-0 rounded-full border border-petroleo/15 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-petroleo/60">
                      {c.regiao}
                    </span>
                  </div>
                  {c.horarios && (
                    <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-petroleo/70">
                      {c.horarios}
                      {c.local ? ` — ${c.local}` : ""}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-petroleo/60">
                    {c.nivel ?? c.modalidade}
                  </p>
                </article>
              </Link>
            ))}
          </div>
        )}

        {eventos.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              Próximos treinos abertos
            </h2>
            <ul className="mt-6 divide-y divide-petroleo/10 rounded-card border border-petroleo/10 bg-white/70">
              {eventos.map(({ evento, comunidade }) => (
                <li key={evento.id}>
                  <Link
                    href={`/eventos/${evento.slug}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 py-5 transition-colors hover:bg-petroleo/5"
                  >
                    <span>
                      <span className="font-display text-lg font-bold">
                        {evento.titulo}
                      </span>
                      <span className="block text-sm text-petroleo/60">
                        {comunidade.nome}
                        {evento.local ? ` · ${evento.local}` : ""}
                      </span>
                    </span>
                    <span className="font-mono text-xs uppercase tracking-[0.14em] text-petroleo/70">
                      {formatarDataEvento(evento.startsAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {irmaos.length > 0 && (
          <section className="mt-16">
            <h2 className="eyebrow mb-4">Outros recortes</h2>
            <div className="flex flex-wrap gap-2">
              {irmaos.map((r) => (
                <Link
                  key={r.slug}
                  href={`/descobrir/${r.slug}`}
                  className="rounded-full border border-petroleo/15 px-4 py-1.5 text-sm font-medium transition-colors hover:border-petroleo/40"
                >
                  {tituloDoRecorte(r)}
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-16 max-w-xl rounded-card border border-petroleo/10 bg-white/70 p-6">
          <p className="font-display text-lg font-bold">
            Falta a sua comunidade aqui?
          </p>
          <p className="mt-2 text-sm text-petroleo/70">
            A MUNAY está mapeando Brasília comunidade por comunidade. Se você
            organiza treino{recorte.regiao ? ` em ${recorte.regiao}` : ""},
            cadastra — é gratuito.
          </p>
          <Link
            href="/#cadastro"
            className="mt-5 inline-block rounded-full bg-petroleo px-5 py-2.5 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
          >
            Cadastrar comunidade
          </Link>
        </div>

        {recorte.reais === 0 && (
          <p className="mt-10 font-mono text-xs text-petroleo/45">
            * Comunidades marcadas como exemplo são ilustrativas. As parceiras
            reais serão anunciadas no lançamento.
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
