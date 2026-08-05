export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-petroleo/10 bg-areia/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <a
          href="#topo"
          className="font-display text-xl font-extrabold tracking-tight"
        >
          MUNAY
        </a>

        <nav aria-label="Principal" className="hidden gap-8 md:flex">
          <a href="#como-funciona" className="text-sm font-medium hover:opacity-70">
            Como funciona
          </a>
          <a href="#comunidades" className="text-sm font-medium hover:opacity-70">
            Comunidades
          </a>
          <a href="#organizador" className="text-sm font-medium hover:opacity-70">
            Organizadores
          </a>
        </nav>

        <a
          href="#cadastro"
          className="rounded-full bg-petroleo px-5 py-2.5 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
        >
          Entrar na lista
        </a>
      </div>
    </header>
  );
}
