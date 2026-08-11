"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { DIAS } from "@/lib/horarios";
import {
  sugerirGradeAction,
  adicionarHorarioAction,
  type EstadoGrade,
} from "@/app/painel/(interno)/comunidades/[slug]/horarios/actions";

/**
 * "COLA O TEXTO AQUI" — o normalizador de grade no painel do organizador.
 *
 * A tela existe porque o dado que faz o filtro por horário funcionar
 * (`HorarioRecorrente`) é chato de digitar: uma linha por dia, até 21. O
 * organizador já escreveu isso uma vez, em algum lugar — a caixa abaixo aceita
 * aquele texto do jeito que ele está.
 *
 * O que a IA devolve NÃO é salvo. Cada sugestão vira uma linha do mesmo
 * formulário manual de sempre, com os campos EDITÁVEIS e um botão próprio: o
 * organizador confere, corrige se quiser e adiciona uma a uma. Não existe
 * "adicionar todas", e isso é de propósito — horário recorrente acende a RA no
 * mapa público, e publicar em lote o que ninguém leu é como o dado errado
 * entra sem ninguém notar.
 *
 * Quando a IA não está disponível ou não entendeu, a tela diz isso em uma
 * frase e o formulário manual continua logo abaixo, intacto.
 */

function BotaoEstruturar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo disabled:opacity-60"
    >
      {pending ? "Lendo…" : "Estruturar"}
    </button>
  );
}

export default function GradePorTexto({ slug }: { slug: string }) {
  const [estado, sugerir] = useActionState<EstadoGrade, FormData>(
    sugerirGradeAction,
    { status: "vazio" },
  );

  return (
    <section className="mt-10 rounded-card border border-petroleo/15 bg-white/70 p-6">
      <h2 className="font-display text-xl font-bold">
        Cola o horário do jeito que você escreve
      </h2>
      <p className="mt-1 text-sm text-petroleo/80">
        Do Instagram, do grupo, de onde for. A gente separa por dia e hora — e
        você confere antes de entrar no ar.
      </p>

      <form action={sugerir} className="mt-4">
        <input type="hidden" name="slug" value={slug} />
        <label htmlFor="texto-grade" className="sr-only">
          Texto com os horários
        </label>
        <textarea
          id="texto-grade"
          name="texto"
          rows={3}
          maxLength={1500}
          placeholder="segunda e quarta 6h30 no Parque da Cidade, e sábado 8h"
          className="w-full rounded-xl border border-petroleo/20 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-petroleo/35 focus:border-petroleo"
        />
        <div className="mt-3">
          <BotaoEstruturar />
        </div>
      </form>

      {estado.status === "indisponivel" ? (
        <p className="mt-4 rounded-xl border border-petroleo/15 p-4 text-sm text-petroleo/80">
          Não deu para ler o texto agora. Sem problema — o formulário de
          adicionar horário, logo abaixo, continua funcionando normalmente.
        </p>
      ) : null}

      {estado.status === "nao-entendi" ? (
        <div className="mt-4 rounded-xl border border-petroleo/15 p-4">
          <p className="text-sm font-semibold">
            Não achei um horário claro nesse texto.
          </p>
          <p className="mt-1 text-sm text-petroleo/80">
            {estado.observacao ??
              "Tenta escrever com o dia e a hora, assim: “terça e quinta, 6h15”."}
          </p>
        </div>
      ) : null}

      {estado.status === "ok" ? (
        <div className="mt-5">
          <p className="text-sm font-semibold">
            Confere e adiciona o que estiver certo:
          </p>
          {estado.sugestao.observacao ? (
            <p className="mt-1 text-sm text-petroleo/80">
              {estado.sugestao.observacao}
            </p>
          ) : null}
          {estado.sugestao.descartados > 0 ? (
            <p className="mt-1 text-sm text-petroleo/80">
              {estado.sugestao.descartados === 1
                ? "1 linha foi descartada por não bater com dia e hora válidos."
                : `${estado.sugestao.descartados} linhas foram descartadas por não baterem com dia e hora válidos.`}
            </p>
          ) : null}

          <ul className="mt-4 space-y-3">
            {estado.sugestao.itens.map((item) => (
              <li
                key={`${item.diaSemana}-${item.horaInicio}`}
                className="rounded-xl border border-petroleo/10 bg-white p-4"
              >
                {/* Cada linha é um formulário próprio, apontando para a MESMA
                    action de escrita do cadastro manual. Nenhum caminho novo
                    até o banco nasceu com esta feature. */}
                <form
                  action={adicionarHorarioAction}
                  className="flex flex-wrap items-end gap-3"
                >
                  <input type="hidden" name="slug" value={slug} />
                  <div>
                    <label
                      htmlFor={`dia-${item.diaSemana}-${item.horaInicio}`}
                      className="mb-1 block text-xs font-medium text-petroleo/70"
                    >
                      Dia
                    </label>
                    <select
                      id={`dia-${item.diaSemana}-${item.horaInicio}`}
                      name="diaSemana"
                      defaultValue={item.diaSemana}
                      className="rounded-lg border border-petroleo/20 bg-white px-3 py-2 text-sm"
                    >
                      {DIAS.map((d) => (
                        <option key={d.indice} value={d.indice}>
                          {d.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`ini-${item.diaSemana}-${item.horaInicio}`}
                      className="mb-1 block text-xs font-medium text-petroleo/70"
                    >
                      Começa
                    </label>
                    <input
                      id={`ini-${item.diaSemana}-${item.horaInicio}`}
                      type="time"
                      name="horaInicio"
                      defaultValue={item.horaInicio}
                      className="rounded-lg border border-petroleo/20 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`fim-${item.diaSemana}-${item.horaInicio}`}
                      className="mb-1 block text-xs font-medium text-petroleo/70"
                    >
                      Termina (opcional)
                    </label>
                    <input
                      id={`fim-${item.diaSemana}-${item.horaInicio}`}
                      type="time"
                      name="horaFim"
                      defaultValue={item.horaFim ?? ""}
                      className="rounded-lg border border-petroleo/20 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-full border border-petroleo/25 px-5 py-2 text-sm font-semibold transition-colors hover:bg-petroleo hover:text-areia"
                  >
                    Adicionar
                  </button>
                  {item.regiao ? (
                    <span className="text-xs text-petroleo/70">
                      texto menciona {item.regiao} — a região do horário se
                      ajusta na lista acima
                    </span>
                  ) : null}
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
