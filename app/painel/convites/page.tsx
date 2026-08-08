import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sessaoAtual } from "@/lib/sessao";
import { organizacoesDe } from "@/lib/organizacao";
import { listarPendentes } from "@/lib/convites";
import { convidarAction, revogarAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Convites",
  robots: { index: false, follow: false },
};

const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

/**
 * `/painel/convites` — convidar gente pra administrar a organização.
 *
 * Fora do route-group `(interno)` de propósito (frente C é dona daquele
 * layout): esta rota traz o próprio Header/Footer e guarda a sessão sozinha.
 */
export default async function ConvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string; revogado?: string }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const orgs = await organizacoesDe(sessao.user.id);
  const { ok, erro, revogado } = await searchParams;

  const porOrg = await Promise.all(
    orgs.map(async (o) => ({
      org: o,
      pendentes: await listarPendentes(sessao.user.id, o.id),
    })),
  );

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-20">
        <p className="eyebrow">Sua organização</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Convites
        </h1>
        <p className="mt-4 max-w-xl text-petroleo/70">
          Convide outra pessoa para <strong>administrar</strong> sua
          organização. Quem aceita passa a gerenciar comunidades, eventos e
          inscritos — por isso o convite é nominal, por e-mail, e não um link
          aberto.
        </p>

        {ok ? (
          <p className="mt-6 rounded-xl border border-petroleo/15 bg-white/70 p-4 text-sm">
            Convite enviado para <strong>{ok}</strong>. Ele expira em 7 dias.
          </p>
        ) : null}
        {revogado ? (
          <p className="mt-6 rounded-xl border border-petroleo/15 bg-white/70 p-4 text-sm">
            Convite revogado.
          </p>
        ) : null}
        {erro ? (
          <p className="mt-6 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
            {erro}
          </p>
        ) : null}

        {orgs.length === 0 ? (
          <div className="mt-10 rounded-card border border-petroleo/15 bg-white/70 p-8">
            <p className="font-display text-lg font-bold">
              Você ainda não administra nenhuma organização
            </p>
            <p className="mt-2 text-petroleo/70">
              Cadastre uma comunidade primeiro — ela cria a sua organização. Aí
              você pode convidar outras pessoas pra ajudar a administrar.
            </p>
            <Link
              href="/painel/nova"
              className="mt-5 inline-block rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
            >
              Cadastrar comunidade
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-10">
            {porOrg.map(({ org, pendentes }) => (
              <section key={org.id}>
                <h2 className="font-display text-xl font-bold">{org.nome}</h2>

                <form
                  action={convidarAction}
                  className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <input type="hidden" name="organizationId" value={org.id} />
                  <label className="flex-1">
                    <span className="mb-1 block text-sm font-semibold">
                      E-mail de quem vai administrar
                    </span>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="pessoa@exemplo.com"
                      className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
                  >
                    Convidar
                  </button>
                </form>

                <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-petroleo/60">
                  Convites pendentes
                </h3>
                {pendentes.length === 0 ? (
                  <p className="mt-2 text-sm text-petroleo/60">
                    Nenhum convite pendente.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {pendentes.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-petroleo/10 p-4 text-sm"
                      >
                        <span>
                          <strong>{c.email}</strong>
                          <span className="ml-2 text-petroleo/60">
                            {c.expirado
                              ? "expirado"
                              : `expira em ${fmt.format(c.expiraEm)}`}
                          </span>
                        </span>
                        <form action={revogarAction}>
                          <input
                            type="hidden"
                            name="organizationId"
                            value={org.id}
                          />
                          <input type="hidden" name="conviteId" value={c.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-petroleo/20 px-4 py-2 text-xs font-semibold transition-colors hover:border-petroleo/50"
                          >
                            Revogar
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}

        <Link
          href="/"
          className="mt-14 inline-block font-mono text-xs uppercase tracking-[0.14em] text-petroleo/60 hover:text-petroleo"
        >
          ← Voltar pro início
        </Link>
      </main>
      <Footer />
    </>
  );
}
