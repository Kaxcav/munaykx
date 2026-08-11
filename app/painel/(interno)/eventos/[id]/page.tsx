import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { inscritosDoEvento } from "@/lib/organizacao";
import { formatDatetimeLocal, formatarDataAdmin } from "@/lib/admin";
import { Pagina } from "@/components/comum/Pagina";
import { Secao } from "@/components/comum/Secao";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Aviso } from "@/components/painel/Aviso";
import { Campo, CampoCheck } from "@/components/painel/Campo";
import CampoDuracao from "@/components/painel/CampoDuracao";
import CampoModoRota from "@/components/painel/CampoModoRota";
import CompartilharBotoes from "@/components/CompartilharBotoes";
import { textoCompartilharEvento, urlEvento } from "@/lib/compartilhar";
import {
  cancelarEventoAction,
  editarEventoAction,
  marcarCheckinAction,
} from "../../actions";

/**
 * Gerenciar UM evento: editar, cancelar, ver inscritos, marcar presença e
 * exportar o CSV **daquele** evento. `inscritosDoEvento` devolve `null` quando
 * o evento não é da pessoa — a página vira **404, nunca 403**, e nenhum dado
 * pessoal de inscrito de outra comunidade chega perto daqui.
 */
export default async function GerenciarEvento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string; cancelado?: string }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const { id } = await params;
  const dados = await inscritosDoEvento(sessao.user.id, id);
  if (!dados) notFound(); // não é dela (ou não existe): 404

  const { evento, inscritos } = dados;
  const { ok, erro, cancelado } = await searchParams;
  const cancelado_ = Boolean(evento.canceladoEm);
  // Pré-preenche a duração a partir do fim guardado (terminaEm − startsAt).
  const duracaoAtual = evento.terminaEm
    ? String(
        Math.round((evento.terminaEm.getTime() - evento.startsAt.getTime()) / 60_000),
      )
    : "";

  return (
    <Pagina
      eyebrow={
        <>
          Evento
          {cancelado_ ? <Badge variant="demo">cancelado</Badge> : null}
        </>
      }
      titulo={evento.titulo}
      tamanho="grande"
      voltar={{
        href: `/painel/comunidades/${evento.community.slug}`,
        texto: evento.community.nome,
      }}
    >
      {/* Texto pronto pro WhatsApp (PR3): o canal real do grupo. Não brigamos
          com o WhatsApp — a gente entrega o texto + link prontos pra colar. Some
          no evento cancelado (não faz sentido chamar pra o que não vai rolar). */}
      {!cancelado_ ? (
        <Card className="mt-8 p-5">
          <p className="font-display text-lg font-bold">Chame o grupo</p>
          <p className="mt-1 text-sm text-foreground/80">
            Texto e link prontos pra colar no WhatsApp da galera.
          </p>
          <CompartilharBotoes
            className="mt-3"
            url={urlEvento(evento.slug)}
            texto={textoCompartilharEvento(evento)}
            titulo={evento.titulo}
          />
        </Card>
      ) : null}

      {ok ? <Aviso>Alterações salvas ✓</Aviso> : null}
      {cancelado ? (
        <Aviso>
          Evento cancelado. Os inscritos foram avisados por e-mail (quando o
          e-mail está configurado). Ninguém foi promovido da lista de espera.
        </Aviso>
      ) : null}
      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

      {/* ── Editar ────────────────────────────────────────────────── */}
      <form action={editarEventoAction} className="mt-8 space-y-4">
        <input type="hidden" name="id" value={evento.id} />
        <input type="hidden" name="communityId" value={evento.communityId} />
        <Campo rotulo="Título">
          <Input name="titulo" defaultValue={evento.titulo} required />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Slug">
            <Input name="slug" defaultValue={evento.slug} required />
          </Campo>
          <Campo rotulo="Data e hora">
            <Input
              type="datetime-local"
              name="startsAt"
              defaultValue={formatDatetimeLocal(evento.startsAt)}
              required
            />
          </Campo>
          <Campo rotulo="Local">
            <Input name="local" defaultValue={evento.local ?? ""} />
          </Campo>
          <Campo rotulo="Capacidade">
            <Input
              name="capacidade"
              type="number"
              min={1}
              defaultValue={evento.capacidade ?? ""}
            />
          </Campo>
          <CampoDuracao defaultValue={duracaoAtual} />
        </div>
        <CampoModoRota
          modoRota={evento.modoRota}
          origem={evento.origem ?? ""}
          destino={evento.destino ?? ""}
          percursoObs={evento.percursoObs ?? ""}
        />
        <CampoCheck
          nome="gratuito"
          defaultChecked={evento.gratuito}
          rotulo="Gratuito"
        />
        <Button type="submit">Salvar</Button>
      </form>

      {/* ── Inscritos ─────────────────────────────────────────────── */}
      <Secao
        titulo={`Inscritos (${inscritos.length})`}
        destaque
        acoes={
          <>
            <Link
              href={`/painel/eventos/${evento.id}/relatorio`}
              className={buttonVariants({ size: "sm" })}
            >
              Ver relatório
            </Link>
            <a
              href={`/painel/eventos/${evento.id}/csv`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Baixar CSV deste evento
            </a>
          </>
        }
      >
        {inscritos.length === 0 ? (
          <EstadoVazio
            className="mt-0"
            titulo="Ninguém inscrito ainda"
            descricao="Assim que alguém confirmar presença, o nome aparece aqui — e o check-in fica a um clique."
          />
        ) : (
          <ul className="space-y-2">
            {inscritos.map((i) => (
              <li key={i.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">
                      {i.nome}
                      {i.status === "lista_espera" ? (
                        <Badge variant="outline" className="ml-2 align-middle">
                          lista de espera
                        </Badge>
                      ) : null}
                      {i.canceledAt ? (
                        <Badge variant="demo" className="ml-2 align-middle">
                          cancelou
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-sm text-foreground/70">
                      {i.email}
                      {i.whatsapp ? ` · ${i.whatsapp}` : ""}
                      {i.checkinEm
                        ? ` · presente (${formatarDataAdmin(i.checkinEm)})`
                        : ""}
                    </p>
                  </div>
                  {!i.canceledAt ? (
                    <form action={marcarCheckinAction}>
                      <input type="hidden" name="rsvpId" value={i.id} />
                      <input type="hidden" name="eventoId" value={evento.id} />
                      <input
                        type="hidden"
                        name="presente"
                        value={i.checkinEm ? "0" : "1"}
                      />
                      <Button
                        type="submit"
                        variant={i.checkinEm ? "ghost" : "outline"}
                        size="sm"
                      >
                        {i.checkinEm ? "Desmarcar" : "Marcar presença"}
                      </Button>
                    </form>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      {/* ── Cancelar ──────────────────────────────────────────────── */}
      {!cancelado_ ? (
        <Secao titulo="Zona de risco" regua>
          <form action={cancelarEventoAction}>
            <input type="hidden" name="id" value={evento.id} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              Cancelar evento
            </Button>
            <p className="mt-2 max-w-xl text-xs text-foreground/60">
              Cancelar avisa os inscritos por e-mail e tira o evento da descoberta.
              Não apaga o histórico e não promove a lista de espera.
            </p>
          </form>
        </Secao>
      ) : null}
    </Pagina>
  );
}
