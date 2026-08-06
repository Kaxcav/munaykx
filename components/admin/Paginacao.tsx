import Link from "next/link";
import { paginacao } from "@/lib/admin-lista";

/**
 * Rodapé de paginação das tabelas do admin. Server component puro: navegar
 * é trocar de URL, não estado de cliente — assim o link é compartilhável e
 * o botão "voltar" do navegador funciona.
 */
export function Paginacao({
  total,
  pagina,
  href,
}: {
  total: number;
  pagina: number;
  /** Recebe o número da página e devolve a URL completa daquele recorte. */
  href: (pagina: number) => string;
}) {
  const { paginas, primeiro, ultimo, temAnterior, temProxima } = paginacao(
    total,
    pagina,
  );

  if (total === 0) return null;

  const botao =
    "rounded-full border border-petroleo/20 px-4 py-2 text-sm font-semibold transition-colors hover:border-petroleo hover:bg-petroleo hover:text-areia";
  const desligado =
    "rounded-full border border-petroleo/10 px-4 py-2 text-sm font-semibold text-petroleo/30";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="font-mono text-xs text-petroleo/60">
        {primeiro}–{ultimo} de {total}
        {paginas > 1 && ` · página ${Math.min(pagina, paginas)} de ${paginas}`}
      </p>
      {paginas > 1 && (
        <div className="flex items-center gap-2">
          {temAnterior ? (
            <Link href={href(pagina - 1)} className={botao} rel="prev">
              ← Anterior
            </Link>
          ) : (
            <span className={desligado}>← Anterior</span>
          )}
          {temProxima ? (
            <Link href={href(pagina + 1)} className={botao} rel="next">
              Próxima →
            </Link>
          ) : (
            <span className={desligado}>Próxima →</span>
          )}
        </div>
      )}
    </div>
  );
}
