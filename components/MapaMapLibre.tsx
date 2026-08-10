"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RegiaoNoMapa } from "@/lib/mapa";
import { CENTROIDES, BBOX_DF, CENTRO_DF } from "@/lib/mapa-geo";
import { camadasMunay } from "@/lib/mapa-estilo";

/**
 * Mapa REAL da Fase 1 — MapLibre GL JS lendo um PMTiles do DF direto do R2.
 *
 * LAZY de propósito: MapLibre é pesado (~200 kB). Nada dele é importado no topo
 * do módulo — `maplibre-gl`, `pmtiles` e o tema entram por `import()` DENTRO do
 * `useEffect`, então só baixam quando esta tela monta, e só quando o mapa real
 * está ativo. As outras páginas não pagam esse custo.
 *
 * Só monta quando a `/mapa` recebe `tilesUrl` (o dono setou `MAPA_TILES_URL`).
 * Sem isso a página renderiza o mapa esquemático de sempre — este componente
 * nem é pedido.
 *
 * Privacidade: os pinos ficam no CENTRO da RA (`CENTROIDES`), nunca no ponto
 * exato de um treino. A contagem é grounded — o que o banco diz por região.
 */
export default function MapaMapLibre({
  tilesUrl,
  regioes,
  full = false,
}: {
  tilesUrl: string;
  regioes: RegiaoNoMapa[];
  /** true → preenche o pai (tela cheia); false → card com altura fixa. */
  full?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [selecionada, setSelecionada] = useState<RegiaoNoMapa | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let map: import("maplibre-gl").Map | null = null;
    let cancelado = false;

    (async () => {
      try {
        // maplibre-gl 6.x exporta tudo como NAMED (sem default); importa o
        // namespace inteiro. Nada disso está no topo do módulo — só baixa aqui.
        const maplibregl = await import("maplibre-gl");
        const { Protocol } = await import("pmtiles");

        if (cancelado || !container.current) return;

        // Registra o protocolo pmtiles:// — o MapLibre passa a ler o arquivo
        // .pmtiles por HTTP range direto, sem servidor de tiles.
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
            // Estilo próprio da MUNAY (vibe "tipo Waze", paleta da marca).
            layers: camadasMunay("protomaps"),
          },
        });
        map = m;

        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        // Enquadra o DF e trava o pan longe dele — é um mapa da cidade, não do mundo.
        m.fitBounds(BBOX_DF, { padding: 24, animate: false });
        m.setMaxBounds([
          [BBOX_DF[0] - 0.3, BBOX_DF[1] - 0.3],
          [BBOX_DF[2] + 0.3, BBOX_DF[3] + 0.3],
        ]);

        // Um pino por RA, no centro, dimensionado/colorido pelo estado.
        for (const r of regioes) {
          const centro = CENTROIDES[r.regiao];
          if (!centro) continue;

          const el = document.createElement("button");
          el.type = "button";
          el.className = `mapa-pino mapa-pino--${r.estado}`;
          el.setAttribute("aria-label", `${r.regiao}: ${r.total} comunidade(s)`);
          el.textContent = r.total > 0 ? String(r.total) : "";
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            setSelecionada(r);
            m.flyTo({ center: centro, zoom: 12, speed: 0.8 });
          });

          new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat(centro)
            .addTo(m);
        }

        m.on("error", () => setErro(true));
      } catch {
        if (!cancelado) setErro(true);
      }
    })();

    return () => {
      cancelado = true;
      map?.remove();
    };
  }, [tilesUrl, regioes]);

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
