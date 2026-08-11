import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Pagina } from "@/components/comum/Pagina";
import { Secao } from "@/components/comum/Secao";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadesDeUsuario, sugestoesDeSeguir } from "@/lib/membership";
import { formatarDataEvento } from "@/lib/events";
import { comunidadesComAvisoDePost } from "@/lib/posts";
import { seguirAction } from "../comunidades/[slug]/seguir-actions";
import { alternarAvisoAction, alternarAvisoPostsAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minhas comunidades",
  robots: { index: false, follow: false },
};

/**
 * ⚠️ ACHADO NA CONFERÊNCIA VISUAL DO LOTE L5 (11/08) — e é BUG PRÉ-EXISTENTE,
 * medido em `origin/main` `b50c4d7` antes de qualquer mudança: em 375px esta
 * tela empurrava a página **37px** pra fora e criava barra horizontal. O
 * culpado é o `shrink-0` no invólucro dos dois toggles, que impede o par de
 * botões de encolher; o rótulo mais longo ("Avisos por e-mail: desligados")
 * então dita a largura da linha inteira.
 *
 * O conserto tem duas partes, e as duas são necessárias: tirar o `shrink-0`
 * (feito abaixo, no invólucro) e deixar o rótulo QUEBRAR — porque o
 * `<Button>` do DS traz `whitespace-nowrap`, certo pro botão curto que ele
 * foi feito pra ser e errado pra um rótulo de trinta caracteres. Não é caso
 * de variante nova no DS: é UM par de botões com rótulo comprido, então é
 * `className` aqui. O `h-auto` vem junto porque, quebrado em duas linhas,
 * `h-9` cortaria o texto.
 *
 * **Desvio confessado (regra 6 do CLAUDE.md):** consertar bug pré-existente
 * não é migração de superfície. Fiz mesmo assim porque é UMA classe, na minha
 * raia, numa tela que este lote reescreveu inteira — sair daqui deixando barra
 * horizontal no celular seria entregar pior do que dá.
 */
const ROTULO_LONGO = "h-auto whitespace-normal py-2 text-left";

/** `/minhas-comunidades` — o que a pessoa segue, com o próximo evento de cada
 *  e o toggle de aviso por e-mail por comunidade (opt-out, decisão 5). */
export default async function MinhasComunidadesPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const [lista, sugestoes, avisoPosts] = await Promise.all([
    comunidadesDeUsuario(sessao.user.id),
    sugestoesDeSeguir(sessao.user.id),
    comunidadesComAvisoDePost(sessao.user.id),
  ]);

  return (
    <>
      <Header />
      <Pagina eyebrow="Sua conta" titulo="Minhas comunidades" className="max-w-3xl">
        {lista.length === 0 ? (
          <EstadoVazio
            titulo="Você ainda não segue nenhuma comunidade"
            descricao={
              <>
                Seguir é o que monta a sua <strong>agenda</strong> e te avisa de
                eventos novos. Comece explorando as comunidades.
              </>
            }
            acao={
              <Link href="/comunidades" className={buttonVariants()}>
                Explorar comunidades
              </Link>
            }
          />
        ) : (
          <ul className="mt-10 space-y-4">
            {lista.map((c) => (
              <li key={c.membershipId}>
                <Card className="bg-card/70 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/comunidades/${c.comunidade.slug}`}
                        className="font-display text-xl font-bold transition-colors hover:text-foreground/70"
                      >
                        {c.comunidade.nome}
                      </Link>
                      <p className="mt-1 text-sm text-foreground/70">
                        {c.comunidade.modalidade} · {c.comunidade.regiao}
                      </p>
                      <p className="mt-2 text-sm text-foreground/80">
                        {c.proximoEvento ? (
                          <>
                            Próximo:{" "}
                            <Link
                              href={`/eventos/${c.proximoEvento.slug}`}
                              className="font-semibold underline underline-offset-4"
                            >
                              {c.proximoEvento.titulo}
                            </Link>{" "}
                            — {formatarDataEvento(c.proximoEvento.startsAt)}
                          </>
                        ) : (
                          <span className="text-foreground/50">
                            Sem eventos futuros por enquanto.
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* Os dois toggles continuam sendo `<form action>` de
                          server action, sem JavaScript no cliente — o que
                          muda é só quem desenha o botão. Trocar por um
                          `<Switch>` do Radix seria transformar um controle
                          que funciona sem JS num que não funciona. */}
                      <form action={alternarAvisoAction}>
                        <input
                          type="hidden"
                          name="communityId"
                          value={c.comunidade.id}
                        />
                        <input
                          type="hidden"
                          name="avisar"
                          value={c.avisarEventos ? "0" : "1"}
                        />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className={ROTULO_LONGO}
                        >
                          {c.avisarEventos
                            ? "Eventos novos: ligados"
                            : "Eventos novos: desligados"}
                        </Button>
                      </form>
                      {/* Opt-in separado (STORY-010): e-mail de aviso é mais
                          frequente e mais miúdo — nasce desligado. */}
                      <form action={alternarAvisoPostsAction}>
                        <input
                          type="hidden"
                          name="communityId"
                          value={c.comunidade.id}
                        />
                        <input
                          type="hidden"
                          name="avisar"
                          value={avisoPosts.has(c.comunidade.id) ? "0" : "1"}
                        />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className={ROTULO_LONGO}
                        >
                          {avisoPosts.has(c.comunidade.id)
                            ? "Avisos por e-mail: ligados"
                            : "Avisos por e-mail: desligados"}
                        </Button>
                      </form>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {sugestoes.length > 0 && (
          <Secao
            titulo="Você já participou destas"
            descricao="Você tem inscrição em eventos delas, mas ainda não segue. Seguir coloca os próximos eventos na sua agenda."
          >
            <ul className="space-y-3">
              {sugestoes.map((s) => (
                <li key={s.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <Link
                      href={`/comunidades/${s.slug}`}
                      className="font-semibold transition-colors hover:text-foreground/70"
                    >
                      {s.nome}
                    </Link>
                    <form action={seguirAction}>
                      <input type="hidden" name="slug" value={s.slug} />
                      <Button type="submit" variant="outline" size="sm">
                        Seguir
                      </Button>
                    </form>
                  </Card>
                </li>
              ))}
            </ul>
          </Secao>
        )}

        <Link
          href="/agenda"
          className={cn(
            "mt-12 inline-block font-mono text-xs uppercase tracking-[0.14em]",
            "text-foreground/60 transition-colors hover:text-foreground",
          )}
        >
          Ver minha agenda →
        </Link>
      </Pagina>
      <Footer />
    </>
  );
}
