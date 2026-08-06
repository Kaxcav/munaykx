"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Event } from "@prisma/client";
import {
  formatDatetimeLocal,
  slugify,
  type AdminFormState,
} from "@/lib/admin";

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

export default function EventForm({
  action,
  event,
  communities,
}: {
  action: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  event?: Event;
  communities: { id: string; nome: string }[];
}) {
  const [state, formAction] = useActionState(action, null);
  // Slug acompanha o título até a pessoa mexer no campo; na edição, nunca auto.
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugEditado, setSlugEditado] = useState(Boolean(event));

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="communityId">
            Comunidade
          </label>
          <select
            id="communityId"
            name="communityId"
            required
            defaultValue={event?.communityId ?? ""}
            className={campo}
          >
            <option value="" disabled>
              Escolha…
            </option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="titulo">
            Título
          </label>
          <input
            id="titulo"
            name="titulo"
            required
            defaultValue={event?.titulo}
            onChange={(e) => {
              if (!slugEditado) setSlug(slugify(e.target.value));
            }}
            className={campo}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="slug">
            Slug (URL: /eventos/…)
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
          <label className={rotulo} htmlFor="startsAt">
            Data e hora (Brasília)
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={event ? formatDatetimeLocal(event.startsAt) : ""}
            className={campo}
          />
        </div>
        <div>
          <label className={rotulo} htmlFor="capacidade">
            Capacidade (vazio = ilimitada)
          </label>
          <input
            id="capacidade"
            name="capacidade"
            type="number"
            min={1}
            defaultValue={event?.capacidade ?? ""}
            className={campo}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="local">
            Local
          </label>
          <input
            id="local"
            name="local"
            defaultValue={event?.local ?? ""}
            placeholder="Eixão Norte, altura da 208"
            className={campo}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={event?.ativo ?? true}
          />
          Ativo (aparece no site)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="gratuito"
            defaultChecked={event?.gratuito ?? true}
          />
          Gratuito
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="demo"
            defaultChecked={event?.demo ?? false}
          />
          Demo (conteúdo ilustrativo)
        </label>
      </div>
      <p className="font-mono text-xs text-petroleo/50">
        Evento de parceiro real (sem demo) só com autorização formal por
        escrito — regra 3 do projeto.
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
