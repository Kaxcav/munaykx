import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card — padrão shadcn/ui na marca MUNAY.
 *
 * Usa `rounded-card` (1.5rem, o raio da marca) e não `rounded-lg`: card é
 * elemento de identidade visual, ao contrário de botão e campo, que ganham
 * o raio menor de controle.
 */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-card border border-border bg-card text-card-foreground",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-display text-lg font-bold leading-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

/**
 * Cartão de número do dashboard. Não é do shadcn — é do produto, e mora
 * aqui pra que "número grande com rótulo" tenha UMA forma no projeto
 * inteiro em vez de ser remontado em cada tela.
 */
export function CardNumero({
  rotulo,
  valor,
  nota,
  destaque = false,
  className,
}: {
  rotulo: string;
  valor: React.ReactNode;
  nota?: string;
  destaque?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "p-6 transition-colors",
        destaque ? "border-primary/30 hover:border-primary" : "hover:border-primary/30",
        className,
      )}
    >
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </p>
      <p className="mt-2 font-display text-4xl font-extrabold">{valor}</p>
      {nota && (
        <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">{nota}</p>
      )}
    </Card>
  );
}
