import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — padrão shadcn/ui na marca MUNAY.
 *
 * As variantes espelham os estados que o `/admin` já mostrava com `<span>`
 * solto: no ar, inativa, demo. Ter nome pra cada estado é o ganho real —
 * antes, "demo" era uma combinação de seis classes repetida em duas telas,
 * e mudar a cor do demo significava caçar as ocorrências.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        outline: "border-border text-muted-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        /** Conteúdo ilustrativo (regra 3 do projeto). Coral = raríssimo, e
         *  é exatamente o caso: precisa saltar aos olhos de quem opera. */
        demo: "border-destructive/40 text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/**
 * O trio de estado de comunidade/evento, num lugar só.
 *
 * Estava duplicado em `/admin/comunidades` e `/admin/eventos` com a mesma
 * lógica escrita duas vezes — e é o tipo de duplicação que só aparece
 * quando alguém muda um lado e esquece o outro.
 */
export function EstadoPublicacao({ ativo, demo }: { ativo: boolean; demo: boolean }) {
  return (
    <span className="flex flex-wrap gap-1">
      {!ativo && <Badge variant="outline">inativa</Badge>}
      {demo && <Badge variant="demo">demo</Badge>}
      {ativo && !demo && <Badge>no ar</Badge>}
    </span>
  );
}
