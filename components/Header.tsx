import Link from "next/link";

export default function Header() {
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

        <Link
          href="/#cadastro"
          className="rounded-full bg-petroleo px-5 py-2.5 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
        >
          Entrar na lista
        </Link>
      </div>
    </header>
  );
}
