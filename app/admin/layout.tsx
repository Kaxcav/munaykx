import type { Metadata } from "next";
import Link from "next/link";
import { assertAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Painel interno: sempre dado fresco do banco, nunca pré-renderizado no build.
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/comunidades", label: "Comunidades" },
  { href: "/admin/aprovacoes", label: "Aprovações" },
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/avisos", label: "Avisos" },
  { href: "/admin/conteudo", label: "Conteúdo" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/rsvps", label: "RSVPs" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Segunda barreira: o middleware não é ponto único de falha (STORY-007).
  await assertAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
          <Link href="/admin" className="font-display text-lg font-extrabold">
            MUNAY <span className="text-lime">admin</span>
          </Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-primary-foreground/80 transition-colors hover:text-lime"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            className="ml-auto font-mono text-xs uppercase tracking-wider text-primary-foreground/60 hover:text-primary-foreground"
          >
            ← site
          </Link>
        </div>
      </header>
      {/*
        O `<main>` NÃO fica aqui: quem o desenha é o `<PaginaAdmin>` de cada
        tela (que é o `<Pagina>` do L1 por baixo). Dois `<main>` aninhados
        seriam HTML inválido, e o container tem que morar junto do cabeçalho
        da tela — é o par eyebrow + h1 + descrição que dá a régua da rodada.
      */}
      {children}
    </div>
  );
}
