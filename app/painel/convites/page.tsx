import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sessaoAtual } from "@/lib/sessao";
import { organizacoesDe } from "@/lib/organizacao";
import { listarPendentes } from "@/lib/convites";
import { Pagina } from "@/components/comum/Pagina";
import { Secao } from "@/components/comum/Secao";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Aviso } from "@/components/painel/Aviso";
import { Campo } from "@/components/painel/Campo";
import { NavPainel } from "@/components/painel/NavPainel";
import { convidarAction, revogarAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Convites",
  robots: { index: false, follow: false },
};

const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

/**
 * `/painel/convites` — convidar gente pra administrar a organização.
 *
 * Fora do route-group `(interno)` de propósito (frente C é dona daquele
 * layout): esta rota traz o próprio Header/Footer e guarda a sessão sozinha.
 * O que ela passou a trazer junto é a `<NavPainel>` — antes, quem caía aqui
 * ficava sem o caminho de volta pro painel.
 */
export default async function ConvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string; revogado?: string }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const orgs = await organizacoesDe(sessao.user.id);
  const { ok, erro, revogado } = await searchParams;

  const porOrg = await Promise.all(
    orgs.map(async (o) => ({
      org: o,
      pendentes: await listarPendentes(sessao.user.id, o.id),
    })),
  );

  return (
    <>
      <Header />
      <NavPainel />
      <Pagina
        eyebrow="Sua organização"
        titulo="Convites"
        voltar={{ href: "/", texto: "Voltar pro início" }}
        descricao="Convide outra pessoa para administrar sua organização. Quem aceita passa a gerenciar comunidades, eventos e inscritos — por isso o convite é nominal, por e-mail, e não um link aberto."
      >
        {ok ? (
          <Aviso>
            Convite enviado para <strong>{ok}</strong>. Ele expira em 7 dias.
          </Aviso>
        ) : null}
        {revogado ? <Aviso>Convite revogado.</Aviso> : null}
        {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

        {orgs.length === 0 ? (
          <EstadoVazio
            titulo="Você ainda não administra nenhuma organização"
            descricao="Cadastre uma comunidade primeiro — ela cria a sua organização. Aí você pode convidar outras pessoas pra ajudar a administrar."
            acao={
              <Link href="/painel/nova" className={buttonVariants()}>
                Cadastrar comunidade
              </Link>
            }
          />
        ) : (
          porOrg.map(({ org, pendentes }) => (
            <Secao key={org.id} titulo={org.nome} destaque>
              <form
                action={convidarAction}
                className="flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-start"
              >
                <input type="hidden" name="organizationId" value={org.id} />
                <Campo
                  rotulo="E-mail de quem vai administrar"
                  className="flex-1"
                >
                  <Input
                    type="email"
                    name="email"
                    required
                    placeholder="pessoa@exemplo.com"
                  />
                </Campo>
                <Button type="submit" className="sm:mt-6">
                  Convidar
                </Button>
              </form>

              <h3 className="eyebrow mt-8">Convites pendentes</h3>
              {pendentes.length === 0 ? (
                <p className="mt-2 text-sm text-foreground/60">
                  Nenhum convite pendente.
                </p>
              ) : (
                <ul className="mt-3 max-w-2xl space-y-2">
                  {pendentes.map((c) => (
                    <li key={c.id}>
                      <Card className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                        <span>
                          <strong>{c.email}</strong>
                          <span className="ml-2 tabular-nums text-foreground/60">
                            {c.expirado
                              ? "expirado"
                              : `expira em ${fmt.format(c.expiraEm)}`}
                          </span>
                        </span>
                        <form action={revogarAction}>
                          <input
                            type="hidden"
                            name="organizationId"
                            value={org.id}
                          />
                          <input type="hidden" name="conviteId" value={c.id} />
                          <Button type="submit" variant="outline" size="sm">
                            Revogar
                          </Button>
                        </form>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </Secao>
          ))
        )}
      </Pagina>
      <Footer />
    </>
  );
}
