import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Pagina } from "@/components/comum/Pagina";
import { Secao } from "@/components/comum/Secao";
import { CardComunidade } from "@/components/comum/CardComunidade";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { buttonVariants } from "@/components/ui/button";
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
      <Pagina
        voltar={{ href: "/comunidades", texto: "Todas as comunidades" }}
        eyebrow="Descoberta"
        titulo={titulo}
        descricao={
          <>
            {comunidades.length === 1
              ? "1 comunidade mapeada"
              : `${comunidades.length} comunidades mapeadas`}
            {recorte.regiao ? ` em ${recorte.regiao}` : " em Brasília"}
            {eventos.length > 0 &&
              ` · ${eventos.length} ${eventos.length === 1 ? "treino aberto" : "treinos abertos"} com inscrição`}
            .
          </>
        }
      >
        {comunidades.length > 0 && (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {comunidades.map((c) => (
              // O selo "acolhe iniciantes" passa a aparecer aqui também.
              // Não é feature nova: a `/comunidades` já mostrava, e esta
              // tela não — porque o card estava duplicado e as duas cópias
              // divergiram. Uma peça só, então a informação é a mesma nas
              // duas portas de entrada.
              <CardComunidade
                key={c.id}
                slug={c.slug}
                nome={c.nome}
                regiao={c.regiao}
                modalidade={c.modalidade}
                nivel={c.nivel}
                horarios={c.horarios}
                local={c.local}
                acolheIniciante={c.acolheIniciante}
              />
            ))}
          </div>
        )}

        {eventos.length > 0 && (
          <Secao titulo="Próximos treinos abertos" destaque>
            <Card className="overflow-hidden">
              <ul className="divide-y divide-border">
                {eventos.map(({ evento, comunidade }) => (
                  <li key={evento.id}>
                    <Link
                      href={`/eventos/${evento.slug}`}
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 py-5 transition-colors hover:bg-primary/5"
                    >
                      <span>
                        <span className="font-display text-lg font-bold">
                          {evento.titulo}
                        </span>
                        <span className="block text-sm text-foreground/60">
                          {comunidade.nome}
                          {evento.local ? ` · ${evento.local}` : ""}
                        </span>
                      </span>
                      <span className="font-mono text-xs uppercase tracking-[0.14em] text-foreground/70">
                        {formatarDataEvento(evento.startsAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </Secao>
        )}

        {irmaos.length > 0 && (
          <Secao titulo="Outros recortes">
            <div className="flex flex-wrap gap-2">
              {irmaos.map((r) => (
                <Chip key={r.slug} href={`/descobrir/${r.slug}`}>
                  {tituloDoRecorte(r)}
                </Chip>
              ))}
            </div>
          </Secao>
        )}

        <Card className="mt-16 max-w-xl p-6">
          <p className="font-display text-lg font-bold">
            Falta a sua comunidade aqui?
          </p>
          <p className="mt-2 text-sm text-foreground/70">
            A MUNAY está mapeando Brasília comunidade por comunidade. Se você
            organiza treino{recorte.regiao ? ` em ${recorte.regiao}` : ""},
            cadastra — é gratuito.
          </p>
          <Link
            href="/#cadastro"
            className={buttonVariants({ size: "sm", className: "mt-5" })}
          >
            Cadastrar comunidade
          </Link>
        </Card>

        {recorte.reais === 0 && (
          <p className="mt-10 font-mono text-xs text-foreground/45">
            * Comunidades marcadas como exemplo são ilustrativas. As parceiras
            reais serão anunciadas no lançamento.
          </p>
        )}
      </Pagina>
      <Footer />
    </>
  );
}
