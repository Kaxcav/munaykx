import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — padrão shadcn/ui, adaptado à marca MUNAY.
 *
 * SEM `"use client"` e SEM Radix Slot de propósito: este botão é só um
 * `<button>` estilizado, então funciona em server component e não manda
 * JavaScript nenhum pro navegador. O `asChild` do shadcn (que usa Radix)
 * ficou de fora — quando é pra navegar, use `<Link>` com `variant` via
 * `buttonVariants`, que dá o mesmo visual sem virar client component.
 *
 * `default` usa petróleo com hover lime porque é o gesto que o site público
 * já faz (regra 7: lime é acento, e hover é uso raro e deliberado).
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-lime hover:text-primary",
        outline:
          "border border-primary bg-transparent hover:bg-primary hover:text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary underline underline-offset-4 hover:text-primary/70",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-7",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
