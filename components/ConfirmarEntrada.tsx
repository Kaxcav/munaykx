"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    // `h-auto px-7 py-4 font-display text-lg` mantém o botão EXATAMENTE do
    // tamanho que estava. Nenhum `size` do DS bate com esta medida, e adotar
    // o mais próximo (`lg`, que é `h-12`) encolheria a única ação da tela em
    // 12px — mudança de desenho disfarçada de migração. O que sai são as onze
    // classes de cor e hover copiadas: `bg-petroleo/text-areia/hover:bg-lime`
    // é literalmente o `variant="default"` do `<Button>`.
    <Button
      className="mt-8 h-auto w-full px-7 py-4 font-display text-lg font-bold sm:w-auto"
      onClick={() => {
        setIndo(true);
        window.location.href = destino;
      }}
      disabled={indo}
    >
      {indo ? "Entrando…" : "Entrar na MUNAY"}
    </Button>
  );
}
