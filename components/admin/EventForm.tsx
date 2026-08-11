"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Event } from "@prisma/client";
import {
  formatDatetimeLocal,
  slugify,
  type AdminFormState,
} from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, SelectNativo } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Irmão do `CommunityForm` — mesmas peças do DS, mesmo desenho de campo. */
function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando…" : "Salvar"}
    </Button>
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
          <Label htmlFor="communityId">Comunidade</Label>
          <SelectNativo
            id="communityId"
            name="communityId"
            required
            defaultValue={event?.communityId ?? ""}
            className="mt-1"
          >
            <option value="" disabled>
              Escolha…
            </option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </SelectNativo>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="titulo">Título</Label>
          <Input
            id="titulo"
            name="titulo"
            required
            defaultValue={event?.titulo}
            onChange={(e) => {
              if (!slugEditado) setSlug(slugify(e.target.value));
            }}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="slug">Slug (URL: /eventos/…)</Label>
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugEditado(true);
              setSlug(e.target.value);
            }}
            className="mt-1 font-mono"
          />
        </div>
        <div>
          <Label htmlFor="startsAt">Data e hora (Brasília)</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={event ? formatDatetimeLocal(event.startsAt) : ""}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="capacidade">Capacidade (vazio = ilimitada)</Label>
          <Input
            id="capacidade"
            name="capacidade"
            type="number"
            min={1}
            defaultValue={event?.capacidade ?? ""}
            className="mt-1 tabular-nums"
          />
        </div>
        <div>
          <Label htmlFor="local">Local</Label>
          <Input
            id="local"
            name="local"
            defaultValue={event?.local ?? ""}
            placeholder="Eixão Norte, altura da 208"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            name="city"
            defaultValue={event?.city ?? "Brasília"}
            className="mt-1"
          />
        </div>
      </div>

      {/* Caixa de marcar continua NATIVA — o DS ainda não tem `<Checkbox>` e
          este lote não cria peça compartilhada (§5 do quadro). */}
      <div className="flex flex-wrap gap-6 pt-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={event?.ativo ?? true}
            className="h-4 w-4 accent-primary"
          />
          Ativo (aparece no site)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="gratuito"
            defaultChecked={event?.gratuito ?? true}
            className="h-4 w-4 accent-primary"
          />
          Gratuito
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="demo"
            defaultChecked={event?.demo ?? false}
            className="h-4 w-4 accent-primary"
          />
          Demo (conteúdo ilustrativo)
        </label>
      </div>
      <p className="font-mono text-xs text-muted-foreground">
        Evento de parceiro real (sem demo) só com autorização formal por
        escrito — regra 3 do projeto.
      </p>

      {state?.error && (
        <Card className="border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium">
          {state.error}
        </Card>
      )}

      <BotaoSalvar />
    </form>
  );
}
