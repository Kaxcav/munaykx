import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn()` — junta classes condicionais e resolve conflito do Tailwind.
 *
 * O `twMerge` é o que importa: sem ele, `cn("px-4", "px-6")` deixaria as
 * duas classes no HTML e quem ganha depende da ordem no CSS gerado, não do
 * código. Com ele, a última vence — que é o comportamento que todo mundo
 * espera ao passar `className` pra um componente.
 *
 * Exigido por todo componente do shadcn/ui.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
