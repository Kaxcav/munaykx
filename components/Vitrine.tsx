import Link from "next/link";
import SeloAcolheIniciante from "@/components/SeloAcolheIniciante";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCommunities } from "@/lib/communities";
import {
  LEGENDA_FAMILIAS,
  acentoDaModalidade,
  classesDoAcento,
  familiaDaModalidade,
} from "@/lib/modalidades";

/**
 * IMPORTANTE (jurídico/edital): NÃO publicar nomes de parceiros reais
 * (Liga Entrequadras, MOAI, Gracie Barra, Evolve etc.) sem autorização
 * formal de uso de marca. Os dados do banco são seed demo, por modalidade.
 * Quando os parceiros-âncora confirmarem, substituir no banco.
 *
 * BRIEFING 07/08/2026, ITEM 3 — cor nos cards:
 * "Hoje estão visualmente neutros demais e não diferenciam categorias. (…)
 * Cada categoria pode ganhar uma cor de destaque sutil, criando
 * reconhecimento visual rápido."
 *
 * Como foi feito, e o que isso protege: a cor NÃO é escolhida card a card
 * nem pela posição no grid — é derivada da modalidade em
 * `lib/modalidades.ts`. Consequência prática: jiu-jítsu é a mesma cor aqui,
 * na busca e no mapa, e continua sendo depois de filtrar. Cor que muda de
 * lugar pra lugar não cria reconhecimento — cria ruído.
 *
 * "Sutil" foi levado ao pé da letra: fundo em tom lavado (`-soft`), traço
 * fino no topo e a etiqueta de família. O nome da comunidade continua em
 * petróleo, então a hierarquia de leitura não muda — só ganha um atalho
 * visual antes da leitura.
 */
type Card = {
  slug?: string;
  nome: string;
  modalidade: string;
  regiao: string;
  quando: string;
  nivel: string;
  acolheIniciante?: boolean;
};

// Fallback estático: mantém a home funcional sem banco (build, preview, pane).
const CARDS_ESTATICOS: Card[] = [
  {
    nome: "Run club matinal",
    modalidade: "corrida",
    regiao: "Asa Sul",
    quando: "TER · QUI 06H15 — PARQUE DA CIDADE",
    nivel: "Todos os ritmos",
  },
  {
    nome: "Jiu-jítsu",
    modalidade: "jiu-jítsu",
    regiao: "Noroeste",
    quando: "SEG–SEX 19H — TATAME ABERTO",
    nivel: "Iniciantes bem-vindos",
    acolheIniciante: true,
  },
  {
    nome: "Yoga ao ar livre",
    modalidade: "yoga",
    regiao: "Asa Norte",
    quando: "SÁB 08H — PARQUE OLHOS D'ÁGUA",
    nivel: "Leve seu tapete",
  },
  {
    nome: "Funcional",
    modalidade: "funcional",
    regiao: "Sudoeste",
    quando: "SEG · QUA · SEX 06H30",
    nivel: "Em grupo",
  },
  {
    nome: "Vôlei de areia",
    modalidade: "vôlei",
    regiao: "Lago Sul",
    quando: "DOM 09H — QUADRAS",
    nivel: "Jogo aberto",
  },
  {
    nome: "Pedal de domingo",
    modalidade: "pedal",
    regiao: "Plano Piloto",
    quando: "DOM 07H — EIXÃO DO LAZER",
    nivel: "Ritmo passeio",
  },
];

async function getCards(): Promise<Card[]> {
  if (!process.env.DATABASE_URL) return CARDS_ESTATICOS;
  try {
    const comunidades = await getCommunities();
    if (comunidades.length === 0) return CARDS_ESTATICOS;
    return comunidades.slice(0, 6).map((c) => ({
      slug: c.slug,
      nome: c.nome,
      modalidade: c.modalidade,
      regiao: c.regiao,
      quando: [c.horarios, c.local].filter(Boolean).join(" — ").toUpperCase(),
      nivel: c.nivel ?? c.modalidade,
      acolheIniciante: c.acolheIniciante,
    }));
  } catch {
    // Banco fora do ar não pode derrubar a home — cai no recorte estático.
    return CARDS_ESTATICOS;
  }
}

export default async function Vitrine() {
  const cards = await getCards();

  return (
    <section id="comunidades" className="mx-auto max-w-6xl px-5 py-20">
      <p className="eyebrow mb-3">O que já acontece na cidade</p>
      <h2 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        Brasília treina todo dia. Você é que não estava vendo.
      </h2>

      {/* Legenda das famílias: o que a cor quer dizer. Sem isso, a cor é
          decoração; com isso, vira atalho de leitura. */}
      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
        {LEGENDA_FAMILIAS.map((f) => (
          <li
            key={f.acento}
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-petroleo/55"
          >
            <span
              aria-hidden
              className={`h-2.5 w-2.5 rounded-full ${classesDoAcento(f.acento).traco}`}
            />
            {f.rotulo}
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const acento = acentoDaModalidade(c.modalidade);
          const cor = classesDoAcento(acento);
          const familia = familiaDaModalidade(c.modalidade);

          const conteudo = (
            <>
              {/* Traço da categoria: o reconhecimento acontece aqui, antes
                  mesmo de a pessoa ler o nome. */}
              <span aria-hidden className={`block h-1 w-12 rounded-full ${cor.traco}`} />

              <div className="mt-4 flex items-start justify-between gap-3">
                <h3 className="font-display text-xl font-bold">{c.nome}</h3>
                {/* Mesma etiqueta de região que o `<CardComunidade>` do L1
                    usa na descoberta — antes eram duas receitas diferentes
                    pra mesma informação, o que fazia a home e a
                    `/comunidades` parecerem de sites diferentes. */}
                <Badge variant="outline" className="shrink-0">
                  {c.regiao}
                </Badge>
              </div>

              <p className={`mt-3 font-mono text-xs uppercase tracking-[0.14em] ${cor.tinta}`}>
                {c.quando}
              </p>
              <p className="mt-2 text-sm text-petroleo/60">
                {c.nivel}
                {familia && (
                  <span className="text-petroleo/40"> · {familia}</span>
                )}
              </p>
              {c.acolheIniciante && <SeloAcolheIniciante className="mt-3" />}
            </>
          );

          // O raio e a borda saem do `<Card>`; a COR DA FAMÍLIA continua no
          // `<article>`, e essa divisão NÃO é arbitrária.
          //
          // A primeira versão desta migração jogou `cor.fundo` no `<Card>` e
          // deixou o `<article>` sem classe — e `tests/landing.spec.ts` ficou
          // vermelho na hora ("card sem fundo: rgba(0,0,0,0)"). Aquele teste
          // é a trava da SAFELIST: o acento é escolhido em runtime, então sem
          // ele o card sai colorido em dev e cinza em produção. Ele mede o
          // fundo computado de `#comunidades article` — e mudar o seletor
          // dele pra acompanhar o refactor teria sido consertar o
          // instrumento em vez da peça. Com a cor onde sempre esteve, o
          // teste continua medindo o mesmo lugar, sem uma linha alterada.
          //
          // Visualmente é idêntico: o `<article>` preenche o card inteiro
          // (`h-full` + o padding), e o `overflow-hidden` do `<Card>` recorta
          // a cor no raio da marca.
          const estilo = cn("group block h-full p-6", cor.fundo);

          // O `<Card>` carrega o estilo NOS DOIS CASOS, e o `<Link>` é só
          // casca de navegação.
          //
          // Antes não era assim: com slug, a cor ficava no `<Link>` e o
          // `<article>` ia sem classe nenhuma. Visualmente dava no mesmo, mas
          // o DOM mudava de forma dependendo de o banco ter comunidade ou não
          // — e foi exatamente isso que fez o teste da safelist passar com o
          // banco vazio e falhar com o banco cheio. Teste que depende do
          // estado do seed é o tipo de verde que o projeto já decidiu não
          // aceitar (ver a nota do handoff de 06/08).
          const cartao = (
            <Card className="h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:border-petroleo/25">
              <article className={estilo}>{conteudo}</article>
            </Card>
          );

          return c.slug ? (
            <Link key={c.nome} href={`/comunidades/${c.slug}`} className="block">
              {cartao}
            </Link>
          ) : (
            <div key={c.nome}>{cartao}</div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="font-mono text-xs text-petroleo/45">
          * Recorte ilustrativo. As comunidades parceiras serão anunciadas no
          lançamento.
        </p>
        <Link
          href="/comunidades"
          className="font-mono text-xs uppercase tracking-[0.14em] text-petroleo/70 underline underline-offset-4 hover:text-petroleo"
        >
          Ver todas as comunidades →
        </Link>
      </div>
    </section>
  );
}
