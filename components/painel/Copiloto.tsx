"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Aviso } from "@/components/painel/Aviso";
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
    <Button type="submit" disabled={pending}>
      {pending ? "Consultando…" : "Perguntar"}
    </Button>
  );
}

export default function Copiloto({ exemplos }: { exemplos: string[] }) {
  const [estado, perguntar] = useActionState<EstadoCopiloto, FormData>(
    perguntarAction,
    { status: "vazio" },
  );

  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-bold">
        Pergunte sobre os seus dados
      </h2>
      <p className="mt-1 text-sm text-foreground/70">
        Em português, do seu jeito. A resposta sai dos seus eventos — ninguém
        mais vê, e você não vê de mais ninguém.
      </p>

      <form action={perguntar} className="mt-4 flex flex-wrap gap-2">
        <Label htmlFor="copiloto-pergunta" className="sr-only">
          Sua pergunta
        </Label>
        <Input
          id="copiloto-pergunta"
          name="pergunta"
          maxLength={200}
          placeholder="quantas pessoas faltaram nas últimas 3 semanas?"
          className="min-w-[16rem] flex-1"
        />
        <BotaoPerguntar />
      </form>

      {estado.status === "ok" ? (
        <Card className="mt-5 rounded-xl p-5">
          {/* Texto montado por template com os números do banco — o modelo não
              escreve número. Renderizado pelo React, que escapa. */}
          <p className="whitespace-pre-line leading-relaxed">{estado.texto}</p>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-foreground/45">
            leitura: {estado.intencao.replace(/_/g, " ")}
          </p>
        </Card>
      ) : null}

      {estado.status === "nao-entendi" ? (
        <Aviso className="mt-5 p-5">
          <p className="font-semibold">Não entendi essa.</p>
          <p className="mt-1 text-foreground/70">Tenta perguntar assim:</p>
          <ul className="mt-3 space-y-1 text-foreground/80">
            {estado.sugestoes.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </Aviso>
      ) : null}

      {estado.status === "indisponivel" ? (
        <Aviso className="mt-5 p-5">
          <p className="font-semibold">
            A consulta por pergunta está indisponível agora.
          </p>
          <p className="mt-1 text-foreground/70">
            Seus dados continuam no painel de sempre — nas telas de evento e de
            inscritos.
          </p>
        </Aviso>
      ) : null}

      {estado.status === "vazio" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-foreground/45">
            exemplos
          </span>
          {/* `<Badge>` e não `<Chip>`: estes exemplos são ESTADO (não clicam,
              só mostram o que a caixa entende). Chip prometeria um clique que
              não existe. */}
          {exemplos.slice(0, 3).map((ex) => (
            <Badge key={ex} variant="outline" className="normal-case tracking-normal">
              {ex}
            </Badge>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
