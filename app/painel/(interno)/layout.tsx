import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { NavPainel } from "@/components/painel/NavPainel";
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
 *
 * O layout NÃO renderiza mais `<main>`: quem abre a tela é o `<Pagina>` de
 * cada página, que já é o `<main>`. Dois `<main>` aninhados é HTML inválido e
 * confunde o "pular para o conteúdo" do leitor de tela — foi o que ia
 * acontecer ao adotar o container padrão da rodada.
 */
export default async function PainelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  return (
    <>
      <Header />
      <NavPainel />
      {children}
      <Footer />
    </>
  );
}
