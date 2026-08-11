import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SeloAcolheIniciante from "@/components/SeloAcolheIniciante";
import { cn } from "@/lib/utils";

/**
 * `<CardComunidade>` — o cartão de comunidade da descoberta.
 *
 * POR QUE VIROU PEÇA: ele estava escrito DUAS VEZES, palavra por palavra —
 * em `/comunidades` e em `/descobrir/[recorte]` — e as duas cópias já tinham
 * divergido: a de `/descobrir` não mostrava o selo "acolhe iniciantes". Ou
 * seja, a duplicação não era só feia, já estava escondendo informação de
 * quem chega pela busca do Google. Uma peça, uma verdade.
 *
 * Fica em `comum/` e não em `ui/` porque conhece o formato de comunidade da
 * MUNAY — é peça do produto, não primitiva de design.
 */
export function CardComunidade({
  slug,
  nome,
  regiao,
  modalidade,
  nivel,
  horarios,
  local,
  acolheIniciante = false,
  className,
}: {
  slug: string;
  nome: string;
  regiao: string;
  modalidade: string;
  nivel?: string | null;
  horarios?: string | null;
  local?: string | null;
  acolheIniciante?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={`/comunidades/${slug}`}
      className={cn("group block", className)}
    >
      <Card className="h-full p-6 transition-colors hover:border-primary/30">
        <article>
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-xl font-bold">{nome}</h2>
            <Badge variant="outline" className="shrink-0">
              {regiao}
            </Badge>
          </div>
          {horarios && (
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-foreground/70">
              {horarios}
              {local ? ` — ${local}` : ""}
            </p>
          )}
          <p className="mt-2 text-sm text-foreground/60">{nivel ?? modalidade}</p>
          {acolheIniciante && <SeloAcolheIniciante className="mt-3" />}
        </article>
      </Card>
    </Link>
  );
}
