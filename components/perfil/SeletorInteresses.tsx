"use client";

import {
  INTERESSES_ESTILO,
  INTERESSES_PRATICA,
  acentoDoInteresse,
  type Interesse,
} from "@/lib/interesses";
import { classesDoAcento } from "@/lib/modalidades";

/**
 * SELEÇÃO DE INTERESSES POR TAG — briefing 07/08/2026, item 11.1.
 *
 * "Adotar seleção de preferências por tags, seguindo o padrão de interface
 * usado por apps de relacionamento como o Tinder."
 *
 * ── O QUE "PADRÃO TINDER" QUER DIZER AQUI ────────────────────────────────
 *
 * O que faz aquela interface funcionar não é o visual de pílula — é que
 * escolher custa UM toque, tudo está visível de uma vez e dá pra desmarcar
 * com o mesmo gesto. Nada de dropdown, nada de "adicionar interesse" com
 * modal, nada de busca.
 *
 * Por isso: todas as tags na tela, agrupadas, `<button type="button">` que
 * alterna. Sem `<select multiple>`, que ninguém sabe usar no celular.
 *
 * ── ACESSIBILIDADE QUE O PADRÃO ORIGINAL NÃO TEM ─────────────────────────
 *
 * `role="group"` + `aria-pressed` em cada botão: leitor de tela anuncia
 * "Corrida, botão de alternância, pressionado". Chip que só muda de cor é
 * invisível pra quem não enxerga cor — e a cor aqui é justamente o sinal.
 * Por isso o marcado também ganha o "✓" e peso de fonte, não só fundo.
 */
export default function SeletorInteresses({
  selecionados,
  onChange,
  max = 20,
}: {
  selecionados: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}) {
  const marcados = new Set(selecionados);

  function alternar(id: string) {
    const novo = new Set(marcados);
    if (novo.has(id)) novo.delete(id);
    else if (novo.size < max) novo.add(id);
    onChange([...novo]);
  }

  function Chip({ interesse }: { interesse: Interesse }) {
    const marcado = marcados.has(interesse.id);
    const acento = acentoDoInteresse(interesse);
    const cor = acento ? classesDoAcento(acento) : null;
    const cheio = !marcado && marcados.size >= max;

    const estiloMarcado = cor
      ? `${cor.fundo} ${cor.borda} ${cor.tinta} font-semibold`
      : "bg-petroleo text-areia border-petroleo font-semibold";

    return (
      <button
        type="button"
        onClick={() => alternar(interesse.id)}
        aria-pressed={marcado}
        disabled={cheio}
        className={`rounded-full border px-4 py-2 text-sm transition-all ${
          marcado
            ? estiloMarcado
            : "border-petroleo/20 bg-white/60 text-petroleo/75 hover:border-petroleo/45"
        } ${cheio ? "cursor-not-allowed opacity-40" : ""}`}
      >
        {marcado && <span aria-hidden>✓ </span>}
        {interesse.rotulo}
      </button>
    );
  }

  return (
    <div className="space-y-7">
      <div role="group" aria-labelledby="grupo-pratica">
        <p id="grupo-pratica" className="text-sm font-medium">
          O que você pratica (ou quer praticar)
        </p>
        <p className="mt-1 text-xs text-petroleo/50">
          É isso que a gente usa pra te mostrar comunidade e evento que
          combinam com você.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERESSES_PRATICA.map((i) => (
            <Chip key={i.id} interesse={i} />
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="grupo-estilo">
        <p id="grupo-estilo" className="text-sm font-medium">
          Seu estilo
        </p>
        <p className="mt-1 text-xs text-petroleo/50">
          A parte que não é esporte — e que costuma dizer mais sobre com quem
          você vai se dar bem.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERESSES_ESTILO.map((i) => (
            <Chip key={i.id} interesse={i} />
          ))}
        </div>
      </div>

      <p
        className="font-mono text-xs text-petroleo/45"
        aria-live="polite"
      >
        {marcados.size} de {max} escolhidos
        {marcados.size >= max && " — no limite. Desmarca uma pra trocar."}
      </p>
    </div>
  );
}
