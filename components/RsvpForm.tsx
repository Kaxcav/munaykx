"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics";
import { rsvpSchema } from "@/lib/rsvps";

type Status =
  | "idle"
  | "enviando"
  | "confirmado"
  | "lista_espera"
  | "jaExistia"
  | "erro";

export default function RsvpForm({
  eventSlug,
  avisaPorEmail,
}: {
  eventSlug: string;
  /** Só promete e-mail quando existe provedor configurado (STORY-004).
   *  Sem isso, a copy viraria promessa falsa — o que a 003 mandou remover. */
  avisaPorEmail: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    const dados = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = rsvpSchema.safeParse({ ...dados, eventSlug });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Confere os campos.");
      return;
    }

    setStatus("enviando");
    try {
      const res = await fetch("/api/rsvps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) {
        setErro(json.error ?? "Não deu certo agora. Tenta de novo.");
        setStatus("erro");
        return;
      }
      if (typeof json.token === "string") setToken(json.token);
      if (json.jaExistia) setStatus("jaExistia");
      else if (json.status === "lista_espera") {
        setStatus("lista_espera");
        track("rsvp_lista_espera");
      } else {
        setStatus("confirmado");
        track("rsvp_confirmado");
      }
    } catch {
      setErro("Falha de conexão. Tenta de novo em instantes.");
      setStatus("erro");
    }
  }

  if (
    status === "confirmado" ||
    status === "lista_espera" ||
    status === "jaExistia"
  ) {
    const mensagens: Record<string, { titulo: string; corpo: string }> = {
      confirmado: {
        titulo: "Presença confirmada ✓",
        corpo: avisaPorEmail
          ? "Sua vaga está garantida e o comprovante já saiu no seu e-mail, com o link pra gerenciar a inscrição. Nos vemos lá!"
          : "Sua vaga está garantida. Nos vemos lá!",
      },
      lista_espera: {
        titulo: "Você está na lista de espera",
        corpo: avisaPorEmail
          ? "As vagas confirmadas acabaram, mas você entrou na fila. Se alguém desistir, sua inscrição é confirmada automaticamente e a gente te avisa por e-mail — não precisa ficar conferindo."
          : "As vagas confirmadas acabaram, mas você entrou na fila — se abrir vaga, sua inscrição é confirmada automaticamente.",
      },
      jaExistia: {
        titulo: "Você já estava inscrito ✓",
        corpo: avisaPorEmail
          ? "Esse e-mail já tem inscrição neste evento — reenviamos o link de gerenciamento pra sua caixa. Nos vemos lá!"
          : "Esse e-mail já tem inscrição neste evento. Nos vemos lá!",
      },
    };
    const m = mensagens[status];
    const linkGestao = token ? `/rsvp/${token}` : null;
    return (
      <Card className="p-8">
        <p className="font-display text-2xl font-bold">{m.titulo}</p>
        <p className="mt-2 text-foreground/70">{m.corpo}</p>
        {linkGestao && (
          // O link de gestão é um card DENTRO do card de sucesso: `bg-muted`
          // é a superfície rebaixada do tema (a mistura areia×petróleo que o
          // `bg-areia/60` desenhava à mão), pra ele se destacar do branco sem
          // virar uma terceira cor.
          <Card className="mt-5 bg-muted p-4">
            <p className="text-sm font-semibold">
              Guarda esse link pra gerenciar tua inscrição
              {status === "lista_espera" ? " e acompanhar a fila" : ""}:
            </p>
            <a
              href={linkGestao}
              className="mt-1 block break-all font-mono text-sm text-foreground underline underline-offset-4"
            >
              {typeof window !== "undefined"
                ? `${window.location.origin}${linkGestao}`
                : linkGestao}
            </a>
            <p className="mt-2 text-xs text-foreground/50">
              É por ele que você cancela — e, se estiver na fila, vê quando
              sua vaga for confirmada.
            </p>
          </Card>
        )}
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {/*
        Honeypot anti-spam — invisível para humanos.

        Continua um campo NATIVO de propósito, e é a única exceção do lote. A
        armadilha só funciona se o bot ler um campo comum; vesti-la com as
        classes do `Input` (`h-11 rounded-full`…) seria pintar de estilo um
        elemento que ninguém enxerga, só pra agradar o contador de higiene.
        O `CLAUDE.md` já avisa: isto não é bug, não "conserte".
      */}
      <div aria-hidden="true" className="hidden">
        <label>
          Não preencha este campo
          <input name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="sm:col-span-1">
        <Label htmlFor="rsvp-nome" className="mb-1.5">
          Nome
        </Label>
        <Input
          id="rsvp-nome"
          name="nome"
          required
          autoComplete="name"
          placeholder="Seu nome"
        />
      </div>

      <div className="sm:col-span-1">
        <Label htmlFor="rsvp-email" className="mb-1.5">
          E-mail
        </Label>
        <Input
          id="rsvp-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="voce@email.com"
        />
      </div>

      <div className="sm:col-span-1">
        <Label htmlFor="rsvp-whatsapp" className="mb-1.5">
          WhatsApp <span className="font-normal text-foreground/50">(opcional)</span>
        </Label>
        <Input
          id="rsvp-whatsapp"
          name="whatsapp"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(61) 9…"
        />
      </div>

      {erro && (
        <p role="alert" className="sm:col-span-2 text-sm text-destructive">
          {erro}
        </p>
      )}

      <div className="sm:col-span-2">
        <Button
          type="submit"
          size="lg"
          disabled={status === "enviando"}
          className="w-full font-display text-lg font-bold sm:w-auto"
        >
          {status === "enviando" ? "Enviando…" : "Confirmar presença"}
        </Button>
        <p className="mt-3 text-xs text-foreground/50">
          Usamos seu contato só pra falar deste evento e da MUNAY. Nada de
          spam. Ao enviar, você concorda com a{" "}
          <Link
            href="/privacidade"
            className="underline underline-offset-2 hover:text-foreground"
          >
            política de privacidade
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
