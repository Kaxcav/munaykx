"use client";

import { useState } from "react";
import { rsvpSchema } from "@/lib/rsvps";

type Status =
  | "idle"
  | "enviando"
  | "confirmado"
  | "lista_espera"
  | "jaExistia"
  | "erro";

const inputCls =
  "w-full rounded-xl border border-petroleo/15 bg-white/70 px-4 py-3 text-petroleo placeholder:text-petroleo/40 focus:border-petroleo";

export default function RsvpForm({ eventSlug }: { eventSlug: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);

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
      if (json.jaExistia) setStatus("jaExistia");
      else if (json.status === "lista_espera") setStatus("lista_espera");
      else setStatus("confirmado");
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
        corpo:
          "Sua vaga está garantida. Te mandamos um lembrete pelo contato que você deixou.",
      },
      lista_espera: {
        titulo: "Você está na lista de espera",
        corpo:
          "As vagas confirmadas acabaram, mas você entra na fila — se abrir espaço, a gente te avisa.",
      },
      jaExistia: {
        titulo: "Você já estava inscrito ✓",
        corpo: "Esse e-mail já tem inscrição neste evento. Nos vemos lá!",
      },
    };
    const m = mensagens[status];
    return (
      <div className="rounded-card border border-petroleo/15 bg-white/70 p-8">
        <p className="font-display text-2xl font-bold">{m.titulo}</p>
        <p className="mt-2 text-petroleo/70">{m.corpo}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {/* Honeypot anti-spam — invisível para humanos */}
      <div aria-hidden="true" className="hidden">
        <label>
          Não preencha este campo
          <input name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="sm:col-span-1">
        <label htmlFor="rsvp-nome" className="mb-1.5 block text-sm font-medium">
          Nome
        </label>
        <input
          id="rsvp-nome"
          name="nome"
          required
          autoComplete="name"
          placeholder="Seu nome"
          className={inputCls}
        />
      </div>

      <div className="sm:col-span-1">
        <label htmlFor="rsvp-email" className="mb-1.5 block text-sm font-medium">
          E-mail
        </label>
        <input
          id="rsvp-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="voce@email.com"
          className={inputCls}
        />
      </div>

      <div className="sm:col-span-1">
        <label
          htmlFor="rsvp-whatsapp"
          className="mb-1.5 block text-sm font-medium"
        >
          WhatsApp <span className="text-petroleo/50">(opcional)</span>
        </label>
        <input
          id="rsvp-whatsapp"
          name="whatsapp"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(61) 9…"
          className={inputCls}
        />
      </div>

      {erro && (
        <p role="alert" className="sm:col-span-2 text-sm text-coral">
          {erro}
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={status === "enviando"}
          className="w-full rounded-full bg-petroleo px-7 py-4 font-display text-lg font-bold text-areia transition-colors hover:bg-lime hover:text-petroleo disabled:opacity-50 sm:w-auto"
        >
          {status === "enviando" ? "Enviando…" : "Confirmar presença"}
        </button>
        <p className="mt-3 text-xs text-petroleo/50">
          Usamos seu contato só pra falar deste evento e da MUNAY. Nada de spam.
        </p>
      </div>
    </form>
  );
}
