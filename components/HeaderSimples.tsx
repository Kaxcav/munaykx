import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/**
 * Header sem sessão — para os error boundaries, que são Client Components
 * e por isso não podem importar `next/headers`. Mesma casca visual do
 * Header normal, só sem o bloco de conta (numa tela de erro isso não faz
 * falta e evita depender do banco justamente quando ele pode estar fora).
 */
export default function HeaderSimples() {
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
          <Link href="/#como-funciona" className="text-sm font-medium hover:opacity-70">
            Como funciona
          </Link>
          <Link href="/comunidades" className="text-sm font-medium hover:opacity-70">
            Comunidades
          </Link>
          <Link href="/#organizador" className="text-sm font-medium hover:opacity-70">
            Organizadores
          </Link>
        </nav>

        <Link
          href="/#cadastro"
          className={buttonVariants()}
        >
          Entrar na lista
        </Link>
      </div>
    </header>
  );
}
