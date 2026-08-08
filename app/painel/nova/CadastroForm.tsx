"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { slugify } from "@/lib/slug";
import { REGIOES_COM_OUTRA } from "@/lib/regioes";
import type { CadastroFormState } from "@/lib/cadastro";

/**
 * Formulário de cadastro de comunidade (STORY-009, frente A).
 *
 * O texto de autorização chega por PROP, vindo da página (server component),
 * e não por import: `lib/cadastro.ts` importa Prisma, e importar de client
 * component arrastaria o Prisma pro bundle do navegador.
 *
 * O efeito colateral disso é bom: o texto exibido e o texto gravado são
 * literalmente a mesma constante, e não duas cópias que divergem no dia em que
 * alguém melhora a redação de um lado só.
 */

const campo =
  "mt-1 w-full rounded-lg border border-petroleo/20 bg-white/80 px-3 py-2 text-sm focus:border-petroleo/50 focus:outline-none";
const rotulo = "block text-sm font-semibold";

function BotaoCadastrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo disabled:opacity-60"
    >
      {pending ? "Cadastrando…" : "Cadastrar comunidade"}
    </button>
  );
}

export default function CadastroForm({
  action,
  textoAutorizacao,
}: {
  action: (
    prev: CadastroFormState,
    formData: FormData,
  ) => Promise<CadastroFormState>;
  textoAutorizacao: string;
}) {
  const [state, formAction] = useActionState(action, null);
  // Prévia da URL. Só informativa: quem gera o slug de verdade é o servidor,
  // a partir do nome — o campo não é editável de propósito, senão duas pessoas
  // escolheriam o mesmo endereço e a colisão viraria erro no fim do formulário.
  const [nome, setNome] = useState("");
  const slugPrevia = slugify(nome);

  return (
    <form action={formAction} className="mt-10 max-w-2xl space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="nome">
            Nome da comunidade
          </label>
          <input
            id="nome"
            name="nome"
            required
            maxLength={120}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Corrida Noturna Asa Norte"
            className={campo}
          />
          <p className="mt-1 font-mono text-xs text-petroleo/50">
            {slugPrevia
              ? `Endereço: /comunidades/${slugPrevia}`
              : "O endereço da página é gerado a partir do nome."}
          </p>
        </div>

        <div>
          <label className={rotulo} htmlFor="modalidade">
            Modalidade
          </label>
          <input
            id="modalidade"
            name="modalidade"
            required
            maxLength={80}
            placeholder="Corrida, Yoga, Jiu-jitsu…"
            className={campo}
          />
        </div>

        <div>
          <label className={rotulo} htmlFor="regiao">
            Região
          </label>
          <select
            id="regiao"
            name="regiao"
            required
            defaultValue=""
            className={campo}
          >
            <option value="" disabled>
              Escolha…
            </option>
            {REGIOES_COM_OUTRA.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="descricao">
            Descrição <span className="font-normal text-petroleo/50">(opcional)</span>
          </label>
          <textarea
            id="descricao"
            name="descricao"
            rows={4}
            maxLength={2000}
            placeholder="Quem vocês são, pra quem é, como é o treino."
            className={campo}
          />
        </div>

        <div>
          <label className={rotulo} htmlFor="horarios">
            Horários <span className="font-normal text-petroleo/50">(opcional)</span>
          </label>
          <input
            id="horarios"
            name="horarios"
            maxLength={200}
            placeholder="Ter e qui, 19h"
            className={campo}
          />
        </div>

        <div>
          <label className={rotulo} htmlFor="local">
            Local <span className="font-normal text-petroleo/50">(opcional)</span>
          </label>
          <input
            id="local"
            name="local"
            maxLength={200}
            placeholder="Parque da Cidade, estac. 10"
            className={campo}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="nivel">
            Nível <span className="font-normal text-petroleo/50">(opcional)</span>
          </label>
          <input
            id="nivel"
            name="nivel"
            maxLength={80}
            placeholder="Todos os níveis"
            className={campo}
          />
        </div>
      </div>

      {/* A autorização da decisão 2 da spec. Fica em bloco destacado, com o
          texto inteiro visível — aceite escondido atrás de "li e concordo" não
          é prova de nada. */}
      <div className="rounded-card border border-petroleo/15 bg-white/60 p-5">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            id="autorizacao"
            name="autorizacao"
            required
            className="mt-1 shrink-0"
          />
          <span className="text-petroleo/80">{textoAutorizacao}</span>
        </label>
      </div>

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg border border-coral/40 bg-coral/10 px-4 py-3 text-sm font-medium"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <BotaoCadastrar />
        <p className="text-xs text-petroleo/60">
          A comunidade passa por uma conferência rápida antes de aparecer no
          site.
        </p>
      </div>
    </form>
  );
}
