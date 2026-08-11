import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sessaoAtual } from "@/lib/sessao";
import { agenda } from "@/lib/membership";
import { avisosDaAgenda, DIAS_FEED_AGENDA } from "@/lib/posts";
import CorpoAviso from "@/components/CorpoAviso";
import { Pagina } from "@/components/comum/Pagina";
import { Secao } from "@/components/comum/Secao";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatarDataEvento } from "@/lib/events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minha agenda",
  robots: { index: false, follow: false },
};

/**
 * `/agenda` — a página que justifica a story: "o que eu tenho essa semana".
 * Eventos futuros das comunidades seguidas ∪ RSVPs ativos, por data, marcando
 * onde já há inscrição. Vazia, convida a seguir — nunca tela em branco.
 */
export default async function AgendaPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const itens = await agenda(sessao.user.id);
  // Os avisos vêm ANTES dos eventos na página: "hoje o treino é no campo 2" é
  // inútil se a pessoa só ler depois de já ter saído de casa.
  const avisos = await avisosDaAgenda(sessao.user.id);

  return (
    <>
      <Header />
      <Pagina eyebrow="Sua conta" titulo="Minha agenda" className="max-w-3xl">
        {avisos.length > 0 && (
          <Secao titulo={`Avisos dos últimos ${DIAS_FEED_AGENDA} dias`}>
            <div className="grid gap-4">
              {avisos.map((a) => (
                // O `<article>` fica POR FORA do `<Card>`: a peça do DS é uma
                // `<div>` e não aceita trocar de tag, e perder o `<article>`
                // custaria a navegação por região do leitor de tela — que é o
                // que faz esta lista de avisos ser percorrível.
                <article key={a.id}>
                  <Card className="p-6">
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-foreground/70">
                      <Link
                        href={`/comunidades/${a.comunidade.slug}`}
                        className="underline underline-offset-4"
                      >
                        {a.comunidade.nome}
                      </Link>{" "}
                      ·{" "}
                      <time dateTime={a.createdAt.toISOString()}>
                        {a.createdAt.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </time>
                    </p>
                    <div className="mt-3">
                      <CorpoAviso corpo={a.corpo} />
                    </div>
                  </Card>
                </article>
              ))}
            </div>
          </Secao>
        )}

        {itens.length === 0 ? (
          <EstadoVazio
            titulo="Sua agenda está vazia — por enquanto"
            descricao="Siga comunidades e os próximos eventos delas aparecem aqui, junto com os eventos em que você já se inscreveu."
            acao={
              <Link href="/comunidades" className={buttonVariants()}>
                Explorar comunidades
              </Link>
            }
          />
        ) : (
          <ul className="mt-10 space-y-3">
            {itens.map((i) => (
              <li key={i.eventId}>
                <Card className="p-6">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-foreground/70">
                    {formatarDataEvento(i.startsAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/eventos/${i.slug}`}
                        className="font-display text-xl font-bold hover:text-foreground/70"
                      >
                        {i.titulo}
                      </Link>
                      <p className="mt-1 text-sm text-foreground/70">
                        <Link
                          href={`/comunidades/${i.comunidade.slug}`}
                          className="underline underline-offset-4"
                        >
                          {i.comunidade.nome}
                        </Link>
                      </p>
                    </div>
                    {/*
                      Pílula de estado, não de marca: quem já tem inscrição
                      recebe a borda cheia; quem só segue, a variante
                      rebaixada. É a mesma distinção de antes, agora dita pela
                      variante em vez de por duas listas de classe.
                    */}
                    <Badge
                      variant={i.inscrito ? "outline" : "secondary"}
                      className="shrink-0"
                    >
                      {i.inscrito ? "Inscrito ✓" : "Só seguindo"}
                    </Badge>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/minhas-comunidades"
          className="mt-12 inline-block font-mono text-xs uppercase tracking-[0.14em] text-foreground/60 hover:text-foreground"
        >
          ← Minhas comunidades
        </Link>
      </Pagina>
      <Footer />
    </>
  );
}
