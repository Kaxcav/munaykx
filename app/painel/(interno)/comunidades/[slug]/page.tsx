import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadeDoUsuario, eventosDoUsuario } from "@/lib/organizacao";
import { formatarDataEvento } from "@/lib/events";
import { Pagina } from "@/components/comum/Pagina";
import { Secao } from "@/components/comum/Secao";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Aviso } from "@/components/painel/Aviso";
import { Campo, CampoCheck } from "@/components/painel/Campo";
import CamposGuia from "@/components/painel/CamposGuia";
import { editarComunidadeAction } from "../../actions";

/**
 * Gerenciar UMA comunidade da pessoa: editar os dados operacionais e ver/gerir
 * os eventos dela. `comunidadeDoUsuario` devolve `null` quando não é dela — e
 * a página vira **404, nunca 403**.
 */
export default async function GerenciarComunidade({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const { slug } = await params;
  const com = await comunidadeDoUsuario(sessao.user.id, slug);
  if (!com) notFound(); // não é dela (ou não existe): 404, nunca 403

  const { ok, erro } = await searchParams;
  const eventos = await eventosDoUsuario(sessao.user.id, {
    comunidadeSlug: slug,
    incluirPassados: true,
  });

  return (
    <Pagina
      eyebrow="Comunidade"
      titulo={com.nome}
      descricao={
        <span className="font-mono text-sm text-foreground/60">/{com.slug}</span>
      }
      tamanho="grande"
    >
      {ok ? <Aviso>Alterações salvas ✓</Aviso> : null}
      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

      <form action={editarComunidadeAction} className="mt-8 space-y-4">
        <input type="hidden" name="slug" value={com.slug} />
        <Campo rotulo="Descrição">
          <Textarea name="descricao" defaultValue={com.descricao ?? ""} rows={3} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Horários">
            <Input name="horarios" defaultValue={com.horarios ?? ""} />
          </Campo>
          <Campo rotulo="Local">
            <Input name="local" defaultValue={com.local ?? ""} />
          </Campo>
          <Campo rotulo="Nível">
            <Input name="nivel" defaultValue={com.nivel ?? ""} />
          </Campo>
          <div className="flex flex-col justify-end gap-3 pb-2">
            <CampoCheck
              nome="ativo"
              defaultChecked={com.ativo}
              rotulo="Ativa (aparece no site)"
            />
            <CampoCheck
              nome="acolheIniciante"
              defaultChecked={com.acolheIniciante}
              rotulo="Acolhe iniciantes (quem tá começando é bem-vindo)"
            />
          </div>
        </div>
        <CamposGuia
          guiaAtual={com.guiaIniciante}
          acolheIniciante={com.acolheIniciante}
        />
        <Button type="submit">Salvar</Button>
      </form>

      {/* As três sub-rotas da comunidade. Eram três `div`s com a mesma receita
          de card copiada; agora são o mesmo `<Card>`, com a mesma altura. */}
      <div className="mt-12 space-y-4">
        <AtalhoDaComunidade
          titulo="Avisos"
          descricao="Mudou o local, caiu por chuva: avise quem segue sem depender do grupo de WhatsApp."
          href={`/painel/comunidades/${encodeURIComponent(com.slug)}/avisos`}
          rotulo="Avisar quem segue →"
        />
        {/* Frente D: link aberto — concede seguir, nunca poder. */}
        <AtalhoDaComunidade
          titulo="Link de convite"
          descricao="Um link pro grupo de WhatsApp. Quem abrir passa a seguir — não vira organizador nem vê inscritos."
          href={`/painel/comunidades/${encodeURIComponent(com.slug)}/convite`}
          rotulo={com.codigoConvite ? "Ver o link →" : "Criar link →"}
        />
        {/* FASE 0 do mapa: horário estruturado é o que coloca a comunidade no
            eixo de tempo. Fica como sub-rota (igual avisos e convite) porque é
            uma lista, e lista não cabe num form de salvar-tudo. */}
        <AtalhoDaComunidade
          titulo="Horários da semana"
          descricao={
            <>
              Os dias e horas que se repetem. É o que faz sua comunidade aparecer
              quando alguém filtra o mapa por &ldquo;terça 6h&rdquo;.
            </>
          }
          href={`/painel/comunidades/${encodeURIComponent(com.slug)}/horarios`}
          rotulo="Cadastrar horários →"
        />
      </div>

      <Secao
        titulo="Eventos"
        destaque
        acoes={
          <Link
            href={`/painel/eventos/novo?comunidade=${encodeURIComponent(com.slug)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            + Novo evento
          </Link>
        }
      >
        {eventos.length === 0 ? (
          <EstadoVazio
            className="mt-0"
            titulo="Nenhum evento ainda"
            descricao="Crie o primeiro no botão acima — ele entra na descoberta assim que a data estiver no futuro."
          />
        ) : (
          <ul className="space-y-3">
            {eventos.map((e) => (
              <li key={e.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-semibold">
                      {e.titulo}
                      {e.canceladoEm ? (
                        <Badge variant="demo" className="ml-2 align-middle">
                          cancelado
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-sm tabular-nums text-foreground/70">
                      {formatarDataEvento(e.startsAt)} · {e._count.rsvps}{" "}
                      inscrito(s)
                    </p>
                  </div>
                  <Link
                    href={`/painel/eventos/${e.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Gerenciar
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </Pagina>
  );
}

/** Card de entrada pra uma sub-rota da comunidade (avisos, convite, horários). */
function AtalhoDaComunidade({
  titulo,
  descricao,
  href,
  rotulo,
}: {
  titulo: string;
  descricao: React.ReactNode;
  href: string;
  rotulo: string;
}) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="max-w-xl">
        <p className="font-display text-lg font-bold">{titulo}</p>
        <p className="mt-1 text-sm text-foreground/70">{descricao}</p>
      </div>
      <Link
        href={href}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {rotulo}
      </Link>
    </Card>
  );
}
