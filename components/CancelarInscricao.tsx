"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Etapa = "idle" | "confirmando" | "enviando" | "erro";

/**
 * Botão de cancelamento em duas etapas (clicar → confirmar), sem modal.
 * Sucesso → router.refresh(): o server component recarrega e mostra o
 * estado cancelado (fonte de verdade é o banco, não o client).
 */
export default function CancelarInscricao({ token }: { token: string }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function cancelar() {
    setEtapa("enviando");
    setErro(null);
    try {
      const res = await fetch("/api/rsvps/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErro(json.error ?? "Não deu certo agora. Tenta de novo.");
        setEtapa("erro");
        return;
      }
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tenta de novo em instantes.");
      setEtapa("erro");
    }
  }

  if (etapa === "confirmando" || etapa === "enviando") {
    return (
      <div className="mt-6">
        <p className="text-sm font-medium">
          Cancelar mesmo? Sua vaga vai pra quem está na fila.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            onClick={cancelar}
            disabled={etapa === "enviando"}
            className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo disabled:opacity-50"
          >
            {etapa === "enviando" ? "Cancelando…" : "Sim, cancelar inscrição"}
          </button>
          <button
            onClick={() => setEtapa("idle")}
            disabled={etapa === "enviando"}
            className="rounded-full border border-petroleo/20 px-6 py-3 text-sm font-semibold text-petroleo transition-colors hover:border-petroleo disabled:opacity-50"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {erro && (
        <p role="alert" className="mb-3 text-sm text-coral">
          {erro}
        </p>
      )}
      <button
        onClick={() => setEtapa("confirmando")}
        className="rounded-full border border-petroleo/20 px-6 py-3 text-sm font-semibold text-petroleo transition-colors hover:border-coral hover:text-coral"
      >
        Cancelar inscrição
      </button>
    </div>
  );
}
