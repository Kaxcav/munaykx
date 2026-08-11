import Link from "next/link";
import { sessaoAtual } from "@/lib/sessao";
import SairButton from "@/components/SairButton";
import { buttonVariants } from "@/components/ui/button";

export default async function Header() {
  // Sessão lida no servidor, de verdade — não o cookie otimista.
  // Via `sessaoAtual()` e nunca `auth.api.getSession()` direto: este
  // componente está em TODA página, então um erro aqui derruba o site
  // inteiro em vez de só o login (ver lib/sessao.ts).
  const sessao = await sessaoAtual();

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
          <Link href="/mapa" className="text-sm font-medium hover:opacity-70">
            Mapa
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
            {/* STORY-011: a conta deixou de ser uma tela só. `/perfil` é a
                porta (é lá que estão os dados e os links pras outras duas) —
                empilhar três botões aqui encheria o header em telas médias. */}
            <Link
              href="/meus-ingressos"
              className="hidden text-sm font-medium hover:opacity-70 sm:block"
            >
              Ingressos
            </Link>
            <Link
              href="/perfil"
              className={buttonVariants()}
            >
              Minha conta
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
              className={buttonVariants()}
            >
              Entrar na lista
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
