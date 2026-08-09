import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sessaoAtual } from "@/lib/sessao";
import { agenda } from "@/lib/membership";
import { avisosDaAgenda, DIAS_FEED_AGENDA } from "@/lib/posts";
import CorpoAviso from "@/components/CorpoAviso";
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
      <main className="mx-auto max-w-3xl px-5 py-20">
        <p className="eyebrow">Sua conta</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Minha agenda
        </h1>

        {avisos.length > 0 && (
          <section className="mt-10">
            <p className="eyebrow mb-3">
              Avisos dos últimos {DIAS_FEED_AGENDA} dias
            </p>
            <div className="grid gap-4">
              {avisos.map((a) => (
                <article
                  key={a.id}
                  className="rounded-card border border-petroleo/10 bg-white/70 p-6"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-petroleo/70">
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
                </article>
              ))}
            </div>
          </section>
        )}

        {itens.length === 0 ? (
          <div className="mt-10 rounded-card border border-petroleo/15 bg-white/70 p-8">
            <p className="font-display text-lg font-bold">
              Sua agenda está vazia — por enquanto
            </p>
            <p className="mt-2 text-petroleo/70">
              Siga comunidades e os próximos eventos delas aparecem aqui, junto
              com os eventos em que você já se inscreveu.
            </p>
            <Link
              href="/comunidades"
              className="mt-5 inline-block rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
            >
              Explorar comunidades
            </Link>
          </div>
        ) : (
          <ul className="mt-10 space-y-3">
            {itens.map((i) => (
              <li
                key={i.eventId}
                className="rounded-card border border-petroleo/10 bg-white/70 p-6"
              >
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-petroleo/70">
                  {formatarDataEvento(i.startsAt)}
                </p>
                <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/eventos/${i.slug}`}
                      className="font-display text-xl font-bold hover:text-petroleo/70"
                    >
                      {i.titulo}
                    </Link>
                    <p className="mt-1 text-sm text-petroleo/70">
                      <Link
                        href={`/comunidades/${i.comunidade.slug}`}
                        className="underline underline-offset-4"
                      >
                        {i.comunidade.nome}
                      </Link>
                    </p>
                  </div>
                  <span
                    className={
                      i.inscrito
                        ? "shrink-0 rounded-full border border-petroleo/20 bg-white px-3 py-1 text-xs font-semibold"
                        : "shrink-0 rounded-full border border-petroleo/15 px-3 py-1 text-xs font-semibold text-petroleo/60"
                    }
                  >
                    {i.inscrito ? "Inscrito ✓" : "Só seguindo"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/minhas-comunidades"
          className="mt-12 inline-block font-mono text-xs uppercase tracking-[0.14em] text-petroleo/60 hover:text-petroleo"
        >
          ← Minhas comunidades
        </Link>
      </main>
      <Footer />
    </>
  );
}
