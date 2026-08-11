"use client";

import {
  INTERESSES_ESTILO,
  INTERESSES_PRATICA,
  acentoDoInteresse,
  type Interesse,
} from "@/lib/interesses";
import { ChipBotao } from "@/components/ui/chip";
import { classesDoAcento } from "@/lib/modalidades";
import { cn } from "@/lib/utils";

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

  /**
   * O `<ChipBotao>` do DS é a peça certa aqui: chip que EXECUTA algo na
   * própria tela (o `<Chip>` irmão é `<Link>`, pra filtro que vive na URL).
   *
   * O `ativo` dele pinta petróleo sólido, e é justamente o que NÃO serve
   * neste seletor: a cor de cada tag é o ACENTO DA MODALIDADE
   * (`lib/modalidades.ts`), que é informação — "corrida é laranja" é o que
   * torna a grade legível de relance. Por isso o marcado entra como
   * `ativo={false}` + as classes de acento por cima: a forma, o alvo de
   * toque e o `aria-pressed` vêm do DS; só a cor é do domínio.
   */
  function TagInteresse({ interesse }: { interesse: Interesse }) {
    const marcado = marcados.has(interesse.id);
    const acento = acentoDoInteresse(interesse);
    const cor = acento ? classesDoAcento(acento) : null;
    const cheio = !marcado && marcados.size >= max;

    const estiloMarcado = cor
      ? `${cor.fundo} ${cor.borda} ${cor.tinta} font-semibold`
      : "bg-primary text-primary-foreground border-primary font-semibold";

    return (
      <ChipBotao
        onClick={() => alternar(interesse.id)}
        aria-pressed={marcado}
        disabled={cheio}
        className={cn(
          "py-2 transition-all",
          marcado
            ? estiloMarcado
            : "border-primary/20 bg-card/60 text-foreground/75 hover:border-primary/45",
          cheio && "cursor-not-allowed opacity-40",
        )}
      >
        {marcado && <span aria-hidden>✓ </span>}
        {interesse.rotulo}
      </ChipBotao>
    );
  }

  return (
    <div className="space-y-7">
      <div role="group" aria-labelledby="grupo-pratica">
        <p id="grupo-pratica" className="text-sm font-medium">
          O que você pratica (ou quer praticar)
        </p>
        <p className="mt-1 text-xs text-foreground/50">
          É isso que a gente usa pra te mostrar comunidade e evento que
          combinam com você.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERESSES_PRATICA.map((i) => (
            <TagInteresse key={i.id} interesse={i} />
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="grupo-estilo">
        <p id="grupo-estilo" className="text-sm font-medium">
          Seu estilo
        </p>
        <p className="mt-1 text-xs text-foreground/50">
          A parte que não é esporte — e que costuma dizer mais sobre com quem
          você vai se dar bem.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERESSES_ESTILO.map((i) => (
            <TagInteresse key={i.id} interesse={i} />
          ))}
        </div>
      </div>

      <p
        className="font-mono text-xs text-foreground/45"
        aria-live="polite"
      >
        {marcados.size} de {max} escolhidos
        {marcados.size >= max && " — no limite. Desmarca uma pra trocar."}
      </p>
    </div>
  );
}
