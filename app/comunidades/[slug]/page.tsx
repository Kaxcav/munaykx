import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Pagina } from "@/components/comum/Pagina";
import { Secao } from "@/components/comum/Secao";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getCommunityBySlug } from "@/lib/communities";
import {
  formatarDataEvento,
  getUpcomingEventsByCommunity,
} from "@/lib/events";
import { sessaoAtual } from "@/lib/sessao";
import { segue, seguir } from "@/lib/membership";
import { avisosDaComunidade } from "@/lib/posts";
import FeedAvisos from "@/components/FeedAvisos";
import SeloAcolheIniciante from "@/components/SeloAcolheIniciante";
import GuiaIniciantePublico from "@/components/GuiaIniciantePublico";
import CompartilharBotoes from "@/components/CompartilharBotoes";
import { textoCompartilharComunidade, urlComunidade } from "@/lib/compartilhar";
import { seguirAction, deixarDeSeguirAction } from "./seguir-actions";

// Detalhe vem do banco a cada request — nada de pré-render no build.
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ avisos?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const comunidade = await getCommunityBySlug(slug).catch(() => null);
  if (!comunidade) return { title: "Comunidade não encontrada" };

  // Página 2+ do feed sai NOINDEX (STORY-010, decisão 7). Aviso é conteúdo
  // curto, situacional e efêmero — indexar isso em massa é o padrão que
  // derruba domínio, o mesmo motivo pelo qual `lib/descoberta.ts` recusa
  // recorte sem dado. A página 1 continua indexável: ela é a comunidade.
  const { avisos } = await searchParams;
  const paginado = Number(avisos ?? "1") > 1;

  const descricao = `${comunidade.nome} — ${comunidade.modalidade} · ${comunidade.regiao}, Brasília.`;
  // openGraph/twitter EXPLÍCITOS pelo mesmo motivo do evento: o layout raiz fixa
  // um og:title genérico, então sem isto o preview do link mostraria a marca e não
  // a comunidade. A imagem já vem do `opengraph-image.tsx` (não muda aqui).
  return {
    title: comunidade.nome,
    description: descricao,
    openGraph: { title: comunidade.nome, description: descricao, type: "profile" },
    twitter: { title: comunidade.nome, description: descricao },
    ...(paginado ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ComunidadePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ seguir?: string; avisos?: string }>;
}) {
  const { slug } = await params;
  const c = await getCommunityBySlug(slug);
  if (!c) notFound();

  const sessao = await sessaoAtual();
  const { seguir: querSeguir, avisos: paginaAvisos } = await searchParams;
  // Continuação pós-login: voltou do /entrar com ?seguir=1 → completa e limpa
  // a query (one-shot; `seguir` é idempotente).
  if (sessao && querSeguir === "1") {
    await seguir(sessao.user.id, c.id);
    redirect(`/comunidades/${slug}`);
  }
  const jaSegue = sessao ? await segue(sessao.user.id, c.id) : false;

  const eventos = await getUpcomingEventsByCommunity(c.id);
  const feed = await avisosDaComunidade(c.id, {
    pagina: Number(paginaAvisos ?? "1") || 1,
  });

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
      <Pagina
        voltar={{ href: "/comunidades", texto: "Todas as comunidades" }}
        // O eyebrow desta tela não é etiqueta fixa: é a modalidade, e quando
        // o conteúdo é ilustrativo vem o selo "exemplo" junto (regra 3).
        eyebrow={
          <>
            {c.modalidade}
            {c.demo && <Badge variant="outline">exemplo</Badge>}
          </>
        }
        titulo={c.nome}
        tamanho="grande"
      >
        {c.acolheIniciante && <SeloAcolheIniciante className="mt-4" />}

        <div className="mt-6">
          {jaSegue ? (
            <form
              action={deixarDeSeguirAction}
              className="inline-flex flex-wrap items-center gap-3"
            >
              <input type="hidden" name="slug" value={c.slug} />
              <Badge variant="secondary" className="px-4 py-2 font-sans text-sm normal-case tracking-normal">
                Seguindo ✓
              </Badge>
              <Button variant="link" type="submit" className="h-auto p-0 text-foreground/60 hover:text-foreground">
                Deixar de seguir
              </Button>
            </form>
          ) : (
            <form action={seguirAction}>
              <input type="hidden" name="slug" value={c.slug} />
              <Button type="submit">Seguir comunidade</Button>
            </form>
          )}
          <p className="mt-2 text-xs text-foreground/50">
            Seguindo, esta comunidade entra na sua{" "}
            <Link href="/agenda" className="underline underline-offset-4">
              agenda
            </Link>{" "}
            e você é avisado de eventos novos.
          </p>
        </div>

        <CompartilharBotoes
          className="mt-6"
          url={urlComunidade(c.slug)}
          texto={textoCompartilharComunidade(c)}
          titulo={c.nome}
        />

        {c.descricao && (
          <p className="mt-6 max-w-2xl text-lg text-foreground/80">{c.descricao}</p>
        )}

        <GuiaIniciantePublico guia={c.guiaIniciante} acolheIniciante={c.acolheIniciante} />

        <dl className="mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
          {detalhes.map((d) => (
            <Card key={d.rotulo} className="p-5">
              <dt className="eyebrow">{d.rotulo}</dt>
              <dd className="mt-2 font-display text-lg font-bold">{d.valor}</dd>
            </Card>
          ))}
        </dl>

        {eventos.length > 0 && (
          <Secao titulo="Próximos eventos" className="max-w-3xl">
            <div className="grid gap-5">
              {eventos.map((e) => (
                <Link key={e.id} href={`/eventos/${e.slug}`} className="group block">
                  <Card className="p-6 transition-colors hover:border-primary/30">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="font-display text-xl font-bold">
                        {e.titulo}
                      </h2>
                      {e.gratuito && (
                        <Badge variant="outline" className="shrink-0">
                          Gratuito
                        </Badge>
                      )}
                    </div>
                    <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-foreground/70">
                      {formatarDataEvento(e.startsAt)}
                      {e.local ? ` — ${e.local}` : ""}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-foreground/70 group-hover:text-foreground">
                      Confirmar presença →
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </Secao>
        )}

        <FeedAvisos
          avisos={feed.avisos}
          slug={c.slug}
          pagina={feed.pagina}
          temMais={feed.temMais}
        />

        <div className="mt-12">
          <Link href="/#cadastro" className={buttonVariants()}>
            Quero participar
          </Link>
          <p className="mt-3 max-w-md text-sm text-foreground/60">
            Entra na lista de espera e a gente te conecta quando o app abrir.
          </p>
        </div>
      </Pagina>
      <Footer />
    </>
  );
}
