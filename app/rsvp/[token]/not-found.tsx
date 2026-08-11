import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Pagina } from "@/components/comum/Pagina";

/** Token inválido/expirado → 404 amigável, sem vazar se o link "quase" existe. */
export default function RsvpNotFound() {
  return (
    <>
      <Header />
      <Pagina
        eyebrow="Sua inscrição"
        titulo="Não encontramos essa inscrição."
        descricao={
          <>
            Confere se o link veio completo (ele é comprido mesmo). Se você quer
            participar de algo, a{" "}
            <Link href="/comunidades" className="underline underline-offset-4">
              descoberta de comunidades
            </Link>{" "}
            é o melhor lugar pra começar.
          </>
        }
      />
      <Footer />
    </>
  );
}
