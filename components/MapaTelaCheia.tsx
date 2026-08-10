"use client";

import { useState } from "react";
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
  const comDado = regioes.filter((r) => r.estado !== "vazio");
  const reais = regioes.filter((r) => r.estado === "real").length;
  const vazias = regioes.filter((r) => r.estado === "vazio");

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-areia">
      {/* Basemap full-bleed atrás de tudo */}
      <MapaMapLibre full tilesUrl={tilesUrl} regioes={regioes} />

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
              {comDado.map((r) => (
                <li key={r.regiao}>
                  <Link
                    href={`/descobrir/${r.slug}`}
                    className="group flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-petroleo hover:text-areia"
                  >
                    <span className="font-medium text-petroleo group-hover:text-areia">
                      {r.regiao}
                      {r.estado === "exemplo" && (
                        <span className="ml-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-petroleo/45 group-hover:text-areia/60">
                          exemplo
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-petroleo/50 group-hover:text-areia/70">
                      {r.total}
                    </span>
                  </Link>
                </li>
              ))}
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
