import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Pagina } from "@/components/comum/Pagina";
import { prisma } from "@/lib/db";
import { lerTokenDescadastro } from "@/lib/avisos-evento";
import { lerTokenDescadastroPost } from "@/lib/avisos-post";

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
  const cru = decodeURIComponent(token);

  // UMA URL de descadastro pros dois tipos de aviso (evento novo, STORY-008; e
  // aviso da comunidade, STORY-010). O propósito vem assinado DENTRO do token,
  // então o link desliga exatamente o que o e-mail prometia desligar — nunca o
  // outro. Duas URLs seria pior pra quem lê e pior pro provedor de e-mail, que
  // espera um endereço de descadastro estável.
  const deEvento = lerTokenDescadastro(cru);
  const dePost = deEvento ? null : lerTokenDescadastroPost(cru);
  const dados = deEvento ?? dePost;

  let ok = false;
  let comunidade: string | null = null;
  if (dados) {
    // Assinatura válida = pedido legítimo. updateMany é idempotente e não
    // falha se o vínculo já não existe (deixou de seguir).
    await prisma.membership.updateMany({
      where: { userId: dados.userId, communityId: dados.communityId },
      data: deEvento ? { avisarEventos: false } : { avisarPosts: false },
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
      {/*
        `tamanho` fica no padrão e a largura vem do `max-w-2xl`: é uma tela de
        uma frase só, e a régua da /mapa (`max-w-6xl`) faria o texto atravessar
        o monitor inteiro. O container é o mesmo — o que muda é a medida de
        leitura, que é decisão de conteúdo, não de casca.
      */}
      <Pagina eyebrow="Avisos por e-mail" titulo={ok ? "Pronto — avisos desligados" : "Link inválido"} className="max-w-2xl">
        {ok ? (
          <p className="mt-4 text-foreground/70">
            Você não recebe mais e-mails
              {deEvento ? " de eventos novos" : " de avisos"}
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
        ) : (
          <p className="mt-4 text-foreground/70">
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
        )}
        <Link
          href="/"
          className="mt-12 inline-block font-mono text-xs uppercase tracking-[0.14em] text-foreground/60 transition-colors hover:text-foreground"
        >
          ← Início
        </Link>
      </Pagina>
      <Footer />
    </>
  );
}
