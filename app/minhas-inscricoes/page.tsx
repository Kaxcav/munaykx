import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sessaoAtual } from "@/lib/sessao";
import { prisma } from "@/lib/db";
import { formatarDataEvento } from "@/lib/events";
import { acentoDaModalidade, classesDoAcento } from "@/lib/modalidades";
import {
  ABAS,
  contarPorAba,
  ehAbaValida,
  pertenceAAba,
  selo,
  type AbaInscricoes,
} from "@/lib/inscricoes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minhas inscrições",
  robots: { index: false, follow: false },
};

/**
 * MINHAS INSCRIÇÕES — briefing 07/08/2026, item 9.
 *
 * Antes: duas seções empilhadas ("Próximas" e "Já aconteceram"), sem filtro.
 * Agora: os três chips que o PO pediu — Ativos, Encerrados, Pagos.
 *
 * ── O FILTRO É POR URL, E NÃO POR ESTADO DE COMPONENTE ───────────────────
 *
 * `?aba=encerrados`, com `<Link>`. A página continua server component: zero
 * JavaScript novo, o botão voltar funciona, o link é compartilhável e
 * recarregar não perde o filtro. É o mesmo padrão dos filtros de
 * `/comunidades` — coerência que também é o motivo de não ter virado
 * `useState`.
 *
 * A contagem em cada chip vem SEMPRE do conjunto inteiro, nunca do recorte
 * filtrado: chip que mostra "0" só porque você está em outra aba não informa
 * nada.
 */
export default async function MinhasInscricoesPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const { aba: abaBruta } = await searchParams;
  const aba: AbaInscricoes = ehAbaValida(abaBruta) ? abaBruta : "ativos";

  const inscricoes = await prisma.rsvp.findMany({
    where: { userId: sessao.user.id },
    include: { event: { include: { community: true } } },
    orderBy: { event: { startsAt: "asc" } },
  });

  const agora = new Date();
  const contagem = contarPorAba(inscricoes, agora);
  const visiveis = inscricoes.filter((r) => pertenceAAba(r, aba, agora));

  // Encerrados lê melhor do mais recente pro mais antigo — histórico se
  // consulta de trás pra frente.
  if (aba !== "ativos") visiveis.reverse();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-16">
        <p className="eyebrow">Sua conta</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Minhas inscrições
        </h1>
        <p className="mt-4 max-w-xl text-petroleo/70">
          Tudo que você confirmou com o e-mail <strong>{sessao.user.email}</strong>{" "}
          — inclusive o que foi feito antes de você criar a conta.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/perfil" className="font-medium underline underline-offset-4 hover:text-salvia-deep">
            Meu perfil
          </Link>
          <span aria-hidden className="text-petroleo/25">·</span>
          <Link href="/meus-ingressos" className="font-medium underline underline-offset-4 hover:text-salvia-deep">
            Meus ingressos
          </Link>
        </div>

        {/* Chips — `aria-current` diz ao leitor de tela qual está ativo; só
            cor não conta essa informação. */}
        <nav aria-label="Filtrar inscrições" className="mt-10">
          <ul className="flex flex-wrap gap-2">
            {ABAS.map((a) => {
              const ativo = a.id === aba;
              return (
                <li key={a.id}>
                  <Link
                    href={`/minhas-inscricoes?aba=${a.id}`}
                    aria-current={ativo ? "page" : undefined}
                    className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm transition-colors ${
                      ativo
                        ? "border-salvia bg-salvia-soft font-semibold text-salvia-deep"
                        : "border-petroleo/20 bg-white/60 text-petroleo/70 hover:border-petroleo/40"
                    }`}
                  >
                    {a.rotulo}
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
                        ativo ? "bg-salvia text-areia" : "bg-petroleo/10 text-petroleo/60"
                      }`}
                    >
                      {contagem[a.id]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-petroleo/55">
            {ABAS.find((a) => a.id === aba)?.descricao}
          </p>
        </nav>

        {visiveis.length === 0 ? (
          <Vazio aba={aba} temAlguma={inscricoes.length > 0} />
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {visiveis.map((r) => {
              const acento = acentoDaModalidade(r.event.community.modalidade);
              const cor = classesDoAcento(acento);
              const s = selo(r, agora);
              return (
                <li
                  key={r.id}
                  className={`rounded-card border border-petroleo/10 p-6 ${cor.fundo}`}
                >
                  <span aria-hidden className={`block h-1 w-10 rounded-full ${cor.traco}`} />
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="font-display text-lg font-bold">{r.event.titulo}</p>
                    <span
                      className={`rounded-full border px-3 py-0.5 font-mono text-[11px] uppercase tracking-wider ${s.classe}`}
                    >
                      {s.rotulo}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-petroleo/70">
                    {formatarDataEvento(r.event.startsAt)} · {r.event.community.nome}
                  </p>
                  {!r.event.gratuito && (
                    <p className={`mt-1 font-mono text-xs uppercase tracking-wider ${cor.tinta}`}>
                      Evento pago
                    </p>
                  )}
                  <Link
                    href={`/rsvp/${r.token}`}
                    className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
                  >
                    Gerenciar inscrição
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Footer />
    </>
  );
}

/**
 * Estado vazio ESPECÍFICO por aba. Um texto genérico ("nada aqui") faria a
 * aba Pagos parecer defeito — quando na verdade ingresso pago ainda não
 * existe no produto. Ver a nota em `lib/inscricoes.ts`.
 */
function Vazio({ aba, temAlguma }: { aba: AbaInscricoes; temAlguma: boolean }) {
  const conteudo = {
    ativos: {
      titulo: temAlguma ? "Nada marcado por enquanto" : "Sua agenda começa aqui",
      texto:
        "Quando você confirmar presença em algum evento, ele aparece nesta lista automaticamente.",
      cta: { href: "/comunidades", rotulo: "Achar um rolê" },
    },
    encerrados: {
      titulo: "Nenhum evento passado ainda",
      texto:
        "Assim que a primeira experiência acontecer, ela fica guardada aqui — inclusive as que você cancelar.",
      cta: { href: "/comunidades", rotulo: "Descobrir comunidades" },
    },
    pagos: {
      titulo: "Nenhuma compra por aqui",
      texto:
        "Ingresso pago ainda não existe na MUNAY — por enquanto todo evento é gratuito. Quando abrir venda, sua compra aparece nesta aba com recibo e ingresso.",
      cta: { href: "/meus-ingressos", rotulo: "Ver meus ingressos" },
    },
  }[aba];

  return (
    <div className="mt-8 max-w-xl rounded-card border border-petroleo/10 bg-white/70 p-8">
      <p className="font-display text-xl font-bold">{conteudo.titulo}</p>
      <p className="mt-2 leading-relaxed text-petroleo/70">{conteudo.texto}</p>
      <Link
        href={conteudo.cta.href}
        className="mt-6 inline-block rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
      >
        {conteudo.cta.rotulo}
      </Link>
    </div>
  );
}
