import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadeDoUsuario, eventosDoUsuario } from "@/lib/organizacao";
import { formatarDataEvento } from "@/lib/events";
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
    <>
      <p className="eyebrow">Comunidade</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
        {com.nome}
      </h1>
      <p className="mt-1 font-mono text-xs text-petroleo/60">/{com.slug}</p>

      {ok ? (
        <p className="mt-6 rounded-xl border border-petroleo/15 bg-white/70 p-4 text-sm">
          Alterações salvas ✓
        </p>
      ) : null}
      {erro ? (
        <p className="mt-6 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      <form action={editarComunidadeAction} className="mt-8 space-y-4">
        <input type="hidden" name="slug" value={com.slug} />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Descrição</span>
          <textarea
            name="descricao"
            defaultValue={com.descricao ?? ""}
            rows={3}
            className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Horários</span>
            <input
              name="horarios"
              defaultValue={com.horarios ?? ""}
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Local</span>
            <input
              name="local"
              defaultValue={com.local ?? ""}
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Nível</span>
            <input
              name="nivel"
              defaultValue={com.nivel ?? ""}
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input type="checkbox" name="ativo" defaultChecked={com.ativo} />
            Ativa (aparece no site)
          </label>
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input
              type="checkbox"
              name="acolheIniciante"
              defaultChecked={com.acolheIniciante}
            />
            Acolhe iniciantes (quem tá começando é bem-vindo)
          </label>
        </div>
        <button
          type="submit"
          className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
        >
          Salvar
        </button>
      </form>

      {/* STORY-010: entrada do feed de avisos desta comunidade. */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-petroleo/10 bg-white/70 p-5">
        <div>
          <p className="font-display text-lg font-bold">Avisos</p>
          <p className="mt-1 text-sm text-petroleo/70">
            Mudou o local, caiu por chuva: avise quem segue sem depender do
            grupo de WhatsApp.
          </p>
        </div>
        <Link
          href={`/painel/comunidades/${encodeURIComponent(com.slug)}/avisos`}
          className="rounded-full border border-petroleo/20 px-5 py-2 text-sm font-semibold transition-colors hover:border-petroleo/50"
        >
          Avisar quem segue →
        </Link>
      </div>

      {/* Frente D: link aberto — concede seguir, nunca poder. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-petroleo/10 bg-white/70 p-5">
        <div>
          <p className="font-display text-lg font-bold">Link de convite</p>
          <p className="mt-1 text-sm text-petroleo/70">
            Um link pro grupo de WhatsApp. Quem abrir passa a seguir — não vira
            organizador nem vê inscritos.
          </p>
        </div>
        <Link
          href={`/painel/comunidades/${encodeURIComponent(com.slug)}/convite`}
          className="rounded-full border border-petroleo/20 px-5 py-2 text-sm font-semibold transition-colors hover:border-petroleo/50"
        >
          {com.codigoConvite ? "Ver o link →" : "Criar link →"}
        </Link>
      </div>

      <div className="mt-12 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Eventos</h2>
        <Link
          href={`/painel/eventos/novo?comunidade=${encodeURIComponent(com.slug)}`}
          className="rounded-full border border-petroleo/20 px-5 py-2 text-sm font-semibold transition-colors hover:border-petroleo/50"
        >
          + Novo evento
        </Link>
      </div>

      {eventos.length === 0 ? (
        <p className="mt-6 text-petroleo/70">
          Nenhum evento ainda. Crie o primeiro no botão acima.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {eventos.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-petroleo/10 p-5"
            >
              <div>
                <p className="font-semibold">
                  {e.titulo}
                  {e.canceladoEm ? (
                    <span className="ml-2 text-xs font-normal text-destructive">
                      cancelado
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-petroleo/70">
                  {formatarDataEvento(e.startsAt)} · {e._count.rsvps} inscrito(s)
                </p>
              </div>
              <Link
                href={`/painel/eventos/${e.id}`}
                className="text-sm font-semibold underline underline-offset-4 hover:text-petroleo/70"
              >
                Gerenciar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
