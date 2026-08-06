import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCommunities, getCommunityFacets } from "@/lib/communities";
import { recortesComDado, tituloDoRecorte } from "@/lib/descoberta";

export const metadata: Metadata = {
  title: "Comunidades",
  description:
    "Descubra comunidades esportivas e culturais de Brasília por modalidade e região.",
};

// A listagem depende do banco e dos filtros — nunca pré-renderizar no build.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ modalidade?: string; regiao?: string }>;

function filtroHref(params: { modalidade?: string; regiao?: string }) {
  const qs = new URLSearchParams();
  if (params.modalidade) qs.set("modalidade", params.modalidade);
  if (params.regiao) qs.set("regiao", params.regiao);
  const s = qs.toString();
  return s ? `/comunidades?${s}` : "/comunidades";
}

export default async function ComunidadesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { modalidade, regiao } = await searchParams;
  const [comunidades, facets, recortes] = await Promise.all([
    getCommunities({ modalidade, regiao }),
    getCommunityFacets(),
    recortesComDado(),
  ]);

  const temFiltro = Boolean(modalidade || regiao);

  // O filtro aqui vive em querystring — o Google indexa isso mal e nunca com
  // um título que case com "corrida em Ceilândia". Quando o recorte atual
  // tem página própria em /descobrir, oferecemos o link: vira URL limpa,
  // compartilhável e rastreável.
  const paginaDoRecorte = temFiltro
    ? recortes.find((r) => r.modalidade === modalidade && r.regiao === regiao)
    : undefined;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-20">
        <p className="eyebrow mb-3">Descoberta</p>
        <h1 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Comunidades de Brasília, filtradas do seu jeito.
        </h1>

        <div className="mt-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Modalidade</span>
            <Link
              href={filtroHref({ regiao })}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                !modalidade
                  ? "border-petroleo bg-petroleo text-areia"
                  : "border-petroleo/15 hover:border-petroleo/40"
              }`}
            >
              Todas
            </Link>
            {facets.modalidades.map((m) => (
              <Link
                key={m}
                href={filtroHref({ modalidade: m, regiao })}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  modalidade === m
                    ? "border-petroleo bg-petroleo text-areia"
                    : "border-petroleo/15 hover:border-petroleo/40"
                }`}
              >
                {m}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Região</span>
            <Link
              href={filtroHref({ modalidade })}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                !regiao
                  ? "border-petroleo bg-petroleo text-areia"
                  : "border-petroleo/15 hover:border-petroleo/40"
              }`}
            >
              Todas
            </Link>
            {facets.regioes.map((r) => (
              <Link
                key={r}
                href={filtroHref({ modalidade, regiao: r })}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  regiao === r
                    ? "border-petroleo bg-petroleo text-areia"
                    : "border-petroleo/15 hover:border-petroleo/40"
                }`}
              >
                {r}
              </Link>
            ))}
          </div>
        </div>

        {comunidades.length === 0 ? (
          <div className="mt-16 max-w-xl">
            <p className="font-display text-xl font-bold">
              Nada por aqui com esse recorte — ainda.
            </p>
            <p className="mt-3 text-petroleo/70">
              Brasília é grande e a MUNAY está mapeando comunidade por
              comunidade. Tira um filtro pra ampliar a busca, ou{" "}
              <Link href="/#cadastro" className="underline underline-offset-4">
                entra na lista de espera
              </Link>{" "}
              que a gente avisa quando algo abrir na sua região.
            </p>
            {temFiltro && (
              <Link
                href="/comunidades"
                className="mt-6 inline-block rounded-full bg-petroleo px-5 py-2.5 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
              >
                Limpar filtros
              </Link>
            )}
          </div>
        ) : (
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

        {paginaDoRecorte && (
          <p className="mt-10">
            <Link
              href={`/descobrir/${paginaDoRecorte.slug}`}
              className="text-sm font-semibold underline underline-offset-4 hover:text-petroleo/70"
            >
              Ver a página de {tituloDoRecorte(paginaDoRecorte).toLowerCase()} →
            </Link>
          </p>
        )}

        {recortes.length > 0 && (
          <section className="mt-16 border-t border-petroleo/10 pt-10">
            <h2 className="eyebrow mb-4">Buscas frequentes</h2>
            <div className="flex flex-wrap gap-2">
              {recortes.map((r) => (
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

        <p className="mt-10 font-mono text-xs text-petroleo/45">
          * Comunidades marcadas como exemplo são ilustrativas. As parceiras
          reais serão anunciadas no lançamento.
        </p>
      </main>
      <Footer />
    </>
  );
}
