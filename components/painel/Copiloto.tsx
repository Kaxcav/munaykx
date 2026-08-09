"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  perguntarAction,
  type EstadoCopiloto,
} from "@/app/painel/(interno)/copiloto/actions";

/**
 * COPILOTO DO ORGANIZADOR — a caixa de pergunta do painel.
 *
 * O organizador escreve em português e recebe o número dos eventos DELE. O que
 * a tela mostra sempre diz qual leitura foi feita (a intenção), porque uma
 * resposta de painel sem procedência é um número que ninguém sabe conferir.
 *
 * Quando não casa com nenhuma intenção, a tela não tenta adivinhar: diz que
 * não entendeu e mostra perguntas que funcionam. Chutar aqui seria devolver o
 * número errado com cara de certo.
 */

function BotaoPerguntar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo disabled:opacity-60"
    >
      {pending ? "Consultando…" : "Perguntar"}
    </button>
  );
}

export default function Copiloto({ exemplos }: { exemplos: string[] }) {
  const [estado, perguntar] = useActionState<EstadoCopiloto, FormData>(
    perguntarAction,
    { status: "vazio" },
  );

  return (
    <section className="rounded-card border border-petroleo/15 bg-white/70 p-6">
      <h2 className="font-display text-lg font-bold">Pergunte sobre os seus dados</h2>
      <p className="mt-1 text-sm text-petroleo/70">
        Em português, do seu jeito. A resposta sai dos seus eventos — ninguém
        mais vê, e você não vê de mais ninguém.
      </p>

      <form action={perguntar} className="mt-4 flex flex-wrap gap-2">
        <input
          name="pergunta"
          maxLength={200}
          placeholder="quantas pessoas faltaram nas últimas 3 semanas?"
          className="min-w-[16rem] flex-1 rounded-full border border-petroleo/20 bg-white px-5 py-3 text-sm outline-none transition-colors placeholder:text-petroleo/35 focus:border-petroleo"
        />
        <BotaoPerguntar />
      </form>

      {estado.status === "ok" ? (
        <div className="mt-5 rounded-xl border border-petroleo/10 bg-white p-5">
          {/* Texto montado por template com os números do banco — o modelo não
              escreve número. Renderizado pelo React, que escapa. */}
          <p className="whitespace-pre-line leading-relaxed">{estado.texto}</p>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-petroleo/45">
            leitura: {estado.intencao.replace(/_/g, " ")}
          </p>
        </div>
      ) : null}

      {estado.status === "nao-entendi" ? (
        <div className="mt-5 rounded-xl border border-petroleo/15 p-5">
          <p className="text-sm font-semibold">Não entendi essa.</p>
          <p className="mt-1 text-sm text-petroleo/70">
            Tenta perguntar assim:
          </p>
          <ul className="mt-3 space-y-1 text-sm text-petroleo/80">
            {estado.sugestoes.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {estado.status === "indisponivel" ? (
        <div className="mt-5 rounded-xl border border-petroleo/15 p-5">
          <p className="text-sm font-semibold">
            A consulta por pergunta está indisponível agora.
          </p>
          <p className="mt-1 text-sm text-petroleo/70">
            Seus dados continuam no painel de sempre — nas telas de evento e de
            inscritos.
          </p>
        </div>
      ) : null}

      {estado.status === "vazio" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-petroleo/45">
            exemplos
          </span>
          {exemplos.slice(0, 3).map((ex) => (
            <span
              key={ex}
              className="rounded-full border border-petroleo/15 px-3 py-1 text-xs text-petroleo/70"
            >
              {ex}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
