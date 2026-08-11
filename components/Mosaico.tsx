import Link from "next/link";
import MidiaPlaceholder from "@/components/MidiaPlaceholder";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { FEED_MIDIA, temMidiaReal, type ItemMidia } from "@/lib/midia";
import { acentoDaModalidade, classesDoAcento } from "@/lib/modalidades";

/**
 * SEÇÃO DE MÍDIA — briefing 07/08/2026, item 2 ("fotos, feed e vídeos,
 * inspirada no formato usado por eventos como o NOW Festival").
 *
 * Três exigências do briefing e como cada uma virou decisão:
 *
 * · "grid ou carrossel de mídia em movimento" → grid editorial assimétrico
 *   no desktop, carrossel com snap no mobile. **Sem JavaScript**: o snap é
 *   CSS (`snap-x`), do mesmo jeito que o `/mapa` desenha 35 regiões sem um
 *   byte de JS. Carrossel com biblioteca custaria ~15kb pra fazer o que
 *   `overflow-x-auto` já faz.
 *
 * · "estilo editorial de festival" → tiles de alturas diferentes, legenda
 *   sobreposta, tipografia mono em caixa alta. O que dá a cara de festival
 *   é a assimetria, não o efeito.
 *
 * · "deve reforçar a sensação de comunidade viva — não um mockup estático
 *   de app" → nenhum tile mostra tela de celular. O movimento é sutil e
 *   respeita `prefers-reduced-motion` (regra do globals.css).
 *
 * ⚠️ O AVISO NO RODAPÉ DA SEÇÃO NÃO É DECORATIVO. Enquanto não houver mídia
 * real autorizada, a seção diz que é ilustração. Regra 3 do projeto: exemplo
 * não pode parecer parceria firmada — e aqui o risco é maior que no `/mapa`,
 * porque foto passa por prova social sem ninguém questionar. Some sozinho
 * quando `temMidiaReal()` virar true.
 */

function Tile({ item }: { item: ItemMidia }) {
  const acento = item.acento ?? acentoDaModalidade(item.modalidade);
  const cor = classesDoAcento(acento);

  const vao =
    item.formato === "alto"
      ? "lg:row-span-2"
      : item.formato === "largo"
        ? "lg:col-span-2"
        : "";

  return (
    <figure
      className={`group relative isolate w-[78vw] shrink-0 snap-center overflow-hidden rounded-card sm:w-auto ${cor.fundo} ${cor.tinta} ${vao} ${
        item.formato === "alto" ? "aspect-[3/4] lg:aspect-auto" : "aspect-[4/3]"
      }`}
    >
      {item.src ? (
        item.tipo === "video" ? (
          // Vídeo de fundo: mudo, em loop e sem controles — é ambientação,
          // não conteúdo que a pessoa vem consumir. `playsInline` porque no
          // iOS um vídeo sem isso abre em tela cheia sozinho.
          <video
            src={item.src}
            muted
            loop
            autoPlay
            playsInline
            aria-label={item.alt}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          // Mídia editorial entra por arquivo em /public com dimensão já
          // conhecida e otimizada na exportação; `next/image` aqui só
          // acrescentaria uma camada de otimização sobre asset otimizado.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.src}
            alt={item.alt}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )
      ) : (
        <div className="absolute inset-0 animate-deriva">
          <MidiaPlaceholder id={item.id} />
        </div>
      )}

      {/* Véu de leitura: sem ele, legenda clara sobre composição clara some. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-petroleo/85 via-petroleo/35 to-transparent"
      />

      {item.tipo === "video" && (
        <Badge className="absolute right-4 top-4 gap-1.5 border-transparent bg-areia/90 text-petroleo">
          <span aria-hidden>▶</span> vídeo
        </Badge>
      )}

      <figcaption className="absolute inset-x-0 bottom-0 p-5 text-areia">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-areia/70">
          {item.modalidade} · {item.regiao}
        </p>
        <p className="mt-1.5 font-display text-lg font-bold leading-snug">
          {item.legenda}
        </p>
      </figcaption>
    </figure>
  );
}

export default function Mosaico() {
  const midiaReal = temMidiaReal();

  return (
    <section id="acontecendo" className="border-y border-petroleo/10 bg-salvia-soft py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-3">Rolou essa semana</p>
            <h2 className="max-w-xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Não é feed de app. É gente que saiu de casa.
            </h2>
          </div>
          <Link
            href="/comunidades"
            className={buttonVariants({
              variant: "outline",
              className:
                "border-2 border-salvia bg-areia text-salvia-deep hover:bg-salvia-deep hover:text-areia",
            })}
          >
            Ver o que tem hoje
          </Link>
        </div>
      </div>

      {/* Mobile: carrossel com snap, sangrando pra fora da margem (o corte
          na borda é o que faz parecer festival, e não lista). Desktop: grid
          editorial. `dense` deixa o tile largo preencher buraco em vez de
          abrir vão. */}
      <div className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:mx-auto sm:max-w-6xl sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:auto-rows-[13rem] lg:grid-cols-4 lg:[grid-auto-flow:dense]">
        {FEED_MIDIA.map((item) => (
          <Tile key={item.id} item={item} />
        ))}
      </div>

      {!midiaReal && (
        <div className="mx-auto mt-6 max-w-6xl px-5">
          <p className="font-mono text-xs text-petroleo/45">
            * Composições ilustrativas. As fotos e vídeos reais entram no
            lançamento, com autorização de imagem de quem aparece e das
            comunidades.
          </p>
        </div>
      )}
    </section>
  );
}
