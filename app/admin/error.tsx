"use client";

import { EstadoErro } from "@/components/comum/EstadoErro";

/**
 * Estado degradado do admin (ex.: banco fora do ar ou DATABASE_URL ausente):
 * mensagem direta em vez do 500 cru — é ferramenta interna, pode ser franca.
 *
 * A casca é o `<EstadoErro>` do L1: os quatro `error.tsx` do projeto
 * escreviam o mesmo botão de `reset` com a pílula de classes copiada — quatro
 * cópias, quatro copies. O que continua sendo DESTA tela é só a copy: o admin fala com
 * quem tem acesso ao servidor, então ele diz o nome da variável de ambiente
 * em vez de pedir desculpa.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EstadoErro
      eyebrow="Admin"
      titulo="Não deu pra falar com o banco."
      reset={reset}
      descricao={
        <>
          Confere se o Postgres está de pé e se <code>DATABASE_URL</code> está
          definida. Detalhe técnico: {error.digest ?? error.message}
        </>
      }
    />
  );
}
