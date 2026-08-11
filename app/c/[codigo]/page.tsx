import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sessaoAtual } from "@/lib/sessao";
import { Pagina } from "@/components/comum/Pagina";
import { buttonVariants } from "@/components/ui/button";
import { comunidadePorCodigo, entrarPorCodigo } from "@/lib/convite-aberto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Convite para a comunidade",
  // Link de convite não é conteúdo: fora do índice e fora do sitemap. Indexar
  // convite seria publicar no Google a chave que faz qualquer um entrar.
  robots: { index: false, follow: false },
};

/**
 * `/c/[codigo]` — o link aberto da comunidade (RODADA-painel §D).
 *
 * URL curta de propósito: este link é feito pra ser colado no grupo de
 * WhatsApp, e link longo quebra em app de mensagem.
 *
 * O que ele concede é **seguir**, e só. Nunca `OrganizationMember` — quem tem
 * o link não ganha acesso à lista de inscritos nem a poder nenhum. É a mesma
 * separação que `lib/convites.ts` protege do outro lado.
 *
 * Age no GET, como o `/descadastrar/[token]` — precedente já aceito no
 * projeto. O pior caso de um GET preventivo de scanner corporativo (SafeLinks
 * e afins) é passar a seguir uma comunidade, que se desfaz num clique. Não é
 * o caso do magic link, onde o GET preventivo QUEIMA o token: por isso lá
 * existe a página intermediária e aqui não precisa.
 */
export default async function ConvitePage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const cru = decodeURIComponent(codigo);

  const sessao = await sessaoAtual();
  if (!sessao) {
    // Preserva a intenção pelo mecanismo que já existe (`?proximo=`, que barra
    // open-redirect): a pessoa entra e volta pra cá, e aí o vínculo é criado.
    const alvo = await comunidadePorCodigo(cru);
    if (alvo) {
      redirect(`/entrar?proximo=${encodeURIComponent(`/c/${encodeURIComponent(cru)}`)}`);
    }
  }

  const comunidade = sessao
    ? await entrarPorCodigo(sessao.user.id, cru)
    : await comunidadePorCodigo(cru);

  return (
    <>
      <Header />
      {comunidade ? (
        <Pagina
          eyebrow="Convite"
          titulo={`Pronto — você segue ${comunidade.nome}`}
          className="max-w-2xl"
          descricao={`${comunidade.modalidade} · ${comunidade.regiao}. Os próximos eventos dela entram na sua agenda, e os avisos da comunidade aparecem lá também.`}
        >
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/comunidades/${comunidade.slug}`}
              className={buttonVariants()}
            >
              Ver a comunidade
            </Link>
            <Link href="/agenda" className={buttonVariants({ variant: "outline" })}>
              Minha agenda
            </Link>
          </div>
          <p className="mt-6 text-sm text-foreground/60">
            Mudou de ideia? Você deixa de seguir na página da comunidade, e
            controla os avisos por e-mail em{" "}
            <Link
              href="/minhas-comunidades"
              className="underline underline-offset-4"
            >
              Minhas comunidades
            </Link>
            .
          </p>
        </Pagina>
      ) : (
        <Pagina
          eyebrow="Convite"
          titulo="Convite inválido"
          className="max-w-2xl"
          descricao="Este link não vale mais — pode ter sido trocado por quem organiza, ou a comunidade ainda não está publicada. Peça o link novo, ou procure a comunidade pela busca."
        >
          <div className="mt-8">
            <Link href="/comunidades" className={buttonVariants()}>
              Explorar comunidades
            </Link>
          </div>
        </Pagina>
      )}
      <Footer />
    </>
  );
}
