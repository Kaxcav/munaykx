import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadesDeUsuario } from "@/lib/membership";
import { formatarDataEvento } from "@/lib/events";
import { alternarAvisoAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minhas comunidades",
  robots: { index: false, follow: false },
};

/** `/minhas-comunidades` — o que a pessoa segue, com o próximo evento de cada
 *  e o toggle de aviso por e-mail por comunidade (opt-out, decisão 5). */
export default async function MinhasComunidadesPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const lista = await comunidadesDeUsuario(sessao.user.id);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-20">
        <p className="eyebrow">Sua conta</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Minhas comunidades
        </h1>

        {lista.length === 0 ? (
          <div className="mt-10 rounded-card border border-petroleo/15 bg-white/70 p-8">
            <p className="font-display text-lg font-bold">
              Você ainda não segue nenhuma comunidade
            </p>
            <p className="mt-2 text-petroleo/70">
              Seguir é o que monta a sua <strong>agenda</strong> e te avisa de
              eventos novos. Comece explorando as comunidades.
            </p>
            <Link
              href="/comunidades"
              className="mt-5 inline-block rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
            >
              Explorar comunidades
            </Link>
          </div>
        ) : (
          <ul className="mt-10 space-y-4">
            {lista.map((c) => (
              <li
                key={c.membershipId}
                className="rounded-card border border-petroleo/10 bg-white/70 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/comunidades/${c.comunidade.slug}`}
                      className="font-display text-xl font-bold hover:text-petroleo/70"
                    >
                      {c.comunidade.nome}
                    </Link>
                    <p className="mt-1 text-sm text-petroleo/70">
                      {c.comunidade.modalidade} · {c.comunidade.regiao}
                    </p>
                    <p className="mt-2 text-sm text-petroleo/80">
                      {c.proximoEvento ? (
                        <>
                          Próximo:{" "}
                          <Link
                            href={`/eventos/${c.proximoEvento.slug}`}
                            className="font-semibold underline underline-offset-4"
                          >
                            {c.proximoEvento.titulo}
                          </Link>{" "}
                          — {formatarDataEvento(c.proximoEvento.startsAt)}
                        </>
                      ) : (
                        <span className="text-petroleo/50">
                          Sem eventos futuros por enquanto.
                        </span>
                      )}
                    </p>
                  </div>
                  <form action={alternarAvisoAction} className="shrink-0">
                    <input
                      type="hidden"
                      name="communityId"
                      value={c.comunidade.id}
                    />
                    <input
                      type="hidden"
                      name="avisar"
                      value={c.avisarEventos ? "0" : "1"}
                    />
                    <button
                      type="submit"
                      className="rounded-full border border-petroleo/20 px-4 py-2 text-xs font-semibold transition-colors hover:border-petroleo/50"
                    >
                      {c.avisarEventos
                        ? "Avisos: ligados"
                        : "Avisos: desligados"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/agenda"
          className="mt-12 inline-block font-mono text-xs uppercase tracking-[0.14em] text-petroleo/60 hover:text-petroleo"
        >
          Ver minha agenda →
        </Link>
      </main>
      <Footer />
    </>
  );
}
