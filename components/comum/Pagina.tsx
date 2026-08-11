import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * `<Pagina>` — o container padrão de toda tela da MUNAY.
 *
 * A régua desta rodada é "a tela parece irmã da `/mapa`?". A `/mapa` é a
 * tela-referência porque foi a última construída inteira dentro do padrão, e
 * a abertura dela é sempre a mesma sequência: `eyebrow` mono → `h1` display →
 * uma frase de descrição → conteúdo, tudo em `mx-auto max-w-6xl px-5 py-20`.
 *
 * Isso estava copiado à mão em todas as telas, com deriva: `py-20` numa,
 * `py-24` noutra; `mb-3` no eyebrow numa, `mt-3` no h1 noutra. Nenhuma dessas
 * diferenças foi decidida — todas foram digitadas. É exatamente o tipo de
 * ruído que faz um site parecer feito por cinco pessoas.
 *
 * NÃO é client component e não pode virar: ele envolve o `<main>` de páginas
 * que são server components e leem banco.
 *
 * SOBRE O VOCABULÁRIO DE COR: aqui e em `components/ui/*` a cor sai dos
 * tokens do shadcn (`foreground`, `primary`) e não dos da marca
 * (`petroleo`, `areia`) — porque estes componentes servem o site público E o
 * interno, e um componente compartilhado não pode falar duas línguas. Não há
 * mudança visual nenhuma nisso: `--foreground` é `hexParaHsl(brand.petroleo)`
 * e `--primary` também (`lib/tema.ts`), então `text-foreground/70` rende
 * exatamente o mesmo pixel que o `text-petroleo/70` que estava escrito antes.
 * A paleta não mudou — mudou de onde o componente compartilhado a lê.
 *
 * (E não, o valor não vai escrito aqui em hex nem em comentário: o
 * `verificar:higiene` reprova, e com razão — comentário com hex envelhece
 * mentindo. A fonte é `lib/brand.ts`.)
 */
export function Pagina({
  eyebrow,
  titulo,
  descricao,
  voltar,
  acoes,
  tamanho = "padrao",
  className,
  children,
}: {
  /**
   * A etiqueta mono que abre a tela (ex.: "Descoberta").
   *
   * Aceita nó e não só texto porque em tela de detalhe o eyebrow carrega
   * companhia — a `/comunidades/[slug]` põe a modalidade e, quando é
   * conteúdo ilustrativo, o selo "exemplo" (regra 3) na mesma linha.
   */
  eyebrow?: React.ReactNode;
  titulo: React.ReactNode;
  /** Uma frase. Se precisar de duas, provavelmente é conteúdo, não descrição. */
  descricao?: React.ReactNode;
  /** Link "← voltar" acima do cabeçalho. */
  voltar?: { href: string; texto: string };
  /** Botões à direita do título (some pra baixo no mobile). */
  acoes?: React.ReactNode;
  /**
   * `padrao` = tela de lista. `grande` = tela de detalhe, onde o nome da
   * coisa é o assunto (a `/comunidades/[slug]` usa assim).
   */
  tamanho?: "padrao" | "grande";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className={cn("mx-auto max-w-6xl px-5 py-20", className)}>
      {voltar && (
        <Link
          href={voltar.href}
          className="font-mono text-xs uppercase tracking-[0.14em] text-foreground/60 transition-colors hover:text-foreground"
        >
          ← {voltar.texto}
        </Link>
      )}

      <div
        className={cn(
          "flex flex-wrap items-end justify-between gap-x-6 gap-y-4",
          voltar && "mt-8",
        )}
      >
        <div className="max-w-3xl">
          {eyebrow && (
            <div className="eyebrow mb-3 flex flex-wrap items-center gap-3">
              {eyebrow}
            </div>
          )}
          <h1
            className={cn(
              "font-display font-extrabold tracking-tight",
              tamanho === "grande"
                ? "text-4xl sm:text-5xl"
                : "text-3xl sm:text-4xl",
            )}
          >
            {titulo}
          </h1>
          {descricao && (
            <p className="mt-4 max-w-2xl text-lg text-foreground/70">{descricao}</p>
          )}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-3">{acoes}</div>}
      </div>

      {children}
    </main>
  );
}
