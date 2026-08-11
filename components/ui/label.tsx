import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Label — padrão shadcn/ui na marca MUNAY.
 *
 * SEM `@radix-ui/react-label`, de propósito. O Radix Label existe pra
 * resolver um bug de clique no iOS antigo em navegadores que já saíram do
 * baseline; o `<label htmlFor>` nativo faz o resto igual, é server component
 * e não manda 2kB de JS pra cada campo. A MUNAY tem formulário em server
 * action por toda parte — pagar client component por rótulo seria caro pelo
 * nada.
 *
 * Duas variantes de trabalho:
 * - `default` — rótulo de campo (o caso comum).
 * - `destaque` — quando o rótulo É o título da caixa (a busca por descrição
 *   usa assim: "Descreve o que você procura" é a chamada da seção).
 */
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { destaque?: boolean }
>(({ className, destaque = false, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      destaque
        ? "block font-display text-lg font-bold"
        : "block text-sm font-semibold text-foreground",
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";
