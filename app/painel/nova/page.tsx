import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sessaoAtual } from "@/lib/sessao";
import { TEXTO_AUTORIZACAO } from "@/lib/cadastro";
import { Pagina } from "@/components/comum/Pagina";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { NavPainel } from "@/components/painel/NavPainel";
import { cadastrarComunidade } from "./actions";
import CadastroForm from "./CadastroForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cadastrar comunidade",
  // Área de conta: fora do índice, como `/minhas-inscricoes` e `/admin`.
  robots: { index: false, follow: false },
};

export default async function NovaComunidadePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  // Via `sessaoAtual()` e nunca `auth.api.getSession()` direto: sem
  // `BETTER_AUTH_SECRET` a lib lança, e esta página passaria a responder 500
  // em vez de mandar pro /entrar. A suíte roda sempre sem o segredo justamente
  // pra provar que este caminho continua de pé.
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const { ok } = await searchParams;

  return (
    <>
      <Header />
      <NavPainel />
      <Pagina
        eyebrow="Sua conta"
        titulo="Cadastrar comunidade"
        voltar={{ href: "/", texto: "Voltar pro início" }}
        descricao={
          ok
            ? undefined
            : "Cadastre a comunidade que você organiza. Ela passa por uma conferência rápida da nossa parte e depois entra no ar — a partir daí, quem mantém as informações no lugar é você."
        }
      >
        {ok ? (
          <Card className="mt-10 max-w-2xl p-8">
            <p className="font-display text-xl font-bold">Cadastro recebido ✓</p>
            <p className="mt-3 text-foreground/80">
              A comunidade <strong>{ok}</strong> foi registrada e você já é
              organizador dela. Ela ainda <strong>não aparece no site</strong>:
              passa por uma conferência rápida antes de ir ao ar, e a gente avisa
              por e-mail quando isso acontecer.
            </p>
            <p className="mt-3 text-sm text-foreground/60">
              Guardamos a autorização que você aceitou, com data e hora.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/painel/nova" className={buttonVariants()}>
                Cadastrar outra
              </Link>
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                Voltar pro início
              </Link>
            </div>
          </Card>
        ) : (
          <CadastroForm
            action={cadastrarComunidade}
            textoAutorizacao={TEXTO_AUTORIZACAO}
          />
        )}
      </Pagina>
      <Footer />
    </>
  );
}
