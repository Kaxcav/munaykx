import Link from "next/link";
import { getCommunities } from "@/lib/communities";

/**
 * IMPORTANTE (jurídico/edital): NÃO publicar nomes de parceiros reais
 * (Liga Entrequadras, MOAI, Gracie Barra, Evolve etc.) sem autorização
 * formal de uso de marca. Os dados do banco são seed demo, por modalidade.
 * Quando os parceiros-âncora confirmarem, substituir no banco.
 */
type Card = {
  slug?: string;
  nome: string;
  regiao: string;
  quando: string;
  nivel: string;
};

// Fallback estático: mantém a home funcional sem banco (build, preview, pane).
const CARDS_ESTATICOS: Card[] = [
  {
    nome: "Run club matinal",
    regiao: "Asa Sul",
    quando: "TER · QUI 06H15 — PARQUE DA CIDADE",
    nivel: "Todos os ritmos",
  },
  {
    nome: "Jiu-jítsu",
    regiao: "Noroeste",
    quando: "SEG–SEX 19H — TATAME ABERTO",
    nivel: "Iniciantes bem-vindos",
  },
  {
    nome: "Yoga ao ar livre",
    regiao: "Asa Norte",
    quando: "SÁB 08H — PARQUE OLHOS D'ÁGUA",
    nivel: "Leve seu tapete",
  },
  {
    nome: "Funcional",
    regiao: "Sudoeste",
    quando: "SEG · QUA · SEX 06H30",
    nivel: "Em grupo",
  },
  {
    nome: "Vôlei de areia",
    regiao: "Lago Sul",
    quando: "DOM 09H — QUADRAS",
    nivel: "Jogo aberto",
  },
  {
    nome: "Pedal de domingo",
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
      regiao: c.regiao,
      quando: [c.horarios, c.local].filter(Boolean).join(" — ").toUpperCase(),
      nivel: c.nivel ?? c.modalidade,
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
        Brasília treina todo dia. Você só não estava vendo.
      </h2>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const conteudo = (
            <>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-xl font-bold">{c.nome}</h3>
                <span className="shrink-0 rounded-full border border-petroleo/15 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-petroleo/60">
                  {c.regiao}
                </span>
              </div>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-petroleo/70">
                {c.quando}
              </p>
              <p className="mt-2 text-sm text-petroleo/60">{c.nivel}</p>
            </>
          );

          const estilo =
            "group block rounded-card border border-petroleo/10 bg-white/70 p-6 transition-colors hover:border-petroleo/30";

          return c.slug ? (
            <Link key={c.nome} href={`/comunidades/${c.slug}`} className={estilo}>
              <article>{conteudo}</article>
            </Link>
          ) : (
            <article key={c.nome} className={estilo}>
              {conteudo}
            </article>
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
