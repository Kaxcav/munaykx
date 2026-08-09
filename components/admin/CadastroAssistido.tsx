"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AdminFormState } from "@/lib/admin";
import CommunityForm from "@/components/admin/CommunityForm";
import {
  analisarTextoAction,
  type EstadoAssistido,
} from "@/app/admin/comunidades/assistido/actions";

/**
 * CADASTRO ASSISTIDO — cola o texto, revisa o que a IA propôs, salva.
 *
 * O desenho todo existe para manter o humano no meio, e isso aparece na tela:
 * a análise NUNCA salva nada. Ela só preenche o mesmo `CommunityForm` de
 * sempre, com os mesmos campos e a mesma action de gravação — o botão que
 * cria a comunidade continua sendo apertado por uma pessoa que leu os campos.
 *
 * Campo que a IA não conseguiu extrair aparece VAZIO, nunca chutado. Um chute
 * plausível é o erro que passa despercebido na revisão; um campo vazio é
 * visível e pede atenção.
 */

function BotaoAnalisar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo disabled:opacity-60"
    >
      {pending ? "Lendo o texto…" : "Analisar texto"}
    </button>
  );
}

export default function CadastroAssistido({
  salvar,
}: {
  salvar: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
}) {
  const [estado, analisar] = useActionState<EstadoAssistido, FormData>(
    analisarTextoAction,
    { status: "vazio" },
  );

  return (
    <>
      <form action={analisar} className="max-w-2xl">
        <label className="block text-sm font-semibold" htmlFor="texto">
          Cole o texto do organizador
        </label>
        <p className="mt-1 text-sm text-muted-foreground">
          Bio do Instagram, convite do grupo de WhatsApp, mensagem solta — o que
          ele já escreveu. A IA lê e propõe o preenchimento;{" "}
          <strong>nada é salvo até você revisar e clicar em Salvar</strong>.
        </p>
        <textarea
          id="texto"
          name="texto"
          rows={6}
          maxLength={2000}
          className="mt-3 w-full rounded-lg border border-petroleo/20 bg-white/80 px-3 py-2 text-sm focus:border-petroleo/50 focus:outline-none"
          placeholder="Ex.: Corrida no Parque da Cidade toda terça e quinta às 6h. Iniciantes bem-vindos, a gente espera todo mundo no fim."
        />
        <div className="mt-4">
          <BotaoAnalisar />
        </div>
      </form>

      {estado.status === "erro" ? (
        <p className="mt-6 max-w-2xl rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
          {estado.mensagem}
        </p>
      ) : null}

      {estado.status === "ok" ? (
        <section className="mt-10">
          <div className="max-w-2xl rounded-lg border border-petroleo/15 bg-white/70 p-4">
            <p className="text-sm font-semibold">Proposta da IA — revise antes de salvar</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Campo em branco é campo que o texto não informava. A IA não chuta:
              preencha você.
            </p>
            {estado.sugestao.observacao ? (
              <p className="mt-3 rounded-lg border border-petroleo/15 p-3 text-sm">
                <strong>Atenção:</strong> {estado.sugestao.observacao}
              </p>
            ) : null}
          </div>

          <div className="mt-6">
            {/* MESMO formulário e MESMA action do cadastro manual — o
                assistido só chega com os campos preenchidos. */}
            <CommunityForm
              action={salvar}
              community={{
                nome: estado.sugestao.nome ?? "",
                slug: estado.slug,
                modalidade: estado.sugestao.modalidade ?? "",
                regiao: estado.sugestao.regiao ?? "",
                descricao: estado.sugestao.descricao,
                horarios: estado.sugestao.horarios,
                local: estado.sugestao.local,
                nivel: estado.sugestao.nivel,
              }}
            />
          </div>
        </section>
      ) : null}
    </>
  );
}
