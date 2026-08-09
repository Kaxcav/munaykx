import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BuscaIA from "@/components/BuscaIA";
import SeloAcolheIniciante from "@/components/SeloAcolheIniciante";
import { getCommunities, getCommunityFacets } from "@/lib/communities";
import { recortesComDado, tituloDoRecorte } from "@/lib/descoberta";
import { iaDisponivel } from "@/lib/ia";

export const metadata: Metadata = {
  title: "Comunidades",
  description:
    "Descubra comunidades esportivas e culturais de Brasília por modalidade e região.",
};

// A listagem depende do banco e dos filtros — nunca pré-renderizar no build.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  modalidade?: string;
  regiao?: string;
  /** `iniciantes=1` liga o filtro "acolhe iniciante". */
  iniciantes?: string;
  /** O que a busca por descrição entendeu — só pra mostrar de volta. */
  ia?: string;
  iaObs?: string;
}>;

function filtroHref(params: {
  modalidade?: string;
  regiao?: string;
  iniciantes?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params.modalidade) qs.set("modalidade", params.modalidade);
  if (params.regiao) qs.set("regiao", params.regiao);
  // Preserva o filtro de iniciantes ao trocar modalidade/região (senão trocar
  // de aba de modalidade jogaria fora a escolha "pra quem tá começando").
  if (params.iniciantes) qs.set("iniciantes", "1");
  const s = qs.toString();
  return s ? `/comunidades?${s}` : "/comunidades";
}

export default async function ComunidadesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { modalidade, regiao, iniciantes, ia, iaObs } = await searchParams;
  const soIniciantes = iniciantes === "1";
  const [comunidades, facets, recortes] = await Promise.all([
    getCommunities({ modalidade, regiao, acolheIniciante: soIniciantes }),
    getCommunityFacets(),
    recortesComDado(),
  ]);

  const temFiltro = Boolean(modalidade || regiao || soIniciantes);

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

        {iaDisponivel() && (
          <div className="mt-8 max-w-2xl">
            <BuscaIA
              exemplos={[
                "corrida de manhã em Taguatinga",
                "jiu jitsu perto do centro",
                "algo tranquilo pra começar",
              ]}
            />
          </div>
        )}

        {ia && (
          // Mostrar o que foi entendido é obrigatório, não enfeite: sem isso
          // a pessoa não sabe POR QUE está vendo esses resultados, e não tem
          // como corrigir se a interpretação errou.
          <div className="mt-6 max-w-2xl rounded-card border border-lime/50 bg-lime/10 p-4">
            <p className="text-sm font-semibold">{ia}</p>
            {iaObs && <p className="mt-1 text-sm text-petroleo/70">{iaObs}</p>}
            <Link
              href="/comunidades"
              className="mt-2 inline-block text-xs font-medium text-petroleo/60 underline underline-offset-4 hover:text-petroleo"
            >
              não era isso — limpar
            </Link>
          </div>
        )}

        <div className="mt-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Modalidade</span>
            <Link
              href={filtroHref({ regiao, iniciantes: soIniciantes })}
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
                href={filtroHref({ modalidade: m, regiao, iniciantes: soIniciantes })}
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
              href={filtroHref({ modalidade, iniciantes: soIniciantes })}
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
                href={filtroHref({ modalidade, regiao: r, iniciantes: soIniciantes })}
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

          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Pra quem tá começando</span>
            <Link
              href={filtroHref({ modalidade, regiao, iniciantes: !soIniciantes })}
              aria-pressed={soIniciantes}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                soIniciantes
                  ? "border-petroleo bg-petroleo text-areia"
                  : "border-petroleo/15 hover:border-petroleo/40"
              }`}
            >
              <span aria-hidden>🌱</span>
              Só as que acolhem iniciantes
            </Link>
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
                  {c.acolheIniciante && (
                    <SeloAcolheIniciante className="mt-3" />
                  )}
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
