"use client";

import Link from "next/link";
import HeaderSimples from "@/components/HeaderSimples";
import Footer from "@/components/Footer";
import { EstadoErro } from "@/components/comum/EstadoErro";

/** Estado degradado (ex.: banco fora do ar) — mesmo padrão de /comunidades. */
export default function RsvpError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <HeaderSimples />
      <EstadoErro
        eyebrow="Sua inscrição"
        titulo="Não conseguimos carregar sua inscrição agora."
        reset={reset}
        descricao={
          <>
            Deve ser coisa rápida. Tenta de novo — teu link continua valendo. A{" "}
            <Link href="/" className="underline underline-offset-4">
              página inicial
            </Link>{" "}
            segue no ar.
          </>
        }
      />
      <Footer />
    </>
  );
}
