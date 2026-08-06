import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input — padrão shadcn/ui na marca MUNAY.
 *
 * Arredondamento `rounded-full` porque é a linguagem do site (botões e chips
 * são pílulas), e não o `rounded-md` padrão do shadcn — que ficaria
 * estrangeiro no meio do resto.
 *
 * Sem `"use client"`: é um `<input>`. Quem precisa de estado envolve ele.
 */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-full border border-input bg-card px-4 py-2 text-sm text-foreground transition-colors",
      "placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "file:border-0 file:bg-transparent file:text-sm file:font-medium",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

/**
 * `<select>` NATIVO estilizado — de propósito, no lugar do Select do Radix.
 *
 * O filtro de evento do /admin vive dentro de um `<form method="get">` e
 * funciona sem JavaScript. O Select do Radix é client component e quebraria
 * isso: viraria um filtro que não funciona com JS desligado, aba restaurada
 * ou conexão ruim — e ganharia ~15kB pra fazer o que o navegador já faz.
 * Trocar seria regressão disfarçada de modernização.
 */
export const SelectNativo = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-full border border-input bg-card px-4 py-2 text-sm text-foreground transition-colors",
      "focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
SelectNativo.displayName = "SelectNativo";
