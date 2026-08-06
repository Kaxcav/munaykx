import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ConfirmarEntrada from "@/components/ConfirmarEntrada";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirmar acesso",
  robots: { index: false, follow: false },
};

/**
 * Página intermediária do magic link. Recebe `?u=` com a URL de verificação
 * do Better Auth e só a dispara no clique (ver ConfirmarEntrada).
 *
 * SEGURANÇA: `u` vem de fora, então nunca é usada crua. Só passa se
 * apontar para o NOSSO domínio E para o caminho de auth — senão vira um
 * open redirect servido pela nossa marca.
 */
function destinoSeguro(bruto: string | undefined): string | null {
  if (!bruto) return null;
  let url: URL;
  try {
    url = new URL(bruto, SITE_URL);
  } catch {
    return null;
  }
  const base = new URL(SITE_URL);
  if (url.origin !== base.origin) return null;
  if (!url.pathname.startsWith("/api/auth/")) return null;
  return url.toString();
}

type Params = Promise<{ u?: string }>;

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const { u } = await searchParams;
  const destino = destinoSeguro(u);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-24">
        <p className="eyebrow">Sua conta</p>

        {destino ? (
          <>
            <h1 className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Tudo certo — é só confirmar.
            </h1>
            <p className="mt-4 max-w-xl text-petroleo/70">
              Clique no botão pra entrar. Pedimos esse clique de propósito:
              filtros de segurança de e-mail abrem links sozinhos, e sem esse
              passo eles gastariam seu acesso antes de você.
            </p>
            <ConfirmarEntrada destino={destino} />
            <p className="mt-6 max-w-xl text-sm text-petroleo/50">
              O link vale por 20 minutos e funciona uma vez só. Se der erro,
              é só{" "}
              <Link href="/entrar" className="underline underline-offset-4">
                pedir um novo
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Esse link não parece válido.
            </h1>
            <p className="mt-4 max-w-xl text-petroleo/70">
              Pode ser que ele tenha vindo cortado pelo e-mail, ou que já tenha
              sido usado. Pedir um novo leva dez segundos.
            </p>
            <Link
              href="/entrar"
              className="mt-8 inline-block rounded-full bg-petroleo px-7 py-4 font-display text-lg font-bold text-areia transition-colors hover:bg-lime hover:text-petroleo"
            >
              Pedir novo link
            </Link>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
