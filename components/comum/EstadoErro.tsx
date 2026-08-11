"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Pagina } from "@/components/comum/Pagina";

/**
 * `<EstadoErro>` — o corpo de um `error.tsx`.
 *
 * `"use client"` porque `error.tsx` do Next é obrigatoriamente client
 * component e recebe o `reset` como função. É o único componente de
 * `comum/` que manda JS pro navegador, e por um motivo do framework, não de
 * design.
 *
 * O projeto tem QUATRO error boundaries (`/comunidades`, `/eventos`,
 * `/admin`, `/rsvp/[token]`) e os quatro escreviam o mesmo `<button onClick=
 * {reset}>` com uma pílula de classe copiada. Aqui vira `<Button>`, e o
 * "tenta de novo" passa a ter uma forma só.
 *
 * O `<Pagina>` vem junto: erro que perde o cabeçalho da tela parece outro
 * site. A régua da rodada — "parece irmã da /mapa?" — vale também no dia
 * ruim.
 */
export function EstadoErro({
  eyebrow,
  titulo,
  descricao,
  reset,
  rotuloRetry = "Tentar de novo",
}: {
  eyebrow?: string;
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  /** O `reset` que o Next entrega pro `error.tsx`. */
  reset: () => void;
  rotuloRetry?: string;
}) {
  return (
    <Pagina eyebrow={eyebrow} titulo={titulo}>
      {descricao && <div className="mt-4 max-w-xl text-foreground/70">{descricao}</div>}
      <Button className="mt-8" onClick={reset}>
        {rotuloRetry}
      </Button>
    </Pagina>
  );
}
