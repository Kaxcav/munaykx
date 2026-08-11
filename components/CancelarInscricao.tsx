"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
          <Button onClick={cancelar} disabled={etapa === "enviando"}>
            {etapa === "enviando" ? "Cancelando…" : "Sim, cancelar inscrição"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setEtapa("idle")}
            disabled={etapa === "enviando"}
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {erro && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {erro}
        </p>
      )}
      {/*
        A ação destrutiva NÃO nasce vermelha: aqui o primeiro clique só abre a
        confirmação, e pintar de `destructive` o botão que ainda não destrói
        nada seria alarme falso. O vermelho aparece no hover — que é quando a
        intenção já existe — e o `variant="destructive"` fica reservado pro dia
        em que este botão cancelar de primeira.
      */}
      <Button
        variant="outline"
        onClick={() => setEtapa("confirmando")}
        className="border-primary/20 hover:border-destructive hover:bg-transparent hover:text-destructive"
      >
        Cancelar inscrição
      </Button>
    </div>
  );
}
