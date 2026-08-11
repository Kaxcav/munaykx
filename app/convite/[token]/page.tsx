import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Pagina } from "@/components/comum/Pagina";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      <Pagina
        eyebrow="Convite"
        titulo={
          invalido
            ? "Convite não encontrado"
            : `Administrar ${convite!.organization.nome}`
        }
        descricao={
          invalido
            ? "O link pode ter sido revogado ou digitado errado."
            : jaUsado
              ? "Este convite já foi usado. Se foi você, sua conta já administra a organização."
              : expirado
                ? "Este convite expirou. Peça um novo para quem te convidou."
                : combina
                  ? "Aceitando, você passa a gerenciar as comunidades, os eventos e a lista de inscritos desta organização."
                  : undefined
        }
        className="max-w-2xl"
      >
        {/* Só o caso "convite de outra pessoa" e o erro de servidor sobram
            como conteúdo: os outros quatro estados são uma frase, e frase de
            estado é a `descricao` do `<Pagina>` — não um parágrafo avulso
            reinventando a hierarquia da tela. */}
        {!invalido && !jaUsado && !expirado && !combina && (
          <Card className="mt-4 border-destructive/40 p-4 text-sm text-destructive">
            Este convite é para <strong>{convite!.email}</strong>, e você está
            logado como <strong>{sessao.user.email}</strong>. Entre com a conta
            convidada para aceitar.
          </Card>
        )}

        {!invalido && !jaUsado && !expirado && combina && (
          <>
            {erro ? (
              <Card className="mt-6 border-destructive/40 p-4 text-sm text-destructive">
                {erro}
              </Card>
            ) : null}
            <form action={aceitarAction} className="mt-8">
              <input type="hidden" name="token" value={token} />
              <Button type="submit">Aceitar convite</Button>
            </form>
          </>
        )}

        <Link
          href="/"
          className="mt-14 inline-block font-mono text-xs uppercase tracking-[0.14em] text-foreground/60 transition-colors hover:text-foreground"
        >
          ← Voltar pro início
        </Link>
      </Pagina>
      <Footer />
    </>
  );
}
