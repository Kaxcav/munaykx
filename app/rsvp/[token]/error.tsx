"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

/** Estado degradado (ex.: banco fora do ar) — mesmo padrão de /comunidades. */
export default function RsvpError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-24">
        <p className="eyebrow mb-3">Sua inscrição</p>
        <h1 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Não conseguimos carregar sua inscrição agora.
        </h1>
        <p className="mt-4 max-w-xl text-petroleo/70">
          Deve ser coisa rápida. Tenta de novo — teu link continua valendo. A{" "}
          <Link href="/" className="underline underline-offset-4">
            página inicial
          </Link>{" "}
          segue no ar.
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
