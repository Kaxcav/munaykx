import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * `<Aviso>` — a faixa de retorno de ação do painel ("salvo ✓", "deu erro").
 *
 * POR QUE EXISTE: o painel devolve resultado por querystring (`?ok=`,
 * `?erro=`) e cada tela desenhava a própria faixa. Eram **quinze** cópias em
 * quatro receitas diferentes — raio grande com borda de petróleo a 15% e fundo
 * branco a 70%, a mesma sem fundo, uma em sálvia e uma em destrutivo.
 * Resultado prático: o mesmo "Alterações salvas" tinha duas alturas diferentes
 * dependendo da tela em que você salvou.
 *
 * Os tons são SEMÂNTICOS e não decorativos (checklist item 5): `erro` usa a
 * paleta destrutiva, `destaque` usa sálvia — a cor que pode cobrir área — e o
 * `neutro` (o caso comum) é o próprio `<Card>`. O lime não aparece aqui de
 * propósito: aviso é a metade da tela em dia de erro, e lime é acento raro.
 */
export function Aviso({
  tom = "neutro",
  alerta = false,
  className,
  children,
}: {
  /**
   * `neutro` = confirmação e informação (o caso comum) · `erro` = a ação não
   * aconteceu · `destaque` = a tela está num modo diferente do normal (veio
   * da grade, veio do cartaz).
   */
  tom?: "neutro" | "erro" | "destaque";
  /**
   * `role="alert"` em vez de `status`. Só para erro que aparece SEM recarregar
   * a página (o `useActionState` do cadastro): ali o leitor de tela precisa ser
   * interrompido, porque nada mais na tela mudou.
   */
  alerta?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      // `role="status"` e não `alert` por padrão: são mensagens de resultado
      // que chegam com a página já recarregada (server action + redirect).
      // `alert` interromperia o leitor de tela no meio do cabeçalho.
      role={alerta ? "alert" : "status"}
      className={cn(
        "mt-6 rounded-xl p-4 text-sm",
        tom === "erro" && "border-destructive/40 bg-transparent text-destructive",
        tom === "destaque" && "border-salvia bg-salvia-soft text-foreground/80",
        className,
      )}
    >
      {children}
    </Card>
  );
}
