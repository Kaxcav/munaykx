import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sessaoAtual } from "@/lib/sessao";
import { convitePorToken } from "@/lib/convites";
import { aceitarAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Convite",
  robots: { index: false, follow: false },
};

/**
 * `/convite/[token]` — aceitar um convite para administrar uma organização.
 *
 * Exige login (a sessão diz quem é). O aceite em si confere no servidor que o
 * e-mail da sessão bate com o do convite — aqui a tela só mostra o estado e,
 * quando faz sentido, o botão. O texto do convite (org) aparece pra pessoa
 * saber o que está aceitando.
 */
export default async function ConvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const sessao = await sessaoAtual();
  const { token } = await params;
  // Sem login não dá pra saber quem aceita — manda entrar e voltar.
  if (!sessao) redirect("/entrar");

  const { erro } = await searchParams;
  const convite = await convitePorToken(token);

  const agora = Date.now();
  const invalido = !convite;
  const jaUsado = convite?.aceitoEm != null;
  const expirado = convite ? convite.expiraEm.getTime() <= agora : false;
  const combina =
    convite != null &&
    convite.email === sessao.user.email.trim().toLowerCase();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-5 py-24">
        <p className="eyebrow">Convite</p>

        {invalido ? (
          <>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
              Convite não encontrado
            </h1>
            <p className="mt-4 text-petroleo/70">
              O link pode ter sido revogado ou digitado errado.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
              Administrar {convite!.organization.nome}
            </h1>

            {jaUsado ? (
              <p className="mt-4 text-petroleo/70">
                Este convite já foi usado. Se foi você, sua conta já administra a
                organização.
              </p>
            ) : expirado ? (
              <p className="mt-4 text-petroleo/70">
                Este convite expirou. Peça um novo para quem te convidou.
              </p>
            ) : !combina ? (
              <p className="mt-4 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
                Este convite é para <strong>{convite!.email}</strong>, e você
                está logado como <strong>{sessao.user.email}</strong>. Entre com
                a conta convidada para aceitar.
              </p>
            ) : (
              <>
                <p className="mt-4 text-petroleo/70">
                  Aceitando, você passa a gerenciar as comunidades, os eventos e
                  a lista de inscritos desta organização.
                </p>
                {erro ? (
                  <p className="mt-6 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
                    {erro}
                  </p>
                ) : null}
                <form action={aceitarAction} className="mt-8">
                  <input type="hidden" name="token" value={token} />
                  <button
                    type="submit"
                    className="rounded-full bg-petroleo px-7 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
                  >
                    Aceitar convite
                  </button>
                </form>
              </>
            )}
          </>
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
