"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import MapaMapLibre from "./MapaMapLibre";
import type { RegiaoNoMapa } from "@/lib/mapa";

/**
 * Mapa em TELA CHEIA (vibe Waze/Sympla): o basemap ocupa a viewport inteira,
 * edge-to-edge, e a UI FLUTUA por cima.
 *
 * - `100dvh` (não `100vh`): no mobile a barra de endereço muda a altura da tela;
 *   `dvh` acompanha, `vh` deixaria um pedaço cortado atrás da barra.
 * - Painel das RAs: **bottom sheet** no mobile (desliza de baixo), **painel
 *   lateral** flutuante no desktop. Fundo opaco (areia/95 + blur) pra o texto
 *   sobre o mapa ter contraste AA — nunca confiando na cor do mapa atrás.
 * - Header e busca são pílulas flutuantes nos cantos; a nav padrão do site sai.
 */
export default function MapaTelaCheia({
  tilesUrl,
  regioes,
}: {
  tilesUrl: string;
  regioes: RegiaoNoMapa[];
}) {
  const [aberto, setAberto] = useState(true);
  // Sync lista ↔ mapa: `destaque` pulsa o pino (hover), `selecionada` é a RA
  // escolhida (clique), e `foco` (RA + tick) manda o mapa voar — o tick deixa
  // revoar mesmo clicando na mesma RA duas vezes.
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [destaque, setDestaque] = useState<string | null>(null);
  const [foco, setFoco] = useState<{ id: string; tick: number }>({ id: "", tick: 0 });
  const itens = useRef<Map<string, HTMLLIElement>>(new Map());

  const comDado = regioes.filter((r) => r.estado !== "vazio");
  const reais = regioes.filter((r) => r.estado === "real").length;
  const vazias = regioes.filter((r) => r.estado === "vazio");

  function escolher(regiao: string) {
    setSelecionada(regiao);
    setFoco((f) => ({ id: regiao, tick: f.tick + 1 }));
    const li = itens.current.get(regiao);
    li?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-areia">
      {/* Basemap full-bleed atrás de tudo */}
      <MapaMapLibre
        full
        tilesUrl={tilesUrl}
        regioes={regioes}
        destaqueId={destaque}
        focoId={foco.id}
        focoTick={foco.tick}
        onSelecionar={(r) => escolher(r.regiao)}
      />

      {/* ── Header flutuante (a nav do site vira overlay discreto) ─────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-3 sm:p-4">
        <Link
          href="/"
          aria-label="Voltar para a página inicial"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-areia/95 px-4 py-2 text-sm font-bold tracking-tight text-petroleo shadow-md ring-1 ring-petroleo/10 backdrop-blur transition-colors hover:bg-areia"
        >
          <span aria-hidden="true">←</span> MUNAY
        </Link>
        <Link
          href="/comunidades"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-petroleo px-4 py-2 text-sm font-semibold text-areia shadow-md transition-transform hover:scale-[1.02]"
        >
          Buscar comunidades
        </Link>
      </div>

      {/* ── Painel das RAs: bottom sheet (mobile) / lateral (desktop) ──────── */}
      <aside
        className={
          "absolute inset-x-0 bottom-0 z-20 overflow-hidden rounded-t-2xl bg-areia/95 shadow-2xl ring-1 ring-petroleo/10 backdrop-blur " +
          "transition-[max-height] duration-300 ease-out " +
          (aberto ? "max-h-[62dvh]" : "max-h-[4.5rem]") +
          " sm:inset-x-auto sm:bottom-4 sm:left-4 sm:top-20 sm:max-h-none sm:w-[21rem] sm:rounded-2xl"
        }
        aria-label="Regiões administrativas do DF"
      >
        {/* Cabeçalho do painel — no mobile é o puxador do bottom sheet */}
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left sm:cursor-default"
          aria-expanded={aberto}
        >
          <span>
            <span className="block font-display text-lg font-extrabold leading-tight text-petroleo">
              Brasília, região por região
            </span>
            <span className="text-xs text-petroleo/60">
              {reais > 0
                ? `${reais} região com comunidade`
                : "35 regiões · o mapa está inteiro em aberto"}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 rounded-full bg-petroleo/10 px-2 py-1 text-xs font-semibold text-petroleo sm:hidden"
          >
            {aberto ? "▾" : "▴"}
          </span>
        </button>

        <div className="max-h-[calc(62dvh-4.5rem)] overflow-y-auto px-5 pb-6 sm:max-h-[calc(100dvh-11rem)]">
          {/* Legenda */}
          <dl className="grid grid-cols-3 gap-2 border-y border-petroleo/10 py-3 text-center">
            <Legenda cor="bg-petroleo" titulo="Cadastrada" valor={reais} />
            <Legenda contorno titulo="Exemplo" valor={comDado.length - reais} />
            <Legenda cor="bg-petroleo/20" titulo="Sem nada" valor={vazias.length} />
          </dl>

          {/* Lista das RAs com comunidade */}
          {comDado.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {comDado.map((r) => {
                const ativa = selecionada === r.regiao;
                return (
                  <li
                    key={r.regiao}
                    ref={(el) => {
                      if (el) itens.current.set(r.regiao, el);
                      else itens.current.delete(r.regiao);
                    }}
                    className={
                      "group flex items-center gap-2 rounded-lg pr-1 text-sm transition-colors " +
                      (ativa ? "bg-petroleo text-areia" : "hover:bg-petroleo/10")
                    }
                    onMouseEnter={() => setDestaque(r.regiao)}
                    onMouseLeave={() => setDestaque((d) => (d === r.regiao ? null : d))}
                  >
                    {/* Clicar na linha foca a RA no mapa (não sai da página) */}
                    <button
                      type="button"
                      onClick={() => escolher(r.regiao)}
                      onFocus={() => setDestaque(r.regiao)}
                      onBlur={() => setDestaque((d) => (d === r.regiao ? null : d))}
                      aria-pressed={ativa}
                      className="flex flex-1 items-baseline justify-between gap-3 px-2 py-1.5 text-left"
                    >
                      <span className={"font-medium " + (ativa ? "text-areia" : "text-petroleo")}>
                        {r.regiao}
                        {r.estado === "exemplo" && (
                          <span
                            className={
                              "ml-1.5 font-mono text-[0.65rem] uppercase tracking-wider " +
                              (ativa ? "text-areia/60" : "text-petroleo/45")
                            }
                          >
                            exemplo
                          </span>
                        )}
                      </span>
                      <span
                        className={
                          "shrink-0 font-mono text-xs " + (ativa ? "text-areia/70" : "text-petroleo/50")
                        }
                      >
                        {r.total}
                      </span>
                    </button>
                    {/* Atalho pra página da RA */}
                    <Link
                      href={`/descobrir/${r.slug}`}
                      aria-label={`Abrir ${r.regiao}`}
                      className={
                        "shrink-0 rounded-md px-2 py-1 font-mono text-xs transition-colors " +
                        (ativa
                          ? "text-areia/80 hover:bg-areia/15"
                          : "text-petroleo/40 hover:bg-petroleo/10 hover:text-petroleo")
                      }
                    >
                      abrir →
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-petroleo/70">
              Nenhuma região cadastrada ainda. O mapa está inteiro em aberto — e é
              exatamente aí que a MUNAY precisa chegar.
            </p>
          )}

          {vazias.length > 0 && (
            <section className="mt-5">
              <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-petroleo/50">
                Ainda sem ninguém
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-petroleo/55">
                {vazias.map((r) => r.regiao).join(" · ")}
              </p>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

function Legenda({
  cor,
  contorno,
  titulo,
  valor,
}: {
  cor?: string;
  contorno?: boolean;
  titulo: string;
  valor: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={
          "h-3 w-3 rounded-full " +
          (contorno ? "border border-dashed border-petroleo/60" : cor)
        }
      />
      <dt className="text-[0.7rem] font-semibold text-petroleo">{titulo}</dt>
      <dd className="font-mono text-xs text-petroleo/60">{valor}</dd>
    </div>
  );
}
