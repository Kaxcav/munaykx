import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCommunityBySlug } from "@/lib/communities";

// Detalhe vem do banco a cada request — nada de pré-render no build.
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const comunidade = await getCommunityBySlug(slug).catch(() => null);
  if (!comunidade) return { title: "Comunidade não encontrada" };
  return {
    title: comunidade.nome,
    description: `${comunidade.nome} — ${comunidade.modalidade} · ${comunidade.regiao}, Brasília.`,
  };
}

export default async function ComunidadePage({ params }: { params: Params }) {
  const { slug } = await params;
  const c = await getCommunityBySlug(slug);
  if (!c) notFound();

  const detalhes: Array<{ rotulo: string; valor: string }> = [
    { rotulo: "Modalidade", valor: c.modalidade },
    { rotulo: "Região", valor: c.regiao },
    ...(c.horarios ? [{ rotulo: "Horários", valor: c.horarios }] : []),
    ...(c.local ? [{ rotulo: "Local", valor: c.local }] : []),
    ...(c.nivel ? [{ rotulo: "Nível", valor: c.nivel }] : []),
  ];

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

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <p className="eyebrow">{c.modalidade}</p>
          {c.demo && (
            <span className="rounded-full border border-petroleo/15 px-3 py-0.5 font-mono text-[11px] uppercase tracking-wider text-petroleo/50">
              exemplo
            </span>
          )}
        </div>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          {c.nome}
        </h1>

        {c.descricao && (
          <p className="mt-6 max-w-2xl text-lg text-petroleo/80">{c.descricao}</p>
        )}

        <dl className="mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
          {detalhes.map((d) => (
            <div
              key={d.rotulo}
              className="rounded-card border border-petroleo/10 bg-white/70 p-5"
            >
              <dt className="eyebrow">{d.rotulo}</dt>
              <dd className="mt-2 font-display text-lg font-bold">{d.valor}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-12">
          <Link
            href="/#cadastro"
            className="inline-block rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
          >
            Quero participar
          </Link>
          <p className="mt-3 max-w-md text-sm text-petroleo/60">
            Entra na lista de espera e a gente te conecta quando o app abrir.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
