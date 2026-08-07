import Link from "next/link";
import { paginacao } from "@/lib/admin-lista";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Rodapé de paginação das tabelas do admin. Server component puro: navegar
 * é trocar de URL, não estado de cliente — assim o link é compartilhável e
 * o botão "voltar" do navegador funciona.
 *
 * Usa `buttonVariants` em vez do `<Button>`: quando o destino é uma URL, o
 * elemento certo é `<Link>` (ancoragem, abrir em nova aba, botão do meio do
 * mouse). `<button>` com onClick perderia tudo isso — e viraria client
 * component sem necessidade.
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

  const estilo = buttonVariants({ variant: "outline", size: "sm" });
  const desligado = cn(estilo, "pointer-events-none opacity-30");

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="font-mono text-xs text-muted-foreground">
        {primeiro}–{ultimo} de {total}
        {paginas > 1 && ` · página ${Math.min(pagina, paginas)} de ${paginas}`}
      </p>
      {paginas > 1 && (
        <div className="flex items-center gap-2">
          {temAnterior ? (
            <Link href={href(pagina - 1)} className={estilo} rel="prev">
              ← Anterior
            </Link>
          ) : (
            <span className={desligado}>← Anterior</span>
          )}
          {temProxima ? (
            <Link href={href(pagina + 1)} className={estilo} rel="next">
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
