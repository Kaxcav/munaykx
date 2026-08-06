"use client";

import { useState } from "react";

/**
 * O clique que consome o token (STORY-007, decisão 3).
 *
 * O consumo NÃO pode acontecer no carregamento da página: scanners de
 * segurança (Outlook SafeLinks, gateways corporativos e .gov.br) abrem os
 * links do e-mail automaticamente e queimariam o token de uso único antes
 * da pessoa clicar. Scanner não clica em botão — por isso a navegação só
 * acontece aqui, no onClick.
 */
export default function ConfirmarEntrada({ destino }: { destino: string }) {
  const [indo, setIndo] = useState(false);

  return (
    <button
      onClick={() => {
        setIndo(true);
        window.location.href = destino;
      }}
      disabled={indo}
      className="mt-8 w-full rounded-full bg-petroleo px-7 py-4 font-display text-lg font-bold text-areia transition-colors hover:bg-lime hover:text-petroleo disabled:opacity-50 sm:w-auto"
    >
      {indo ? "Entrando…" : "Entrar na MUNAY"}
    </button>
  );
}
