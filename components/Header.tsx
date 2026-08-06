import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import SairButton from "@/components/SairButton";

export default async function Header() {
  // Sessão lida no servidor, de verdade — não o cookie otimista.
  const sessao = await auth.api.getSession({ headers: await headers() });

  return (
    <header className="sticky top-0 z-40 border-b border-petroleo/10 bg-areia/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link
          href="/"
          className="font-display text-xl font-extrabold tracking-tight"
        >
          MUNAY
        </Link>

        <nav aria-label="Principal" className="hidden gap-8 md:flex">
          <Link
            href="/#como-funciona"
            className="text-sm font-medium hover:opacity-70"
          >
            Como funciona
          </Link>
          <Link href="/comunidades" className="text-sm font-medium hover:opacity-70">
            Comunidades
          </Link>
          <Link
            href="/#organizador"
            className="text-sm font-medium hover:opacity-70"
          >
            Organizadores
          </Link>
        </nav>

        {sessao ? (
          <div className="flex items-center gap-4">
            <Link
              href="/minhas-inscricoes"
              className="rounded-full bg-petroleo px-5 py-2.5 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
            >
              Minhas inscrições
            </Link>
            <SairButton />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link href="/entrar" className="text-sm font-medium hover:opacity-70">
              Entrar
            </Link>
            <Link
              href="/#cadastro"
              className="rounded-full bg-petroleo px-5 py-2.5 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
            >
              Entrar na lista
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
