import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

/** Token inválido/expirado → 404 amigável, sem vazar se o link "quase" existe. */
export default function RsvpNotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-24">
        <p className="eyebrow mb-3">Sua inscrição</p>
        <h1 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Não encontramos essa inscrição.
        </h1>
        <p className="mt-4 max-w-xl text-petroleo/70">
          Confere se o link veio completo (ele é comprido mesmo). Se você
          quer participar de algo, a{" "}
          <Link href="/comunidades" className="underline underline-offset-4">
            descoberta de comunidades
          </Link>{" "}
          é o melhor lugar pra começar.
        </p>
      </main>
      <Footer />
    </>
  );
}
