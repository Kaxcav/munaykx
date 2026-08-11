"use client";

import Link from "next/link";
import HeaderSimples from "@/components/HeaderSimples";
import Footer from "@/components/Footer";
import { EstadoErro } from "@/components/comum/EstadoErro";

/** Mesmo estado degradado da descoberta, para as páginas de evento. */
export default function EventosError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <HeaderSimples />
      <EstadoErro
        eyebrow="Eventos"
        titulo="Não conseguimos carregar este evento agora."
        reset={reset}
        descricao={
          <>
            Deve ser coisa rápida. Tenta de novo — ou volta pra{" "}
            <Link href="/comunidades" className="underline underline-offset-4">
              descoberta de comunidades
            </Link>
            .
          </>
        }
      />
      <Footer />
    </>
  );
}
