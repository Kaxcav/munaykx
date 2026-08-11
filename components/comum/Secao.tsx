import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * `<Secao>` — cabeçalho de seção interna, com o `eyebrow` mono da marca.
 *
 * Existe pra matar os `<h2 className="…">` avulsos. Eles estavam em três
 * dialetos diferentes só na descoberta: `eyebrow mb-4`, `eyebrow mb-3` e
 * `font-display text-2xl font-extrabold`. Nenhum desses três foi uma decisão
 * — foram três momentos diferentes de digitação.
 *
 * `regua` desenha a linha de corte que a `/mapa` usa entre blocos
 * (`border-t border-petroleo/10 pt-*`). É o mesmo gesto, com um nome.
 */
export function Secao({
  titulo,
  descricao,
  acoes,
  regua = false,
  destaque = false,
  className,
  children,
}: {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  /** Linha horizontal separando esta seção da anterior. */
  regua?: boolean;
  /**
   * `false` (padrão) = eyebrow mono, o cabeçalho discreto que a `/mapa` usa
   * na coluna lateral. `true` = título display, pra seção que compete de
   * igual com o conteúdo principal.
   */
  destaque?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "mt-16",
        regua && "border-t border-border pt-10",
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          {destaque ? (
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              {titulo}
            </h2>
          ) : (
            <h2 className="eyebrow">{titulo}</h2>
          )}
          {descricao && (
            <p className="mt-2 max-w-2xl text-sm text-foreground/60">{descricao}</p>
          )}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </div>
      {children && <div className={destaque ? "mt-6" : "mt-4"}>{children}</div>}
    </section>
  );
}
