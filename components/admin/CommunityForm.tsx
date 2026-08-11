"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Community } from "@prisma/client";
import { slugify, type AdminFormState } from "@/lib/admin";
import { REGIOES_COM_OUTRA } from "@/lib/regioes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, SelectNativo } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * As duas constantes de classe que moravam aqui (`campo` e `rotulo`) sumiram
 * de propósito: elas eram um design system particular deste arquivo, copiado
 * palavra por palavra no `EventForm` e no `CadastroAssistido`. Campo agora é
 * `<Input>`/`<SelectNativo>`/`<Textarea>` e rótulo é `<Label>` — as peças do
 * DS, que já carregam o raio, o foco e a borda da marca.
 *
 * O `<SelectNativo>` é o `<select>` do navegador estilizado, não o Select do
 * Radix: ver a nota em `components/ui/input.tsx`.
 */
function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando…" : "Salvar"}
    </Button>
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
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            name="nome"
            required
            defaultValue={community?.nome}
            onChange={(e) => {
              if (!slugEditado) setSlug(slugify(e.target.value));
            }}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="slug">Slug (URL: /comunidades/…)</Label>
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
          <Label htmlFor="modalidade">Modalidade</Label>
          <Input
            id="modalidade"
            name="modalidade"
            required
            defaultValue={community?.modalidade}
            placeholder="Corrida, Yoga, Jiu-jitsu…"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="regiao">Região (RA oficial)</Label>
          <SelectNativo
            id="regiao"
            name="regiao"
            required
            defaultValue={community?.regiao ?? ""}
            className="mt-1"
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
          </SelectNativo>
        </div>
        <div>
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            name="city"
            defaultValue={community?.city ?? "Brasília"}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            name="descricao"
            rows={4}
            defaultValue={community?.descricao ?? ""}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="horarios">Horários</Label>
          <Input
            id="horarios"
            name="horarios"
            defaultValue={community?.horarios ?? ""}
            placeholder="Ter e qui, 19h"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="local">Local</Label>
          <Input
            id="local"
            name="local"
            defaultValue={community?.local ?? ""}
            placeholder="Parque da Cidade, estac. 10"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="nivel">Nível</Label>
          <Input
            id="nivel"
            name="nivel"
            defaultValue={community?.nivel ?? ""}
            placeholder="Todos os níveis"
            className="mt-1"
          />
        </div>
      </div>

      {/* Caixa de marcar continua NATIVA: o DS ainda não tem `<Checkbox>` e
          criar peça compartilhada no meio deste lote é justamente o que o
          quadro proíbe (§5, pedidos entre frentes). Pedido registrado lá. */}
      <div className="flex flex-wrap gap-6 pt-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={community?.ativo ?? true}
            className="h-4 w-4 accent-primary"
          />
          Ativa (aparece no site)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="demo"
            defaultChecked={community?.demo ?? false}
            className="h-4 w-4 accent-primary"
          />
          Demo (conteúdo ilustrativo)
        </label>
      </div>
      <p className="font-mono text-xs text-muted-foreground">
        Parceiro real (sem demo) só com autorização formal por escrito — regra
        3 do projeto.
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
