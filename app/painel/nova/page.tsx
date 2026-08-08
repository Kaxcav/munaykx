import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sessaoAtual } from "@/lib/sessao";
import { TEXTO_AUTORIZACAO } from "@/lib/cadastro";
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
      <main className="mx-auto max-w-3xl px-5 py-20">
        <p className="eyebrow">Sua conta</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Cadastrar comunidade
        </h1>

        {ok ? (
          <div className="mt-10 rounded-card border border-petroleo/15 bg-white/70 p-8">
            <p className="font-display text-xl font-bold">
              Cadastro recebido ✓
            </p>
            <p className="mt-3 text-petroleo/80">
              A comunidade <strong>{ok}</strong> foi registrada e você já é
              organizador dela. Ela ainda <strong>não aparece no site</strong>:
              passa por uma conferência rápida antes de ir ao ar, e a gente
              avisa por e-mail quando isso acontecer.
            </p>
            <p className="mt-3 text-sm text-petroleo/60">
              Guardamos a autorização que você aceitou, com data e hora.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/painel/nova"
                className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
              >
                Cadastrar outra
              </Link>
              <Link
                href="/"
                className="rounded-full border border-petroleo/20 px-6 py-3 text-sm font-semibold transition-colors hover:border-petroleo/50"
              >
                Voltar pro início
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-4 max-w-xl text-petroleo/70">
              Cadastre a comunidade que você organiza. Ela passa por uma
              conferência rápida da nossa parte e depois entra no ar — a partir
              daí, quem mantém as informações no lugar é você.
            </p>
            <CadastroForm
              action={cadastrarComunidade}
              textoAutorizacao={TEXTO_AUTORIZACAO}
            />
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
