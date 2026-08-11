import Link from "next/link";

/**
 * `<NavPainel>` — a barra de navegação do painel do organizador.
 *
 * Era `<nav>` solta DENTRO do `<main>` do layout `(interno)`, e por isso não
 * existia em `/painel/nova` nem em `/painel/convites` — as duas telas moram
 * fora do route-group e traziam Header/Footer por conta própria. O organizador
 * que caía numa delas perdia o caminho de volta e usava o botão do navegador.
 *
 * Agora é uma barra sob o `<Header />`, com régua, nas TRÊS rotas de topo do
 * painel — o padrão de sub-navegação que o shadcn usa em dashboard, e que aqui
 * também resolve um problema de HTML: `<Pagina>` renderiza `<main>`, então a
 * nav não podia continuar dentro de outro `<main>` do layout.
 *
 * Server component: sem estado de rota ativa (`usePathname` custaria um client
 * component na casca inteira do painel). A hierarquia é tipográfica — a tela
 * principal em peso semibold, as outras em cinza —, que é exatamente o que a
 * nav antiga já fazia.
 *
 * **Desvio confessado (regra 6 do CLAUDE.md):** "Convites" é um link NOVO. A
 * tela `/painel/convites` existe desde a STORY-009 e só era alcançável por um
 * link no meio do texto da tela de convite aberto. Uma casca que esconde uma
 * das três telas do painel é a inconsistência que esta rodada existe pra
 * matar; nenhuma lógica, permissão ou consulta mudou junto.
 */
export function NavPainel() {
  return (
    <div className="border-b border-border">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-sm">
        <Link href="/painel" className="font-semibold">
          Minhas comunidades
        </Link>
        <Link
          href="/painel/nova"
          className="text-foreground/70 transition-colors hover:text-foreground"
        >
          Cadastrar comunidade
        </Link>
        <Link
          href="/painel/convites"
          className="text-foreground/70 transition-colors hover:text-foreground"
        >
          Convites
        </Link>
      </nav>
    </div>
  );
}
