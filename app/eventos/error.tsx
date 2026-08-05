"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

/** Mesmo estado degradado da descoberta, para as páginas de evento. */
export default function EventosError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-24">
        <p className="eyebrow mb-3">Eventos</p>
        <h1 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Não conseguimos carregar este evento agora.
        </h1>
        <p className="mt-4 max-w-xl text-petroleo/70">
          Deve ser coisa rápida. Tenta de novo — ou volta pra{" "}
          <Link href="/comunidades" className="underline underline-offset-4">
            descoberta de comunidades
          </Link>
          .
        </p>
        <button
          onClick={reset}
          className="mt-8 rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
        >
          Tentar de novo
        </button>
      </main>
      <Footer />
    </>
  );
}
