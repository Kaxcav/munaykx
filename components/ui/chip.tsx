import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Chip — a pílula de filtro, contador e atalho da MUNAY.
 *
 * POR QUE VIROU PEÇA: a receita `rounded-full border px-4 py-1.5 text-sm
 * font-medium transition-colors` + o par ativo/inativo estava escrita à mão
 * **oito vezes** só entre `/comunidades` e `/descobrir` — modalidade, região,
 * "acolhe iniciante", buscas frequentes, recortes irmãos. Mudar o estado
 * ativo significava caçar as oito. Agora é um lugar.
 *
 * Não é `Badge`, e a diferença importa: `Badge` é ESTADO (não clica, é
 * informação); `Chip` é AÇÃO (clica, navega, filtra) e por isso tem alvo de
 * toque, hover e `aria-pressed`.
 *
 * O ativo usa `primary` sólido em vez de lime: filtro ligado é a metade dos
 * chips da tela em alguns recortes, e lime cobrindo essa área quebraria a
 * regra 7 (lime é acento RARO). Quem cobre área é petróleo ou sálvia.
 */
export const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border text-sm font-medium transition-colors focus-visible:outline-none",
  {
    variants: {
      ativo: {
        true: "border-primary bg-primary text-primary-foreground",
        false: "border-primary/15 hover:border-primary/40",
      },
      tamanho: {
        default: "px-4 py-1.5",
        sm: "px-3 py-1 text-xs",
      },
    },
    defaultVariants: { ativo: false, tamanho: "default" },
  },
);

type ChipVariantes = VariantProps<typeof chipVariants>;

/**
 * Chip que NAVEGA (o caso comum: filtro em querystring).
 *
 * É `<Link>` e não `<button>` de propósito — o filtro da descoberta vive na
 * URL, então ele precisa ser um link de verdade: abre em nova aba, é
 * compartilhável, e o robô do Google segue. Trocar por botão com `onClick`
 * seria regressão de SEO disfarçada de componente.
 */
export function Chip({
  href,
  ativo,
  tamanho,
  className,
  children,
  ...props
}: { href: string } & ChipVariantes &
  Omit<React.ComponentPropsWithoutRef<typeof Link>, "href">) {
  return (
    <Link
      href={href}
      // `aria-pressed` só quando o chip é um alternador de verdade (ligado ou
      // desligado). Em chip de navegação simples ele mentiria pro leitor de
      // tela, dizendo que existe um estado que não existe.
      className={cn(chipVariants({ ativo, tamanho }), className)}
      {...props}
    >
      {children}
    </Link>
  );
}

/** Chip que EXECUTA algo na própria tela (ex.: preencher a busca por exemplo). */
export const ChipBotao = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & ChipVariantes
>(({ ativo, tamanho, className, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(chipVariants({ ativo, tamanho }), className)}
    {...props}
  />
));
ChipBotao.displayName = "ChipBotao";
