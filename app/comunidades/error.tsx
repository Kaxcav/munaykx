"use client";

import Link from "next/link";
import HeaderSimples from "@/components/HeaderSimples";
import Footer from "@/components/Footer";
import { EstadoErro } from "@/components/comum/EstadoErro";

/**
 * Estado degradado da descoberta (ex.: banco fora do ar): em vez do 500 cru,
 * mensagem amigável com retry — a home continua funcionando via fallback.
 */
export default function ComunidadesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <HeaderSimples />
      <EstadoErro
        eyebrow="Descoberta"
        titulo="Não conseguimos carregar as comunidades agora."
        descricao={
          <>
            Deve ser coisa rápida. Tenta de novo — e se não resolver, a{" "}
            <Link href="/" className="underline underline-offset-4">
              página inicial
            </Link>{" "}
            segue no ar com um recorte do que acontece na cidade.
          </>
        }
        reset={reset}
      />
      <Footer />
    </>
  );
}
