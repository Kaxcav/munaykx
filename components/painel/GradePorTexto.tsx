"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { DIAS } from "@/lib/horarios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, SelectNativo } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Aviso } from "@/components/painel/Aviso";
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
 *
 * As linhas de sugestão usam `<Label htmlFor>` e não o `<Campo>` do painel: o
 * rótulo aqui é `text-xs` (a linha é densa, três campos e um botão numa faixa)
 * e cada linha já carrega um id único derivado de dia+hora.
 */

function BotaoEstruturar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Lendo…" : "Estruturar"}
    </Button>
  );
}

export default function GradePorTexto({ slug }: { slug: string }) {
  const [estado, sugerir] = useActionState<EstadoGrade, FormData>(
    sugerirGradeAction,
    { status: "vazio" },
  );

  return (
    <Card className="mt-10 p-6">
      <h2 className="font-display text-xl font-bold">
        Cola o horário do jeito que você escreve
      </h2>
      <p className="mt-1 text-sm text-foreground/80">
        Do Instagram, do grupo, de onde for. A gente separa por dia e hora — e
        você confere antes de entrar no ar.
      </p>

      <form action={sugerir} className="mt-4">
        <input type="hidden" name="slug" value={slug} />
        <Label htmlFor="texto-grade" className="sr-only">
          Texto com os horários
        </Label>
        <Textarea
          id="texto-grade"
          name="texto"
          rows={3}
          maxLength={1500}
          placeholder="segunda e quarta 6h30 no Parque da Cidade, e sábado 8h"
        />
        <div className="mt-3">
          <BotaoEstruturar />
        </div>
      </form>

      {estado.status === "indisponivel" ? (
        <Aviso className="mt-4 text-foreground/80">
          Não deu para ler o texto agora. Sem problema — o formulário de
          adicionar horário, logo abaixo, continua funcionando normalmente.
        </Aviso>
      ) : null}

      {estado.status === "nao-entendi" ? (
        <Aviso className="mt-4">
          <p className="font-semibold">Não achei um horário claro nesse texto.</p>
          <p className="mt-1 text-foreground/80">
            {estado.observacao ??
              "Tenta escrever com o dia e a hora, assim: “terça e quinta, 6h15”."}
          </p>
        </Aviso>
      ) : null}

      {estado.status === "ok" ? (
        <div className="mt-5">
          <p className="text-sm font-semibold">
            Confere e adiciona o que estiver certo:
          </p>
          {estado.sugestao.observacao ? (
            <p className="mt-1 text-sm text-foreground/80">
              {estado.sugestao.observacao}
            </p>
          ) : null}
          {estado.sugestao.descartados > 0 ? (
            <p className="mt-1 text-sm text-foreground/80">
              {estado.sugestao.descartados === 1
                ? "1 linha foi descartada por não bater com dia e hora válidos."
                : `${estado.sugestao.descartados} linhas foram descartadas por não baterem com dia e hora válidos.`}
            </p>
          ) : null}

          <ul className="mt-4 space-y-3">
            {estado.sugestao.itens.map((item) => (
              <li key={`${item.diaSemana}-${item.horaInicio}`}>
                <Card className="bg-secondary p-4">
                  {/* Cada linha é um formulário próprio, apontando para a MESMA
                      action de escrita do cadastro manual. Nenhum caminho novo
                      até o banco nasceu com esta feature. */}
                  <form
                    action={adicionarHorarioAction}
                    className="flex flex-wrap items-end gap-3"
                  >
                    <input type="hidden" name="slug" value={slug} />
                    <div>
                      <Label
                        htmlFor={`dia-${item.diaSemana}-${item.horaInicio}`}
                        className="mb-1 text-xs font-medium text-foreground/70"
                      >
                        Dia
                      </Label>
                      <SelectNativo
                        id={`dia-${item.diaSemana}-${item.horaInicio}`}
                        name="diaSemana"
                        defaultValue={item.diaSemana}
                        className="w-auto"
                      >
                        {DIAS.map((d) => (
                          <option key={d.indice} value={d.indice}>
                            {d.nome}
                          </option>
                        ))}
                      </SelectNativo>
                    </div>
                    <div>
                      <Label
                        htmlFor={`ini-${item.diaSemana}-${item.horaInicio}`}
                        className="mb-1 text-xs font-medium text-foreground/70"
                      >
                        Começa
                      </Label>
                      <Input
                        id={`ini-${item.diaSemana}-${item.horaInicio}`}
                        type="time"
                        name="horaInicio"
                        defaultValue={item.horaInicio}
                        className="w-auto"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor={`fim-${item.diaSemana}-${item.horaInicio}`}
                        className="mb-1 text-xs font-medium text-foreground/70"
                      >
                        Termina (opcional)
                      </Label>
                      <Input
                        id={`fim-${item.diaSemana}-${item.horaInicio}`}
                        type="time"
                        name="horaFim"
                        defaultValue={item.horaFim ?? ""}
                        className="w-auto"
                      />
                    </div>
                    <Button type="submit" variant="outline">
                      Adicionar
                    </Button>
                    {item.regiao ? (
                      <span className="text-xs text-foreground/70">
                        texto menciona {item.regiao} — a região do horário se
                        ajusta na lista acima
                      </span>
                    ) : null}
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
