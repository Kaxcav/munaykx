import Link from "next/link";
import type { AvisoPublico } from "@/lib/posts";
import CorpoAviso from "@/components/CorpoAviso";

/**
 * Feed de avisos da comunidade no site público (STORY-010, tarefa 5).
 *
 * Paginação por query (`?avisos=N`) em vez de rota nova: rota nova entraria no
 * sitemap e viraria página fina indexável — o mesmo padrão de doorway page que
 * `lib/descoberta.ts` existe pra evitar. As páginas seguintes saem `noindex`
 * (ver `generateMetadata` da página da comunidade).
 *
 * Sem avisos, o bloco simplesmente não aparece: comunidade nova não precisa
 * anunciar que não tem nada a dizer.
 */
export default function FeedAvisos({
  avisos,
  slug,
  pagina,
  temMais,
}: {
  avisos: AvisoPublico[];
  slug: string;
  pagina: number;
  temMais: boolean;
}) {
  if (avisos.length === 0 && pagina === 1) return null;

  const url = (p: number) =>
    p <= 1 ? `/comunidades/${slug}#avisos` : `/comunidades/${slug}?avisos=${p}#avisos`;

  return (
    <section id="avisos" className="mt-16 max-w-3xl scroll-mt-24">
      <p className="eyebrow mb-3">Avisos da comunidade</p>

      {avisos.length === 0 ? (
        <p className="text-petroleo/70">
          Nada por aqui nesta página.{" "}
          <Link href={url(1)} className="underline underline-offset-4">
            Voltar ao começo
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-4">
          {avisos.map((a) => (
            <article
              key={a.id}
              className="rounded-card border border-petroleo/10 bg-white/70 p-6"
            >
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-petroleo/60">
                <time dateTime={a.createdAt.toISOString()}>
                  {a.createdAt.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </time>{" "}
                · {a.autorNome ?? "organizador da comunidade"}
              </p>
              <div className="mt-3">
                <CorpoAviso corpo={a.corpo} />
              </div>
            </article>
          ))}
        </div>
      )}

      {(pagina > 1 || temMais) && (
        <div className="mt-6 flex items-center gap-4 text-sm">
          {pagina > 1 && (
            <Link href={url(pagina - 1)} className="underline underline-offset-4">
              ← Mais recentes
            </Link>
          )}
          {temMais && (
            <Link href={url(pagina + 1)} className="underline underline-offset-4">
              Mais antigos →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
