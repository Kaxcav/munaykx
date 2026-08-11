"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Search } from "lucide-react";
import MapaMapLibre from "./MapaMapLibre";
import type { RegiaoNoMapa } from "@/lib/mapa";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Mapa em TELA CHEIA (vibe Waze/Sympla) — UI re-vestida com shadcn/ui na marca
 * MUNAY. O basemap MapLibre (Clean + 3D) NÃO muda; muda só a moldura:
 *
 * - Painel das RAs: **Sheet** (shadcn, desliza de baixo) no MOBILE; painel
 *   lateral persistente no DESKTOP. Mesmo conteúdo (`PainelRegioes`) nos dois.
 * - Busca: **Input** que filtra a lista das RAs ao vivo.
 * - Legenda: **Badge**. Lista: **ScrollArea**. Header/CTA: **Button**.
 * - Marca só no ACENTO (pino coral, petróleo/areia na UI); o mapa fica limpo.
 *
 * `100dvh` (não `100vh`): no mobile a barra de endereço muda a altura da tela.
 */
export default function MapaTelaCheia({
  tilesUrl,
  regioes,
}: {
  tilesUrl: string;
  regioes: RegiaoNoMapa[];
}) {
  // Sync lista ↔ mapa: `destaque` pulsa o pino (hover), `selecionada` é a RA
  // escolhida (clique), e `foco` (RA + tick) manda o mapa voar — o tick deixa
  // revoar mesmo clicando na mesma RA duas vezes.
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [destaque, setDestaque] = useState<string | null>(null);
  const [foco, setFoco] = useState<{ id: string; tick: number }>({ id: "", tick: 0 });

  const reais = regioes.filter((r) => r.estado === "real").length;

  function escolher(regiao: string) {
    setSelecionada(regiao);
    setFoco((f) => ({ id: regiao, tick: f.tick + 1 }));
  }

  const subtitulo =
    reais > 0 ? `${reais} região com comunidade` : "35 regiões · o mapa está inteiro em aberto";

  const painel = (
    <PainelRegioes
      regioes={regioes}
      selecionada={selecionada}
      onEscolher={escolher}
      onDestaque={setDestaque}
    />
  );

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* Basemap full-bleed atrás de tudo (Clean + 3D) */}
      <MapaMapLibre
        full
        tilesUrl={tilesUrl}
        regioes={regioes}
        destaqueId={destaque}
        focoId={foco.id}
        focoTick={foco.tick}
        onSelecionar={(r) => escolher(r.regiao)}
      />

      {/* ── Header flutuante (nav do site vira overlay discreto) ───────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-3 sm:p-4">
        <Link
          href="/"
          aria-label="Voltar para a página inicial"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "pointer-events-auto bg-background/90 font-bold tracking-tight shadow-md ring-1 ring-border backdrop-blur hover:bg-background",
          )}
        >
          <ArrowLeft aria-hidden="true" /> MUNAY
        </Link>
        <Link
          href="/comunidades"
          className={cn(buttonVariants({ size: "sm" }), "pointer-events-auto shadow-md")}
        >
          Buscar comunidades
        </Link>
      </div>

      {/* ── Painel das RAs: lateral (desktop) ──────────────────────────────── */}
      <aside
        className="absolute bottom-4 left-4 top-20 z-20 hidden w-[22rem] flex-col overflow-hidden rounded-2xl bg-background/95 shadow-2xl ring-1 ring-border backdrop-blur sm:flex"
        aria-label="Regiões administrativas do DF"
      >
        <div className="px-5 pb-3 pt-4">
          <h2 className="font-display text-lg font-extrabold leading-tight text-petroleo">
            Brasília, região por região
          </h2>
          <p className="text-xs text-petroleo/60">{subtitulo}</p>
        </div>
        {painel}
      </aside>

      {/* ── Painel das RAs: Sheet (mobile) ─────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-5 z-20 flex justify-center sm:hidden">
        <Sheet>
          <SheetTrigger
            className={cn(buttonVariants({ size: "default" }), "pointer-events-auto shadow-xl")}
          >
            <MapPin aria-hidden="true" /> Ver regiões · {regioes.length}
          </SheetTrigger>
          <SheetContent side="bottom" className="flex max-h-[82dvh] flex-col px-0 pb-0">
            <SheetHeader className="px-5 pt-5">
              <SheetTitle>Brasília, região por região</SheetTitle>
              <SheetDescription>{subtitulo}</SheetDescription>
            </SheetHeader>
            {painel}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

/**
 * Corpo do painel — reaproveitado no painel lateral (desktop) e no Sheet
 * (mobile). Cada instância tem sua própria busca e sua própria rolagem, e rola
 * até a RA selecionada quando ela muda.
 */
function PainelRegioes({
  regioes,
  selecionada,
  onEscolher,
  onDestaque,
}: {
  regioes: RegiaoNoMapa[];
  selecionada: string | null;
  onEscolher: (regiao: string) => void;
  onDestaque: (regiao: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const itens = useRef<Map<string, HTMLLIElement>>(new Map());

  const comDado = regioes.filter((r) => r.estado !== "vazio");
  const reais = regioes.filter((r) => r.estado === "real").length;
  const vazias = regioes.filter((r) => r.estado === "vazio");

  const norm = (s: string) =>
    s.normalize("NFD").replace(new RegExp("[\u0300-\u036f]", "g"), "").toLowerCase();
  const filtro = norm(q.trim());
  const lista = useMemo(
    () => (filtro ? comDado.filter((r) => norm(r.regiao).includes(filtro)) : comDado),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtro, regioes],
  );

  // Rola até a RA selecionada (só na instância visível o scroll tem efeito).
  useEffect(() => {
    if (selecionada) itens.current.get(selecionada)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selecionada]);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
      {/* Busca — Input filtra a lista ao vivo */}
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-petroleo/40"
        />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar região…"
          aria-label="Filtrar região"
          className="bg-card/80 pl-10"
        />
      </div>

      {/* Legenda — Badges com bolinha da cor do pino */}
      <div className="mt-3 flex flex-wrap gap-2 border-b border-border pb-3">
        <LegendaBadge cor="bg-coral" titulo="Cadastrada" valor={reais} />
        <LegendaBadge contorno titulo="Exemplo" valor={comDado.length - reais} />
        <LegendaBadge cor="bg-muted-foreground/40" titulo="Sem nada" valor={vazias.length} />
      </div>

      {/* Lista — ScrollArea */}
      <ScrollArea className="-mx-2 mt-2 min-h-0 flex-1">
        <div className="px-2">
          {comDado.length === 0 ? (
            <p className="py-2 text-sm text-petroleo/70">
              Nenhuma região cadastrada ainda. O mapa está inteiro em aberto — e é exatamente aí que
              a MUNAY precisa chegar.
            </p>
          ) : lista.length === 0 ? (
            <p className="py-2 text-sm text-petroleo/60">Nenhuma região com “{q}”.</p>
          ) : (
            <ul className="space-y-0.5">
              {lista.map((r) => {
                const ativa = selecionada === r.regiao;
                return (
                  <li
                    key={r.regiao}
                    ref={(el) => {
                      if (el) itens.current.set(r.regiao, el);
                      else itens.current.delete(r.regiao);
                    }}
                    className={cn(
                      "group flex items-center gap-1 rounded-lg pr-1 text-sm transition-colors",
                      ativa ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    )}
                    onMouseEnter={() => onDestaque(r.regiao)}
                    onMouseLeave={() => onDestaque(null)}
                  >
                    <button
                      type="button"
                      onClick={() => onEscolher(r.regiao)}
                      onFocus={() => onDestaque(r.regiao)}
                      onBlur={() => onDestaque(null)}
                      aria-pressed={ativa}
                      className="flex flex-1 items-baseline justify-between gap-3 px-2 py-2 text-left"
                    >
                      <span className={cn("font-medium", ativa ? "text-primary-foreground" : "text-petroleo")}>
                        {r.regiao}
                        {r.estado === "exemplo" && (
                          <span
                            className={cn(
                              "ml-1.5 font-mono text-[0.65rem] uppercase tracking-wider",
                              ativa ? "text-primary-foreground/60" : "text-petroleo/45",
                            )}
                          >
                            exemplo
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-xs",
                          ativa ? "text-primary-foreground/70" : "text-petroleo/50",
                        )}
                      >
                        {r.total}
                      </span>
                    </button>
                    <Link
                      href={`/descobrir/${r.slug}`}
                      aria-label={`Abrir ${r.regiao}`}
                      className={cn(
                        "shrink-0 rounded-md px-2 py-1 font-mono text-xs transition-colors",
                        ativa
                          ? "text-primary-foreground/80 hover:bg-primary-foreground/15"
                          : "text-petroleo/40 hover:bg-accent hover:text-petroleo",
                      )}
                    >
                      abrir →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {!filtro && vazias.length > 0 && (
            <section className="mt-4">
              <h3 className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-petroleo/50">
                Ainda sem ninguém
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-petroleo/55">
                {vazias.map((r) => r.regiao).join(" · ")}
              </p>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/** Item da legenda como Badge, com a bolinha na cor do pino correspondente. */
function LegendaBadge({
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
    <Badge variant="outline" className="gap-1.5 border-border py-1 normal-case tracking-normal">
      <span
        aria-hidden="true"
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          contorno ? "border border-coral" : cor,
        )}
      />
      <span className="text-petroleo/80">{titulo}</span>
      <span className="font-mono font-semibold text-petroleo">{valor}</span>
    </Badge>
  );
}
