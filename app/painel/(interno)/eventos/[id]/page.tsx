import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { inscritosDoEvento } from "@/lib/organizacao";
import { formatDatetimeLocal, formatarDataAdmin } from "@/lib/admin";
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
    <>
      <Link
        href={`/painel/comunidades/${evento.community.slug}`}
        className="font-mono text-xs uppercase tracking-wider text-petroleo/60 hover:text-petroleo"
      >
        ← {evento.community.nome}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
        {evento.titulo}
        {cancelado_ ? (
          <span className="ml-3 align-middle text-sm font-normal text-destructive">
            cancelado
          </span>
        ) : null}
      </h1>

      {/* Texto pronto pro WhatsApp (PR3): o canal real do grupo. Não brigamos
          com o WhatsApp — a gente entrega o texto + link prontos pra colar. Some
          no evento cancelado (não faz sentido chamar pra o que não vai rolar). */}
      {!cancelado_ ? (
        <div className="mt-6 rounded-2xl border border-petroleo/10 bg-white/70 p-5">
          <p className="font-display text-lg font-bold">Chame o grupo</p>
          <p className="mt-1 text-sm text-petroleo/80">
            Texto e link prontos pra colar no WhatsApp da galera.
          </p>
          <CompartilharBotoes
            className="mt-3"
            url={urlEvento(evento.slug)}
            texto={textoCompartilharEvento(evento)}
            titulo={evento.titulo}
          />
        </div>
      ) : null}

      {ok ? (
        <p className="mt-6 rounded-xl border border-petroleo/15 bg-white/70 p-4 text-sm">
          Alterações salvas ✓
        </p>
      ) : null}
      {cancelado ? (
        <p className="mt-6 rounded-xl border border-petroleo/15 bg-white/70 p-4 text-sm">
          Evento cancelado. Os inscritos foram avisados por e-mail (quando o
          e-mail está configurado). Ninguém foi promovido da lista de espera.
        </p>
      ) : null}
      {erro ? (
        <p className="mt-6 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      {/* ── Editar ────────────────────────────────────────────────── */}
      <form action={editarEventoAction} className="mt-8 space-y-4">
        <input type="hidden" name="id" value={evento.id} />
        <input type="hidden" name="communityId" value={evento.communityId} />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Título</span>
          <input
            name="titulo"
            defaultValue={evento.titulo}
            required
            className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Slug</span>
            <input
              name="slug"
              defaultValue={evento.slug}
              required
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Data e hora</span>
            <input
              type="datetime-local"
              name="startsAt"
              defaultValue={formatDatetimeLocal(evento.startsAt)}
              required
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Local</span>
            <input
              name="local"
              defaultValue={evento.local ?? ""}
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Capacidade</span>
            <input
              name="capacidade"
              type="number"
              min={1}
              defaultValue={evento.capacidade ?? ""}
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
          <CampoDuracao defaultValue={duracaoAtual} />
        </div>
        <CampoModoRota
          modoRota={evento.modoRota}
          origem={evento.origem ?? ""}
          destino={evento.destino ?? ""}
          percursoObs={evento.percursoObs ?? ""}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="gratuito"
            defaultChecked={evento.gratuito}
          />
          Gratuito
        </label>
        <button
          type="submit"
          className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
        >
          Salvar
        </button>
      </form>

      {/* ── Inscritos ─────────────────────────────────────────────── */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">
          Inscritos ({inscritos.length})
        </h2>
        <a
          href={`/painel/eventos/${evento.id}/csv`}
          className="rounded-full border border-petroleo/20 px-5 py-2 text-sm font-semibold transition-colors hover:border-petroleo/50"
        >
          Baixar CSV deste evento
        </a>
      </div>

      {inscritos.length === 0 ? (
        <p className="mt-6 text-petroleo/70">Ninguém inscrito ainda.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {inscritos.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-petroleo/10 p-4"
            >
              <div>
                <p className="font-semibold">
                  {i.nome}
                  {i.status === "lista_espera" ? (
                    <span className="ml-2 text-xs font-normal text-petroleo/60">
                      lista de espera
                    </span>
                  ) : null}
                  {i.canceledAt ? (
                    <span className="ml-2 text-xs font-normal text-destructive">
                      cancelou
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-petroleo/70">
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
                  <button
                    type="submit"
                    className="rounded-full border border-petroleo/20 px-4 py-2 text-xs font-semibold transition-colors hover:border-petroleo/50"
                  >
                    {i.checkinEm ? "Desmarcar" : "Marcar presença"}
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {/* ── Cancelar ──────────────────────────────────────────────── */}
      {!cancelado_ ? (
        <form action={cancelarEventoAction} className="mt-12">
          <input type="hidden" name="id" value={evento.id} />
          <button
            type="submit"
            className="rounded-full border border-destructive/40 px-5 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            Cancelar evento
          </button>
          <p className="mt-2 text-xs text-petroleo/60">
            Cancelar avisa os inscritos por e-mail e tira o evento da descoberta.
            Não apaga o histórico e não promove a lista de espera.
          </p>
        </form>
      ) : null}
    </>
  );
}
