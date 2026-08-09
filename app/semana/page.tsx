import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { eventosDaSemana, resumoVigente, DIAS_DA_JANELA } from "@/lib/ai/semana";
import { formatarDataEvento } from "@/lib/events";

/**
 * Dinâmica, não ISR — e a diferença importa aqui.
 *
 * A parte CARA (a chamada de IA) já está resolvida: o resumo é gerado uma vez
 * por semana e fica no banco. O que a página faz por request é uma query de
 * agenda, que é barata.
 *
 * Com ISR, um evento cadastrado hoje só apareceria nesta página quando o
 * cache expirasse — numa página cujo assunto é "o que acontece nos próximos
 * sete dias", defasagem é o defeito. Foi um teste que revelou isso: a lista
 * não atualizava depois de criar o evento.
 */
export const dynamic = "force-dynamic";

/**
 * `/semana` — A Semana em Brasília.
 *
 * Página de SEO com o que acontece nos próximos sete dias. É o oposto da
 * busca: em vez de responder a quem já sabe o que quer, mostra a cidade pra
 * quem nem sabia que tinha o que fazer.
 *
 * ── ESTADO VAZIO SAI NOINDEX ────────────────────────────────────────────
 *
 * Sem evento na janela, a página existe e explica — mas não entra no Google.
 * Publicar "esta semana não tem nada" é pagar SEO pra anunciar que a
 * plataforma está vazia, e é a mesma regra que `lib/descoberta.ts` já aplica
 * a recorte sem dado.
 */
export async function generateMetadata(): Promise<Metadata> {
  const eventos = await eventosDaSemana().catch(() => []);
  const vazia = eventos.length === 0;

  return {
    title: "A Semana em Brasília",
    description: vazia
      ? "O que acontece nas comunidades esportivas e culturais de Brasília nos próximos dias."
      : `${eventos.length} ${eventos.length === 1 ? "encontro" : "encontros"} nos próximos ${DIAS_DA_JANELA} dias nas comunidades de Brasília.`,
    ...(vazia ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function SemanaPage() {
  // Nunca derruba a página: banco fora do ar vira estado vazio, não erro.
  const [resumo, eventos] = await Promise.all([
    resumoVigente().catch(() => null),
    eventosDaSemana().catch(() => []),
  ]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-20">
        <p className="eyebrow">Curadoria</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
          A Semana em Brasília
        </h1>
        <p className="mt-3 text-petroleo/70">
          O que acontece nas comunidades nos próximos {DIAS_DA_JANELA} dias.
        </p>

        {eventos.length === 0 ? (
          <div className="mt-10 rounded-card border border-petroleo/15 bg-white/70 p-8">
            <p className="font-display text-lg font-bold">
              Nenhum encontro marcado para esta semana
            </p>
            <p className="mt-2 text-petroleo/70">
              A cidade não para — o que falta é estar mapeado aqui. Se você
              organiza algo, coloca no ar: leva menos de um minuto.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/comunidades"
                className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
              >
                Ver as comunidades
              </Link>
              <Link
                href="/#organizador"
                className="rounded-full border border-petroleo/20 px-6 py-3 text-sm font-semibold transition-colors hover:border-petroleo/50"
              >
                Eu que organizo
              </Link>
            </div>
          </div>
        ) : (
          <>
            {resumo ? (
              <section className="mt-10 rounded-card border border-petroleo/10 bg-white/70 p-7">
                {/* Texto da IA: renderizado pelo React, que escapa por
                    construção. `whitespace-pre-line` preserva as quebras do
                    post sem precisar de innerHTML. */}
                <p className="whitespace-pre-line text-lg leading-relaxed">
                  {resumo.texto}
                </p>
                <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-petroleo/45">
                  curadoria da semana · {resumo.eventos}{" "}
                  {resumo.eventos === 1 ? "encontro" : "encontros"}
                </p>
              </section>
            ) : null}

            <section className="mt-10">
              <p className="eyebrow mb-3">Os encontros, um a um</p>
              <ul className="grid gap-3">
                {eventos.map((e) => (
                  <li key={e.slug}>
                    <Link
                      href={`/eventos/${e.slug}`}
                      className="block rounded-card border border-petroleo/10 bg-white/70 p-5 transition-colors hover:border-petroleo/30"
                    >
                      <p className="font-mono text-xs uppercase tracking-[0.14em] text-petroleo/70">
                        {formatarDataEvento(e.startsAt)}
                      </p>
                      <p className="mt-1 font-display text-lg font-bold">
                        {e.titulo}
                      </p>
                      <p className="mt-1 text-sm text-petroleo/70">
                        {e.comunidade} · {e.regiao}
                        {e.local ? ` · ${e.local}` : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
