"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Card } from "@/components/ui/card";
import type { RegiaoNoMapa } from "@/lib/mapa";
import { CENTROIDES, BBOX_DF, CENTRO_DF } from "@/lib/mapa-geo";
import { estiloMapa } from "@/lib/mapa-temas";

/** Inclinação da câmera na abertura — o "3D tipo Waze". ~55° fica bonito sem
 *  deitar demais o horizonte. */
const PITCH = 55;

/** O mínimo do mapa que o botão de perspectiva precisa tocar. */
type MapaCtrl = {
  getPitch(): number;
  getBearing(): number;
  easeTo(o: object): void;
  on(ev: string, cb: () => void): void;
};

/**
 * Controle "2D/3D" no canto — o gesto explícito de VOLTAR AO TOP-DOWN (e ir de
 * volta pra perspectiva). A bússola do NavigationControl já reendireita o norte;
 * este resolve o pitch, que ela não zera. Respeita reduced-motion (troca seca).
 */
class BotaoPerspectiva {
  private reduz: boolean;
  private div?: HTMLDivElement;
  constructor(reduz: boolean) {
    this.reduz = reduz;
  }
  onAdd(map: MapaCtrl): HTMLElement {
    const div = document.createElement("div");
    div.className = "maplibregl-ctrl maplibregl-ctrl-group";
    const b = document.createElement("button");
    b.type = "button";
    b.title = "Alternar 2D / 3D";
    b.setAttribute("aria-label", "Alternar entre visão 2D e 3D");
    b.style.font = "700 11px/1 var(--font-mono, monospace)";
    const rotula = () => {
      b.textContent = map.getPitch() > 5 ? "2D" : "3D";
    };
    rotula();
    b.addEventListener("click", () => {
      const em3d = map.getPitch() > 5;
      map.easeTo({
        pitch: em3d ? 0 : PITCH,
        bearing: em3d ? 0 : map.getBearing(),
        duration: this.reduz ? 0 : 600,
      });
      b.textContent = em3d ? "3D" : "2D";
    });
    map.on("pitchend", rotula);
    div.appendChild(b);
    this.div = div;
    return div;
  }
  onRemove(): void {
    this.div?.parentNode?.removeChild(this.div);
  }
}

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

    const est = estiloMapa();

    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        const { Protocol } = await import("pmtiles");
        if (cancelado || !container.current) return;

        // Fundo do container = fundo do tema (mata o flash branco no escuro).
        container.current.style.backgroundColor = est.fundo;

        const protocol = new Protocol();
        maplibregl.addProtocol("pmtiles", protocol.tile);

        const m = new maplibregl.Map({
          container: container.current,
          center: CENTRO_DF,
          zoom: 9.2,
          pitch: reduz ? PITCH : 0, // reduced-motion já nasce na perspectiva (sem a intro)
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
            layers: est.layers,
          },
        });
        mapaRef.current = m;

        // Compass + visualizePitch: o clicar na bússola já volta ao norte; o
        // botão "2D/3D" abaixo dá o atalho explícito pro top-down.
        m.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), "top-right");
        m.addControl(
          new BotaoPerspectiva(reduz) as unknown as import("maplibre-gl").IControl,
          "top-right",
        );
        m.setMaxBounds([
          [BBOX_DF[0] - 0.3, BBOX_DF[1] - 0.3],
          [BBOX_DF[2] + 0.3, BBOX_DF[3] + 0.3],
        ]);

        // ── Céu/atmosfera — reforça o 3D sob pitch. Cores da marca (areia/sálvia). ──
        m.on("style.load", () => {
          try {
            (m as unknown as { setSky?: (s: object) => void }).setSky?.(est.sky);
          } catch {
            /* setSky ausente nesta versão — pitch + extrusão já entregam o 3D */
          }
        });

        // ── Intro de câmera: entra de longe/plano e sobe pra perspectiva. ─────
        const alvo = m.cameraForBounds(BBOX_DF, { padding: 24 });
        if (reduz || !alvo) {
          // Estático, mas já inclinado (perspectiva sem movimento).
          if (alvo) m.jumpTo({ center: alvo.center as [number, number], zoom: alvo.zoom, pitch: PITCH });
          else m.fitBounds(BBOX_DF, { padding: 24, animate: false });
        } else {
          m.jumpTo({ center: alvo.center as [number, number], zoom: (alvo.zoom ?? 9) - 0.8, pitch: 0 });
          m.once("load", () => {
            m.easeTo({
              center: alvo.center as [number, number],
              zoom: alvo.zoom,
              pitch: PITCH,
              duration: 1900,
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
      {/* Modo embutido: a moldura é o `<Card>` do DS. `bg-areia` continua
          sobrescrevendo o `bg-card` branco de propósito — é a cor que aparece
          no instante entre montar o container e os tiles chegarem, e branco
          ali daria um flash claro no meio da página de areia.
          Modo `full`: o mapa É a tela, não tem moldura nenhuma pra ser card. */}
      {full ? (
        <div
          ref={container}
          data-testid="mapa-real"
          className="h-full w-full bg-areia"
          role="application"
          aria-label="Mapa das comunidades no Distrito Federal"
        />
      ) : (
        <Card
          ref={container}
          data-testid="mapa-real"
          className="h-[28rem] w-full overflow-hidden bg-areia sm:h-[34rem]"
          role="application"
          aria-label="Mapa das comunidades no Distrito Federal"
        />
      )}
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
