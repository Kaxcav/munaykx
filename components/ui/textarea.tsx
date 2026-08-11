import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Textarea — padrão shadcn/ui na marca MUNAY.
 *
 * Irmão do `Input`, com uma diferença deliberada: `rounded-card` (1.5rem) em
 * vez de `rounded-full`. Pílula só funciona em altura de uma linha — num
 * bloco de texto de seis linhas ela vira uma cápsula estranha e come o canto
 * da primeira e da última linha. Card é o raio certo pra superfície alta.
 *
 * Sem `"use client"`: é um `<textarea>`. Quem precisa de estado envolve ele.
 */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[6rem] w-full rounded-card border border-input bg-card px-4 py-3 text-sm text-foreground transition-colors",
      "placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
