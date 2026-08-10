"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RegiaoNoMapa } from "@/lib/mapa";
import { CENTROIDES, BBOX_DF, CENTRO_DF } from "@/lib/mapa-geo";
import { camadasMunay } from "@/lib/mapa-estilo";

/**
 * Mapa REAL da Fase 1 — MapLibre GL JS lendo um PMTiles do DF direto do R2.
 *
 * LAZY: `maplibre-gl`/`pmtiles` entram por `import()` DENTRO do `useEffect`, só
 * baixam quando esta tela monta. Privacidade: pinos no CENTRO da RA, nunca o
 * ponto exato. Contagem grounded.
 *
 * Interatividade/movimento (com bom gosto, e honrando `prefers-reduced-motion`):
 * intro de câmera suave, pinos com entrada escalonada e hover/pulse, clique →
 * flyTo, e sync com a lista via `destaqueId` (pulse) e `focoTick` (voa até a RA).
 */
export default function MapaMapLibre({
  tilesUrl,
  regioes,
  full = false,
  destaqueId = null,
  focoId = null,
  focoTick = 0,
  onSelecionar,
}: {
  tilesUrl: string;
  regioes: RegiaoNoMapa[];
  full?: boolean;
  /** RA a "pulsar" (hover na lista). */
  destaqueId?: string | null;
  /** RA a focar; muda junto com `focoTick` pra revoar mesmo na mesma RA. */
  focoId?: string | null;
  focoTick?: number;
  /** Clique num pino. */
  onSelecionar?: (r: RegiaoNoMapa) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<import("maplibre-gl").Map | null>(null);
  const elementos = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [selecionada, setSelecionada] = useState<RegiaoNoMapa | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const els = elementos.current;
    const reduz =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        const { Protocol } = await import("pmtiles");
        if (cancelado || !container.current) return;

        const protocol = new Protocol();
        maplibregl.addProtocol("pmtiles", protocol.tile);

        const m = new maplibregl.Map({
          container: container.current,
          center: CENTRO_DF,
          zoom: 9.2,
          attributionControl: { compact: true },
          style: {
            version: 8,
            glyphs:
              "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
            sources: {
              protomaps: {
                type: "vector",
                url: `pmtiles://${tilesUrl}`,
                attribution:
                  '<a href="https://openstreetmap.org/copyright">© OpenStreetMap</a> · Protomaps',
              },
            },
            layers: camadasMunay("protomaps"),
          },
        });
        mapaRef.current = m;

        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        m.setMaxBounds([
          [BBOX_DF[0] - 0.3, BBOX_DF[1] - 0.3],
          [BBOX_DF[2] + 0.3, BBOX_DF[3] + 0.3],
        ]);

        // ── Intro de câmera: começa um tico mais longe e dá um zoom-in macio ──
        const alvo = m.cameraForBounds(BBOX_DF, { padding: 24 });
        if (reduz || !alvo) {
          m.fitBounds(BBOX_DF, { padding: 24, animate: false });
        } else {
          m.jumpTo({ center: alvo.center as [number, number], zoom: (alvo.zoom ?? 9) - 0.8 });
          m.once("load", () => {
            m.easeTo({
              center: alvo.center as [number, number],
              zoom: alvo.zoom,
              duration: 1500,
              easing: (t) => t * (2 - t), // ease-out
            });
          });
        }

        // ── Pinos: entrada escalonada, hover, clique → flyTo ──────────────────
        regioes.forEach((r, i) => {
          const centro = CENTROIDES[r.regiao];
          if (!centro) return;

          const el = document.createElement("button");
          el.type = "button";
          el.className = `mapa-pino mapa-pino--${r.estado}${reduz ? "" : " mapa-pino--anima"}`;
          if (!reduz) el.style.animationDelay = `${300 + i * 18}ms`;
          el.setAttribute("aria-label", `${r.regiao}: ${r.total} comunidade(s)`);
          el.textContent = r.total > 0 ? String(r.total) : "";
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            setSelecionada(r);
            onSelecionar?.(r);
            if (reduz) m.jumpTo({ center: centro, zoom: 12.5 });
            else m.flyTo({ center: centro, zoom: 12.5, speed: 0.7, curve: 1.4, essential: true });
          });

          els.set(r.regiao, el);
          new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(centro).addTo(m);
        });

        m.on("error", () => setErro(true));
      } catch {
        if (!cancelado) setErro(true);
      }
    })();

    return () => {
      cancelado = true;
      els.clear();
      mapaRef.current?.remove();
      mapaRef.current = null;
    };
  }, [tilesUrl, regioes, onSelecionar]);

  // Destaque (pulse) da RA sob hover na lista — imperativo, sem recriar o mapa.
  useEffect(() => {
    for (const [ra, el] of elementos.current) {
      el.classList.toggle("mapa-pino--destaque", ra === destaqueId);
    }
  }, [destaqueId]);

  // Foco: a lista pediu pra voar até uma RA (revoa mesmo na mesma, via tick).
  useEffect(() => {
    if (!focoId) return;
    const centro = CENTROIDES[focoId];
    const m = mapaRef.current;
    if (!centro || !m) return;
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduz) m.jumpTo({ center: centro, zoom: 12.5 });
    else m.flyTo({ center: centro, zoom: 12.5, speed: 0.7, curve: 1.4, essential: true });
  }, [focoTick, focoId]);

  return (
    <div className={full ? "absolute inset-0" : "relative"}>
      <div
        ref={container}
        data-testid="mapa-real"
        className={
          full
            ? "h-full w-full bg-areia"
            : "h-[28rem] w-full overflow-hidden rounded-card border border-petroleo/10 bg-areia sm:h-[34rem]"
        }
        role="application"
        aria-label="Mapa das comunidades no Distrito Federal"
      />
      {selecionada && (
        <div
          className={
            "pointer-events-none absolute z-30 rounded-lg border border-petroleo/15 bg-areia/95 px-3 py-2 text-sm shadow-md backdrop-blur " +
            (full ? "left-3 top-20 sm:top-3" : "left-3 top-3")
          }
        >
          <span className="font-semibold text-petroleo">{selecionada.regiao}</span>
          <span className="ml-2 font-mono text-xs text-petroleo/70">
            {selecionada.total > 0
              ? `${selecionada.total} comunidade${selecionada.total === 1 ? "" : "s"}`
              : "ainda sem ninguém"}
          </span>
        </div>
      )}
      {erro && (
        <p
          className={
            full
              ? "absolute bottom-3 left-3 z-30 rounded-lg bg-areia/95 px-3 py-2 font-mono text-xs text-petroleo/70 shadow-md"
              : "mt-2 font-mono text-xs text-petroleo/50"
          }
        >
          O mapa base não carregou agora — a lista tem a mesma informação.
        </p>
      )}
    </div>
  );
}
