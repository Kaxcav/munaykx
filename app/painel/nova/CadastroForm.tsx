"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { slugify } from "@/lib/slug";
import { REGIOES_COM_OUTRA } from "@/lib/regioes";
import type { CadastroFormState } from "@/lib/cadastro";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, SelectNativo } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Campo, CampoCheck } from "@/components/painel/Campo";
import { Aviso } from "@/components/painel/Aviso";

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
 *
 * As duas constantes de classe que moravam aqui (`campo` e `rotulo`) sumiram
 * na migração: eram um mini design system particular desta tela — a mesma
 * ideia de `<Input>` e `<Label>`, escrita à mão e com valores ligeiramente
 * diferentes dos do resto do painel (`bg-white/80`, `px-3 py-2`).
 */

function BotaoCadastrar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Cadastrando…" : "Cadastrar comunidade"}
    </Button>
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
        <Campo
          className="sm:col-span-2"
          rotulo="Nome da comunidade"
          dica={
            <span className="font-mono">
              {slugPrevia
                ? `Endereço: /comunidades/${slugPrevia}`
                : "O endereço da página é gerado a partir do nome."}
            </span>
          }
        >
          <Input
            name="nome"
            required
            maxLength={120}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Corrida Noturna Asa Norte"
          />
        </Campo>

        <Campo rotulo="Modalidade">
          <Input
            name="modalidade"
            required
            maxLength={80}
            placeholder="Corrida, Yoga, Jiu-jitsu…"
          />
        </Campo>

        <Campo rotulo="Região">
          <SelectNativo name="regiao" required defaultValue="">
            <option value="" disabled>
              Escolha…
            </option>
            {REGIOES_COM_OUTRA.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </SelectNativo>
        </Campo>

        <Campo className="sm:col-span-2" rotulo="Descrição" opcional>
          <Textarea
            name="descricao"
            rows={4}
            maxLength={2000}
            placeholder="Quem vocês são, pra quem é, como é o treino."
          />
        </Campo>

        <Campo rotulo="Horários" opcional>
          <Input name="horarios" maxLength={200} placeholder="Ter e qui, 19h" />
        </Campo>

        <Campo rotulo="Local" opcional>
          <Input
            name="local"
            maxLength={200}
            placeholder="Parque da Cidade, estac. 10"
          />
        </Campo>

        <Campo className="sm:col-span-2" rotulo="Nível" opcional>
          <Input name="nivel" maxLength={80} placeholder="Todos os níveis" />
        </Campo>
      </div>

      {/* A autorização da decisão 2 da spec. Fica em bloco destacado, com o
          texto inteiro visível — aceite escondido atrás de "li e concordo" não
          é prova de nada. */}
      <Card className="p-5">
        <CampoCheck
          nome="autorizacao"
          required
          alinharAoTopo
          rotulo={<span className="text-foreground/80">{textoAutorizacao}</span>}
        />
      </Card>

      {state?.error && (
        <Aviso tom="erro" alerta className="mt-0 font-medium">
          {state.error}
        </Aviso>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <BotaoCadastrar />
        <p className="text-xs text-foreground/60">
          A comunidade passa por uma conferência rápida antes de aparecer no
          site.
        </p>
      </div>
    </form>
  );
}
