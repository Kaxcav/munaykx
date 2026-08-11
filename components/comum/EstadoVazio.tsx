import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * `<EstadoVazio>` — "não tem nada aqui" com saída.
 *
 * O padrão que a MUNAY já pratica e que este componente só formaliza: lista
 * vazia NUNCA é uma frase seca. É título + explicação de por que está vazio +
 * um caminho pra frente. A `/comunidades` sem resultado é o exemplo certo
 * ("Brasília é grande e a MUNAY está mapeando…" + limpar filtros), e é a copy
 * dela que virou a forma.
 *
 * Não tem ícone nem ilustração de propósito: estado vazio com desenho grande
 * vira decoração de um momento ruim. O que a pessoa precisa é da frase e do
 * botão.
 */
export function EstadoVazio({
  titulo,
  descricao,
  acao,
  className,
}: {
  titulo: React.ReactNode;
  /** Por que está vazio — não "nenhum resultado encontrado". */
  descricao?: React.ReactNode;
  /** O caminho pra frente. Sem ele, é um beco. */
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-16 max-w-xl", className)}>
      <p className="font-display text-xl font-bold">{titulo}</p>
      {descricao && (
        <div className="mt-3 text-foreground/70">{descricao}</div>
      )}
      {acao && <div className="mt-6 flex flex-wrap gap-3">{acao}</div>}
    </div>
  );
}
