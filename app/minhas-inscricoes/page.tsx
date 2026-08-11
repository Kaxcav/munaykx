import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Pagina } from "@/components/comum/Pagina";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
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
 * `useState`. É por isso que o chip aqui é o `<Chip>` do DS (que É um
 * `<Link>`) e não o `<ChipBotao>`.
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
      <Pagina
        eyebrow="Sua conta"
        titulo="Minhas inscrições"
        descricao={
          <>
            Tudo que você confirmou com o e-mail{" "}
            <strong>{sessao.user.email}</strong> — inclusive o que foi feito
            antes de você criar a conta.
          </>
        }
      >
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href="/perfil"
            className="font-medium underline underline-offset-4 hover:text-salvia-deep"
          >
            Meu perfil
          </Link>
          <span aria-hidden className="text-foreground/25">·</span>
          <Link
            href="/meus-ingressos"
            className="font-medium underline underline-offset-4 hover:text-salvia-deep"
          >
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
                  <Chip
                    href={`/minhas-inscricoes?aba=${a.id}`}
                    ativo={ativo}
                    aria-current={ativo ? "page" : undefined}
                    className="px-5 py-2.5"
                  >
                    {a.rotulo}
                    {/* O contador vira `<Badge>` — e a variante muda com o
                        chip porque o fundo muda: dentro do chip ativo
                        (petróleo sólido) um badge `default` seria petróleo
                        sobre petróleo. */}
                    <Badge variant={ativo ? "secondary" : "outline"}>
                      {contagem[a.id]}
                    </Badge>
                  </Chip>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-foreground/55">
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
                <li key={r.id}>
                  {/* O acento de categoria continua vindo de
                      `lib/modalidades.ts` e sobrescreve o `bg-card` do
                      `<Card>` — é a cor que identifica a modalidade, e ela é
                      informação, não decoração. */}
                  <Card className={`h-full p-6 ${cor.fundo}`}>
                    <span
                      aria-hidden
                      className={`block h-1 w-10 rounded-full ${cor.traco}`}
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <p className="font-display text-lg font-bold">
                        {r.event.titulo}
                      </p>
                      <Badge className={s.classe}>{s.rotulo}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-foreground/70">
                      {formatarDataEvento(r.event.startsAt)} ·{" "}
                      {r.event.community.nome}
                    </p>
                    {!r.event.gratuito && (
                      <p
                        className={`mt-1 font-mono text-xs uppercase tracking-wider ${cor.tinta}`}
                      >
                        Evento pago
                      </p>
                    )}
                    <Link
                      href={`/rsvp/${r.token}`}
                      className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
                    >
                      Gerenciar inscrição
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Pagina>
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
    <EstadoVazio
      className="mt-8"
      titulo={conteudo.titulo}
      descricao={<p className="leading-relaxed">{conteudo.texto}</p>}
      acao={
        <Link href={conteudo.cta.href} className={buttonVariants()}>
          {conteudo.cta.rotulo}
        </Link>
      }
    />
  );
}
