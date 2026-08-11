"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapaDF } from "@/components/MapaDF";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { chipVariants } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import type { EstadoRegiao, RegiaoNoMapa } from "@/lib/mapa";
import { DIAS, acesaEm, minutosParaHHMM, type MatrizTemporal } from "@/lib/horarios";

/**
 * O SCRUBBER DIA×HORA — FASE 0 do mapa.
 *
 * Arrastar a hora acende e apaga as RAs conforme existe comunidade ativa
 * naquele dia e naquela hora. É o diferencial que a pesquisa não achou
 * precedente de ninguém ter feito: Popular Times é histograma por local, não
 * camada temporal sobre o mapa; a Strava tem os dados e **se recusa** a expor
 * filtro por hora, por segurança.
 *
 * ── COMO ISTO NÃO VIRA O MAPA QUE A STRAVA NÃO QUIS FAZER ─────────────────
 *
 * O que acende é REGIÃO ADMINISTRATIVA, nunca ponto. Não existe coordenada
 * neste caminho — nem no banco (`HorarioRecorrente` não tem lat/lng), nem
 * aqui. A resposta mais precisa que este mapa consegue dar é "terça 6h tem
 * gente em Ceilândia", que é uma área de mais de 200 mil habitantes. É
 * descoberta útil sem virar rastro de ninguém (PESQUISA-MAPA-MUNAY.md §H).
 *
 * ── ZERO CONSULTA ENQUANTO SE ARRASTA ─────────────────────────────────────
 *
 * A `matriz` chega inteira do servidor, uma vez (7 inteiros por RA — ver
 * `lib/horarios.ts`). Mover o slider é aritmética de bit no cliente: nenhuma
 * requisição, nenhum banco tocado, nenhum estado de carregamento. É o que
 * torna o gesto "tocar a semana" agradável em vez de travado.
 *
 * ── ACESSIBILIDADE (a pesquisa foi específica, §G) ────────────────────────
 *
 * `<input type="range">` NATIVO, não slider custom — custom quebra leitor de
 * tela no toque. Rótulo sempre visível ("Terça, 06h"), stops de 1 hora com
 * snap (não contínuo), e — o principal — **a informação nunca é só cor**: a
 * lista de regiões acesas embaixo é texto, com `aria-live`, e é o caminho
 * garantido de quem não enxerga o SVG.
 */
export function EixoDeTempo({
  regioes,
  matriz,
}: {
  regioes: RegiaoNoMapa[];
  matriz: MatrizTemporal;
}) {
  // Começa desligado: a primeira coisa que a pessoa vê é o mapa COMPLETO, o
  // mesmo de sempre. Filtro é gesto, não estado inicial — abrir já filtrado
  // esconderia cobertura real e faria a plataforma parecer mais vazia do que é.
  const [ligado, setLigado] = useState(false);
  const [dia, setDia] = useState(() => new Date().getDay());
  const [hora, setHora] = useState(() => new Date().getHours());

  const estados = useMemo<Record<string, EstadoRegiao> | undefined>(() => {
    if (!ligado) return undefined;
    const saida: Record<string, EstadoRegiao> = {};
    for (const r of regioes) {
      const m = matriz[r.regiao];
      // A MESMA regra do mapa: real ganha de exemplo, exemplo ganha de vazio.
      // Comunidade ilustrativa não pode acender como parceiro de verdade
      // (regra 3 do projeto) — por isso a matriz separa as duas faixas.
      saida[r.regiao] = acesaEm(m?.reais, dia, hora)
        ? "real"
        : acesaEm(m?.demo, dia, hora)
          ? "exemplo"
          : "vazio";
    }
    return saida;
  }, [ligado, dia, hora, regioes, matriz]);

  const acesas = useMemo(
    () => (estados ? regioes.filter((r) => estados[r.regiao] !== "vazio") : []),
    [estados, regioes],
  );

  const quando = `${DIAS[dia]?.nome ?? ""}, ${minutosParaHHMM(hora * 60)}`;

  return (
    <div>
      <MapaDF regioes={regioes} estados={estados} />

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="eyebrow">Eixo de tempo</p>
            <p className="mt-1 text-sm text-foreground/70">
              {ligado
                ? "Escolha o dia e a hora: o mapa mostra só quem treina nesse horário."
                : "Dá pra ver o mapa por horário — o que está rolando terça 6h é bem diferente de sábado 8h."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLigado((v) => !v)}
            aria-pressed={ligado}
            className="shrink-0 text-sm"
          >
            {ligado ? "Ver a semana toda" : "Filtrar por horário"}
          </Button>
        </div>

        {ligado && (
          <div className="mt-6">
            {/* Dias como grupo de rádio: são 7 opções exclusivas, e rádio é o
                que o leitor de tela anuncia como "2 de 7" sem truque de ARIA. */}
            <fieldset>
              <legend className="sr-only">Dia da semana</legend>
              <div className="flex flex-wrap gap-2">
                {/* A pílula é o `chipVariants` do DS (mesma receita da
                    `/comunidades`); o controle continua sendo um rádio nativo
                    ESCONDIDO dentro do rótulo. Não vira `<ChipBotao>`: botão
                    não forma grupo de rádio, e é o grupo que faz o leitor de
                    tela anunciar "2 de 7" sem truque de ARIA. */}
                {DIAS.map((d) => (
                  <label
                    key={d.indice}
                    className={cn(
                      chipVariants({ ativo: dia === d.indice }),
                      "cursor-pointer py-2 font-semibold capitalize",
                    )}
                  >
                    <input
                      type="radio"
                      name="dia-da-semana"
                      className="sr-only"
                      checked={dia === d.indice}
                      onChange={() => setDia(d.indice)}
                    />
                    {d.curto}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6">
              <label
                htmlFor="hora-do-dia"
                className="block font-display text-lg font-bold"
              >
                {quando}
              </label>
              <input
                id="hora-do-dia"
                type="range"
                min={0}
                max={23}
                step={1}
                value={hora}
                onChange={(e) => setHora(Number(e.target.value))}
                aria-valuetext={quando}
                className="mt-3 w-full accent-petroleo"
              />
              {/* Âncoras de leitura: 6h treino da manhã, 12h almoço, 18h fim do
                  expediente. Sem elas o slider é uma barra sem referência. */}
              <div
                aria-hidden="true"
                className="mt-1 flex justify-between font-mono text-[0.65rem] tabular-nums text-foreground/45"
              >
                <span>00h</span>
                <span>06h</span>
                <span>12h</span>
                <span>18h</span>
                <span>23h</span>
              </div>
            </div>

            {/* A mesma informação do desenho, em texto. Não é enfeite: é o
                caminho de quem usa leitor de tela e de quem não distingue as
                cores — a pesquisa é explícita em não codificar estado só por
                cor (5-10% da população tem daltonismo). */}
            <p aria-live="polite" className="mt-6 text-sm">
              {acesas.length === 0 ? (
                <span className="text-foreground/60">
                  Ninguém cadastrado nesse horário ainda. Tente outro dia — ou{" "}
                  <Link
                    href="/#organizador"
                    className="font-semibold underline underline-offset-4"
                  >
                    coloque sua comunidade no mapa
                  </Link>
                  .
                </span>
              ) : (
                <>
                  <span className="font-semibold tabular-nums">
                    {acesas.length}{" "}
                    {acesas.length === 1 ? "região acesa" : "regiões acesas"}
                  </span>
                  <span className="text-foreground/70">
                    {" "}
                    — {acesas.map((r) => r.regiao).join(" · ")}
                  </span>
                </>
              )}
            </p>

            <p className="mt-4 font-mono text-xs leading-relaxed text-foreground/50">
              O mapa mostra a REGIÃO, nunca o ponto exato de encontro — de
              propósito. Só entram comunidades que cadastraram horário; quem
              descreveu o horário só em texto não aparece aqui.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
