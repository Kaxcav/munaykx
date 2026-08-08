import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sessaoAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel do organizador",
  // Área de conta: fora do índice, como /minhas-inscricoes e /admin.
  robots: { index: false, follow: false },
};

/**
 * Shell do painel do organizador (STORY-009, frente C).
 *
 * A sessão é lida AQUI, no servidor, via `sessaoAtual()` (nunca
 * `auth.api.getSession()` direto — sem `BETTER_AUTH_SECRET` a lib lança e
 * derrubaria a página inteira). Sem sessão, o painel não existe: manda pro
 * /entrar. Cada página e cada action reconfere a sessão — este layout não é
 * ponto único de falha.
 */
export default async function PainelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-5 py-16">
        <nav className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/painel" className="font-semibold hover:text-lime">
            Minhas comunidades
          </Link>
          <Link
            href="/painel/nova"
            className="text-petroleo/70 hover:text-petroleo"
          >
            + Cadastrar comunidade
          </Link>
        </nav>
        {children}
      </main>
      <Footer />
    </>
  );
}
