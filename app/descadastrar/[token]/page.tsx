import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/db";
import { lerTokenDescadastro } from "@/lib/avisos-evento";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Descadastrar avisos",
  robots: { index: false, follow: false },
};

/**
 * `/descadastrar/[token]` — desliga o aviso de eventos daquela comunidade SEM
 * login. A autorização é a **assinatura** do token (só quem recebeu o e-mail a
 * tem); adulterar o token invalida. É idempotente: clicar de novo mantém
 * desligado — "irreversível sem novo consentimento" (religar é na conta, em
 * Minhas comunidades). Nota: age no GET, como um clique só (pedido do dono); o
 * pior caso de um GET preventivo é desligar um aviso reversível.
 */
export default async function DescadastrarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const dados = lerTokenDescadastro(decodeURIComponent(token));

  let ok = false;
  let comunidade: string | null = null;
  if (dados) {
    // Assinatura válida = pedido legítimo. updateMany é idempotente e não
    // falha se o vínculo já não existe (deixou de seguir).
    await prisma.membership.updateMany({
      where: { userId: dados.userId, communityId: dados.communityId },
      data: { avisarEventos: false },
    });
    const c = await prisma.community.findUnique({
      where: { id: dados.communityId },
      select: { nome: true },
    });
    comunidade = c?.nome ?? null;
    ok = true;
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-5 py-24">
        <p className="eyebrow">Avisos por e-mail</p>
        {ok ? (
          <>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
              Pronto — avisos desligados
            </h1>
            <p className="mt-4 text-petroleo/70">
              Você não recebe mais e-mails de eventos novos
              {comunidade ? (
                <>
                  {" "}
                  de <strong>{comunidade}</strong>
                </>
              ) : (
                " dessa comunidade"
              )}
              . Mudou de ideia? Você liga de novo, por comunidade, em{" "}
              <Link
                href="/minhas-comunidades"
                className="underline underline-offset-4"
              >
                Minhas comunidades
              </Link>{" "}
              (é só entrar).
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
              Link inválido
            </h1>
            <p className="mt-4 text-petroleo/70">
              Este link de descadastro não confere — pode ter sido digitado
              errado ou alterado. Você gerencia os avisos entrando em{" "}
              <Link
                href="/minhas-comunidades"
                className="underline underline-offset-4"
              >
                Minhas comunidades
              </Link>
              .
            </p>
          </>
        )}
        <Link
          href="/"
          className="mt-12 inline-block font-mono text-xs uppercase tracking-[0.14em] text-petroleo/60 hover:text-petroleo"
        >
          ← Início
        </Link>
      </main>
      <Footer />
    </>
  );
}
