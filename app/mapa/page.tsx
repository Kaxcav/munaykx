import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MapaDF } from "@/components/MapaDF";
import { EixoDeTempo } from "@/components/EixoDeTempo";
import MapaTelaCheia from "@/components/MapaTelaCheia";
import { regioesNoMapa, mapaIndexavel, type RegiaoNoMapa } from "@/lib/mapa";
import { matrizTemporal, temEixoDeTempo } from "@/lib/horarios";
import { mapaTilesUrl } from "@/lib/mapa-geo";

/**
 * `/mapa` — onde o movimento já chegou no DF, e onde ainda não chegou.
 *
 * Dinâmico de propósito: comunidade cadastrada pelo `/admin` tem que
 * aparecer aqui na hora, não no próximo push de código (mesmo motivo do
 * `force-dynamic` do sitemap).
 *
 * `cache()` do React: `generateMetadata` e a página precisam do mesmo dado,
 * e sem isso seriam duas consultas por visita pra responder a mesma
 * pergunta.
 */
export const dynamic = "force-dynamic";

const carregar = cache(() => regioesNoMapa());

export async function generateMetadata(): Promise<Metadata> {
  const regioes = await carregar();
  return {
    title: "Mapa das comunidades no DF",
    description:
      "Onde tem gente se movimentando em Brasília, por região administrativa — e onde a MUNAY ainda não chegou.",
    alternates: { canonical: "/mapa" },
    // Enquanto só houver conteúdo ilustrativo, o mapa não entra no Google:
    // publicar cobertura que não existe é afirmação pública falsa (regra 3).
    robots: mapaIndexavel(regioes) ? undefined : { index: false, follow: true },
  };
}

export default async function MapaPage() {
  const regioes = await carregar();
  const matriz = await matrizTemporal();
  const temEixo = temEixoDeTempo(matriz);
  // Mapa REAL só quando o dono setou a URL dos tiles (runtime, sem rebuild).
  // Ativo → experiência TELA CHEIA (mapa full-bleed + UI flutuante), sem a nav
  // padrão. Sem a env → cai no layout normal com o esquemático, idêntico a hoje.
  const tilesUrl = mapaTilesUrl();
  if (tilesUrl) {
    return <MapaTelaCheia tilesUrl={tilesUrl} regioes={regioes} />;
  }

  const comDado = regioes.filter((r) => r.estado !== "vazio");
  const vazias = regioes.filter((r) => r.estado === "vazio");
  const reais = regioes.filter((r) => r.estado === "real").length;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-20">
        <p className="eyebrow">Descoberta</p>
        <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
          O movimento de Brasília, região por região
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-petroleo/70">
          As 35 regiões administrativas do DF. Onde o círculo está cheio, já
          tem comunidade cadastrada. Onde é só um ponto, ainda não tem
          ninguém — e é exatamente aí que a MUNAY precisa chegar.
        </p>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div>
            {/* Aqui já sabemos que MAPA_TILES_URL está vazia (o mapa real deu
                early-return em tela cheia lá em cima). Então este é o layout
                normal com o esquemático — idêntico ao de antes desta frente. */}
            {temEixo ? (
              <EixoDeTempo regioes={regioes} matriz={matriz} />
            ) : (
              <MapaDF regioes={regioes} />
            )}
            <p className="mt-4 max-w-xl font-mono text-xs leading-relaxed text-petroleo/50">
              Esquema, não mapa cartográfico: as posições são aproximadas e
              servem pra reconhecer a cidade, não pra chegar em lugar nenhum.
            </p>
          </div>

          <aside className="space-y-10">
            <Legenda reais={reais} total={comDado.length} />
            <ListaDeRegioes itens={comDado} />
            {vazias.length > 0 && (
              <section>
                <h2 className="eyebrow">Ainda sem ninguém</h2>
                <p className="mt-3 text-sm leading-relaxed text-petroleo/55">
                  {vazias.map((r) => r.regiao).join(" · ")}
                </p>
              </section>
            )}
          </aside>
        </div>

        <div className="mt-16 border-t border-petroleo/10 pt-8">
          <p className="max-w-xl text-petroleo/70">
            Organiza algo numa dessas regiões?{" "}
            <Link
              href="/#organizador"
              className="font-semibold underline underline-offset-4 hover:opacity-70"
            >
              coloca no mapa
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Legenda({ reais, total }: { reais: number; total: number }) {
  return (
    <section>
      <h2 className="eyebrow">Como ler</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-petroleo" />
          <div>
            <dt className="font-semibold">Comunidade cadastrada</dt>
            <dd className="text-petroleo/60">
              {reais === 0
                ? "nenhuma região ainda"
                : `${reais} ${reais === 1 ? "região" : "regiões"}`}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-1 h-3 w-3 shrink-0 rounded-full border border-dashed border-petroleo/60" />
          <div>
            <dt className="font-semibold">Exemplo ilustrativo</dt>
            <dd className="text-petroleo/60">
              conteúdo de demonstração, não é parceria firmada
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-petroleo/20" />
          <div>
            <dt className="font-semibold">Sem nada ainda</dt>
            <dd className="text-petroleo/60">
              {35 - total} de 35 regiões
            </dd>
          </div>
        </div>
      </dl>
    </section>
  );
}

/**
 * A mesma informação do SVG, em texto e com os mesmos links.
 *
 * Não é enfeite de acessibilidade: é o caminho de quem usa leitor de tela,
 * de quem está no celular (onde 35 alvos de toque num SVG não funcionam) e
 * do robô de busca, que segue link de lista muito melhor do que link
 * dentro de gráfico.
 */
function ListaDeRegioes({ itens }: { itens: RegiaoNoMapa[] }) {
  if (itens.length === 0) {
    return (
      <section>
        <h2 className="eyebrow">Com comunidade</h2>
        <p className="mt-3 text-sm text-petroleo/60">
          Nenhuma região cadastrada ainda. O mapa está inteiro em aberto.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="eyebrow">Com comunidade</h2>
      <ul className="mt-4 space-y-1">
        {itens.map((r) => (
          <li key={r.regiao}>
            <Link
              href={`/descobrir/${r.slug}`}
              className="group flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-petroleo hover:text-areia"
            >
              <span className="font-medium">
                {r.regiao}
                {r.estado === "exemplo" && (
                  <span className="ml-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-petroleo/45 group-hover:text-areia/60">
                    exemplo
                  </span>
                )}
              </span>
              <span className="shrink-0 font-mono text-xs text-petroleo/50 group-hover:text-areia/70">
                {r.total}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
