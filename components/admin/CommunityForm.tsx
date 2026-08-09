"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Community } from "@prisma/client";
import { slugify, type AdminFormState } from "@/lib/admin";
import { REGIOES_COM_OUTRA } from "@/lib/regioes";

const campo =
  "mt-1 w-full rounded-lg border border-petroleo/20 bg-white/80 px-3 py-2 text-sm focus:border-petroleo/50 focus:outline-none";
const rotulo = "block text-sm font-semibold";

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo disabled:opacity-60"
    >
      {pending ? "Salvando…" : "Salvar"}
    </button>
  );
}

export default function CommunityForm({
  action,
  community,
}: {
  action: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  community?: Partial<Community>;
}) {
  const [state, formAction] = useActionState(action, null);
  // Slug acompanha o nome até a pessoa mexer no campo; na edição, nunca auto.
  const [slug, setSlug] = useState(community?.slug ?? "");
  const [slugEditado, setSlugEditado] = useState(Boolean(community));

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="nome">
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            required
            defaultValue={community?.nome}
            onChange={(e) => {
              if (!slugEditado) setSlug(slugify(e.target.value));
            }}
            className={campo}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="slug">
            Slug (URL: /comunidades/…)
          </label>
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugEditado(true);
              setSlug(e.target.value);
            }}
            className={`${campo} font-mono`}
          />
        </div>
        <div>
          <label className={rotulo} htmlFor="modalidade">
            Modalidade
          </label>
          <input
            id="modalidade"
            name="modalidade"
            required
            defaultValue={community?.modalidade}
            placeholder="Corrida, Yoga, Jiu-jitsu…"
            className={campo}
          />
        </div>
        <div>
          <label className={rotulo} htmlFor="regiao">
            Região (RA oficial)
          </label>
          <select
            id="regiao"
            name="regiao"
            required
            defaultValue={community?.regiao ?? ""}
            className={campo}
          >
            <option value="" disabled>
              Escolha…
            </option>
            {/* Dado legado (ex.: "Asa Sul" das demos) fora da lista oficial:
                entra como opção extra pra edição não corromper o valor. */}
            {community?.regiao && !REGIOES_COM_OUTRA.includes(community.regiao) && (
              <option value={community.regiao}>
                {community.regiao} (valor atual, fora da lista oficial)
              </option>
            )}
            {REGIOES_COM_OUTRA.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={rotulo} htmlFor="city">
            Cidade
          </label>
          <input
            id="city"
            name="city"
            defaultValue={community?.city ?? "Brasília"}
            className={campo}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="descricao">
            Descrição
          </label>
          <textarea
            id="descricao"
            name="descricao"
            rows={4}
            defaultValue={community?.descricao ?? ""}
            className={campo}
          />
        </div>
        <div>
          <label className={rotulo} htmlFor="horarios">
            Horários
          </label>
          <input
            id="horarios"
            name="horarios"
            defaultValue={community?.horarios ?? ""}
            placeholder="Ter e qui, 19h"
            className={campo}
          />
        </div>
        <div>
          <label className={rotulo} htmlFor="local">
            Local
          </label>
          <input
            id="local"
            name="local"
            defaultValue={community?.local ?? ""}
            placeholder="Parque da Cidade, estac. 10"
            className={campo}
          />
        </div>
        <div>
          <label className={rotulo} htmlFor="nivel">
            Nível
          </label>
          <input
            id="nivel"
            name="nivel"
            defaultValue={community?.nivel ?? ""}
            placeholder="Todos os níveis"
            className={campo}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={community?.ativo ?? true}
          />
          Ativa (aparece no site)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="demo"
            defaultChecked={community?.demo ?? false}
          />
          Demo (conteúdo ilustrativo)
        </label>
      </div>
      <p className="font-mono text-xs text-petroleo/50">
        Parceiro real (sem demo) só com autorização formal por escrito — regra
        3 do projeto.
      </p>

      {state?.error && (
        <p className="rounded-lg border border-coral/40 bg-coral/10 px-4 py-3 text-sm font-medium">
          {state.error}
        </p>
      )}

      <BotaoSalvar />
    </form>
  );
}
