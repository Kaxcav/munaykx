import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Ingresso from "@/components/Ingresso";
import { sessaoAtual } from "@/lib/sessao";
import { prisma } from "@/lib/db";
import { situacaoDe } from "@/lib/inscricoes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meus ingressos",
  robots: { index: false, follow: false },
};

/**
 * MEUS INGRESSOS — briefing 07/08/2026, item 12.
 *
 * "A área de ingressos deve fugir do padrão minimalista das demais telas.
 * Aqui a proposta é o oposto."
 *
 * ── POR QUE A PÁGINA INTEIRA É ESCURA ────────────────────────────────────
 *
 * O site é areia clara em toda tela. Esta é petróleo com verde forte, e a
 * quebra é o ponto: o briefing pede uma seção que se sinta DIFERENTE, e
 * mudar só o card dentro de uma página clara não muda a sensação — muda a
 * decoração. Além disso, ingresso sobre fundo escuro é o que a pessoa já viu
 * a vida toda em show e cinema, e é sobre fundo escuro que o verde da marca
 * fica realmente chamativo (sobre areia ele lava).
 *
 * Cabeçalho próprio (`CabecalhoCarteira`, no fim do arquivo) em vez do
 * `Header` ou do `HeaderSimples`: os dois existentes são claros e virariam
 * uma faixa branca colada no topo. Menos navegação aqui também é decisão —
 * quem abre o ingresso quer ver o ingresso.
 *
 * ── ⚠️ O NOME "INGRESSO" ESTÁ ADIANTADO, DE PROPÓSITO ────────────────────
 *
 * Não existe pagamento no MUNAY (ver `lib/inscricoes.ts`). O que esta tela
 * mostra hoje é a CONFIRMAÇÃO DE INSCRIÇÃO — que já cumpre a função de
 * ingresso: prova que a pessoa tem lugar, com código verificável na entrada.
 * O briefing pediu a direção visual da seção de ingressos; ela está aqui,
 * pronta pra receber o dado de compra quando ele existir, sem redesenho.
 */
export default async function MeusIngressosPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const inscricoes = await prisma.rsvp.findMany({
    where: { userId: sessao.user.id },
    include: { event: { include: { community: true } } },
    orderBy: { event: { startsAt: "asc" } },
  });

  const agora = new Date();
  const valendo = inscricoes.filter((r) => situacaoDe(r, agora) === "ativa");
  const passados = inscricoes
    .filter((r) => situacaoDe(r, agora) !== "ativa")
    .reverse();

  return (
    <div className="min-h-screen bg-petroleo text-areia">
      <CabecalhoCarteira />

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-lime">
          Sua carteira
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Meus ingressos
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-areia/70">
          Tudo que você tem em mãos, com data, local e código. Nada escondido
          atrás de clique.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link
            href="/minhas-inscricoes"
            className="text-areia/70 underline underline-offset-4 hover:text-lime"
          >
            Todas as inscrições
          </Link>
          <span aria-hidden className="text-areia/25">·</span>
          <Link
            href="/perfil"
            className="text-areia/70 underline underline-offset-4 hover:text-lime"
          >
            Meu perfil
          </Link>
        </div>

        {inscricoes.length === 0 ? (
          <div className="mt-12 max-w-xl rounded-card border border-areia/20 bg-petroleo-soft p-8">
            <p className="font-display text-2xl font-bold">
              Sua carteira está vazia
            </p>
            <p className="mt-2 leading-relaxed text-areia/70">
              Confirmou presença em algum evento? Ele vira ingresso aqui na
              hora, com código e tudo.
            </p>
            <Link
              href="/comunidades"
              className="mt-6 inline-block rounded-full bg-lime px-6 py-3 text-sm font-bold text-petroleo transition-opacity hover:opacity-90"
            >
              Achar um rolê
            </Link>
          </div>
        ) : (
          <>
            <Secao
              titulo="Valendo agora"
              vazio="Nenhum ingresso ativo no momento."
              itens={valendo}
            />
            <Secao titulo="Histórico" vazio="" itens={passados} />
          </>
        )}
      </main>
    </div>
  );
}

/**
 * Cabeçalho próprio, escuro.
 *
 * Nem o `Header` nem o `HeaderSimples` servem aqui: os dois são
 * `bg-areia/90` (claros) e ficariam como uma faixa branca colada no topo de
 * uma página petróleo. Reaproveitar o componente errado sairia mais caro que
 * estas 20 linhas — e a navegação enxuta é intencional (ver a nota no topo:
 * quem abre a carteira quer ver a carteira).
 */
function CabecalhoCarteira() {
  return (
    <header className="border-b border-areia/12">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
          MUNAY<span className="text-lime">.</span>
        </Link>
        <Link
          href="/comunidades"
          className="rounded-full border border-areia/25 px-5 py-2 text-sm font-semibold transition-colors hover:border-lime hover:text-lime"
        >
          Descobrir
        </Link>
      </div>
    </header>
  );
}

function Secao({
  titulo,
  itens,
  vazio,
}: {
  titulo: string;
  itens: React.ComponentProps<typeof Ingresso>["dados"][];
  vazio: string;
}) {
  if (itens.length === 0 && !vazio) return null;

  return (
    <section className="mt-14">
      <div className="flex items-center gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-areia/55">
          {titulo}
        </h2>
        <span aria-hidden className="h-px flex-1 bg-areia/15" />
        <span className="font-mono text-xs text-areia/40">{itens.length}</span>
      </div>

      {itens.length === 0 ? (
        <p className="mt-4 text-sm text-areia/50">{vazio}</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {itens.map((r) => (
            <Ingresso key={r.id} dados={r} />
          ))}
        </div>
      )}
    </section>
  );
}
