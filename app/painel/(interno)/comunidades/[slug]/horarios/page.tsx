import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadeDoUsuario } from "@/lib/organizacao";
import {
  DIAS,
  LIMITE_HORARIOS,
  horariosDaComunidade,
  rotularHorario,
} from "@/lib/horarios";
import { adicionarHorarioAction, removerHorarioAction } from "./actions";

/**
 * HORÁRIOS RECORRENTES de uma comunidade — a entrada de dado da FASE 0.
 *
 * `comunidadeDoUsuario` devolve `null` quando não é dela, e a página vira
 * **404, nunca 403** — o mesmo contrato do resto do painel.
 *
 * Por que uma tela só pra isso, em vez de mais campos no form de edição: o
 * horário é uma LISTA (uma comunidade tem vários), e lista com adicionar/remover
 * dentro de um formulário de salvar-tudo vira um form que salva pela metade. A
 * sub-rota também mantém este trabalho longe do form que outra frente pode
 * estar editando ao mesmo tempo.
 */
export default async function HorariosDaComunidade({
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

  const horarios = (await horariosDaComunidade(sessao.user.id, slug)) ?? [];
  const { ok, erro } = await searchParams;
  const cheio = horarios.length >= LIMITE_HORARIOS;

  return (
    <>
      <p className="eyebrow">Horários</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
        {com.nome}
      </h1>
      <p className="mt-4 max-w-2xl text-petroleo/70">
        Os dias e horas que se repetem toda semana. É isto que coloca a{" "}
        <strong>{com.regiao}</strong> no mapa por horário — quem procura
        &ldquo;terça 6h&rdquo; só encontra quem cadastrou aqui.
      </p>
      <p className="mt-3 max-w-2xl text-sm text-petroleo/60">
        O mapa mostra a <strong>região</strong>, nunca o ponto exato de encontro.
        Seu campo de horário escrito à mão continua aparecendo na página da
        comunidade, do jeito que você escreveu.
      </p>

      {ok ? (
        <p className="mt-6 rounded-xl border border-petroleo/15 bg-white/70 p-4 text-sm">
          Pronto ✓
        </p>
      ) : null}
      {erro ? (
        <p className="mt-6 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      <h2 className="mt-10 font-display text-xl font-bold">
        {horarios.length === 0
          ? "Nenhum horário ainda"
          : `${horarios.length} ${horarios.length === 1 ? "horário" : "horários"}`}
      </h2>

      {horarios.length === 0 ? (
        <p className="mt-3 max-w-2xl text-petroleo/70">
          Sem horário cadastrado, a comunidade continua no site normalmente — ela
          só não aparece quando alguém filtra o mapa por dia e hora.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {horarios.map((h) => (
            <li
              key={h.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-petroleo/10 bg-white/60 px-5 py-3"
            >
              <span className="font-medium">{rotularHorario(h)}</span>
              <form action={removerHorarioAction}>
                <input type="hidden" name="slug" value={com.slug} />
                <input type="hidden" name="horarioId" value={h.id} />
                <button
                  type="submit"
                  className="text-sm font-semibold text-destructive underline underline-offset-4 hover:opacity-70"
                >
                  Remover
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {cheio ? (
        <p className="mt-8 rounded-xl border border-petroleo/15 bg-white/70 p-4 text-sm text-petroleo/70">
          Você chegou ao limite de {LIMITE_HORARIOS} horários. Remova um para
          adicionar outro.
        </p>
      ) : (
        <form
          action={adicionarHorarioAction}
          className="mt-10 rounded-2xl border border-petroleo/10 bg-white/60 p-6"
        >
          <input type="hidden" name="slug" value={com.slug} />
          <h2 className="font-display text-xl font-bold">Adicionar horário</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Dia</span>
              <select
                name="diaSemana"
                defaultValue={2}
                className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
              >
                {DIAS.map((d) => (
                  <option key={d.indice} value={d.indice}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Começa</span>
              <input
                type="time"
                name="horaInicio"
                required
                defaultValue="06:15"
                className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">
                Termina{" "}
                <span className="font-normal text-petroleo/50">(opcional)</span>
              </span>
              <input
                type="time"
                name="horaFim"
                className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-petroleo/55">
            Sem hora de término, a gente considera uma hora de duração no mapa.
          </p>
          <button
            type="submit"
            className="mt-5 rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
          >
            Adicionar
          </button>
        </form>
      )}

      <p className="mt-10">
        <Link
          href={`/painel/comunidades/${encodeURIComponent(com.slug)}`}
          className="text-sm font-semibold underline underline-offset-4 hover:opacity-70"
        >
          ← Voltar para a comunidade
        </Link>
      </p>
    </>
  );
}
