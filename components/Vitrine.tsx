/**
 * IMPORTANTE (jurídico/edital): NÃO publicar nomes de parceiros reais
 * (Liga Entrequadras, MOAI, Gracie Barra, Evolve etc.) sem autorização
 * formal de uso de marca. Estes cards são ilustrativos, por modalidade.
 * Quando os parceiros-âncora confirmarem, substituir aqui.
 */
const CARDS = [
  {
    modalidade: "Run club matinal",
    regiao: "Asa Sul",
    quando: "TER · QUI 06H15 — PARQUE DA CIDADE",
    nivel: "Todos os ritmos",
  },
  {
    modalidade: "Jiu-jítsu",
    regiao: "Noroeste",
    quando: "SEG–SEX 19H — TATAME ABERTO",
    nivel: "Iniciantes bem-vindos",
  },
  {
    modalidade: "Yoga ao ar livre",
    regiao: "Asa Norte",
    quando: "SÁB 08H — PARQUE OLHOS D'ÁGUA",
    nivel: "Leve seu tapete",
  },
  {
    modalidade: "Funcional",
    regiao: "Sudoeste",
    quando: "SEG · QUA · SEX 06H30",
    nivel: "Em grupo",
  },
  {
    modalidade: "Vôlei de areia",
    regiao: "Lago Sul",
    quando: "DOM 09H — QUADRAS",
    nivel: "Jogo aberto",
  },
  {
    modalidade: "Pedal de domingo",
    regiao: "Plano Piloto",
    quando: "DOM 07H — EIXÃO DO LAZER",
    nivel: "Ritmo passeio",
  },
];

export default function Vitrine() {
  return (
    <section id="comunidades" className="mx-auto max-w-6xl px-5 py-20">
      <p className="eyebrow mb-3">O que já acontece na cidade</p>
      <h2 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        Brasília treina todo dia. Você só não estava vendo.
      </h2>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <article
            key={c.modalidade}
            className="group rounded-card border border-petroleo/10 bg-white/70 p-6 transition-colors hover:border-petroleo/30"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl font-bold">{c.modalidade}</h3>
              <span className="shrink-0 rounded-full border border-petroleo/15 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-petroleo/60">
                {c.regiao}
              </span>
            </div>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-petroleo/70">
              {c.quando}
            </p>
            <p className="mt-2 text-sm text-petroleo/60">{c.nivel}</p>
          </article>
        ))}
      </div>

      <p className="mt-6 font-mono text-xs text-petroleo/45">
        * Recorte ilustrativo. As comunidades parceiras serão anunciadas no
        lançamento.
      </p>
    </section>
  );
}
