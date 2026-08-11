import { Card } from "@/components/ui/card";

/**
 * Briefing 07/08/2026, itens 6 e 7: mais verde sálvia e tom de voz próximo,
 * coloquial, sem corporativês. A copy antiga ("Do primeiro treino à rotina:
 * agenda da turma, próximos eventos e avisos num lugar só") descrevia
 * funcionalidade; esta descreve o que a pessoa sente.
 */
const PASSOS = [
  {
    n: "01",
    titulo: "Fuça",
    texto:
      "Filtra por modalidade, região, horário e nível. Aparece o que existe perto de você — inclusive o que nunca passou no seu feed porque não paga tráfego.",
  },
  {
    n: "02",
    titulo: "Chega junto",
    texto:
      "Antes de sair de casa você já sabe quem organiza, onde é, que horas começa e se o grupo recebe iniciante. Ninguém merece chegar no escuro.",
  },
  {
    n: "03",
    titulo: "Fica",
    texto:
      "Do primeiro treino ao dia em que você é quem chama os outros. Agenda, próximos rolês e avisos num lugar só — não num grupo com 400 pessoas mudo.",
  },
];

export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-20">
      <p className="eyebrow mb-3">Como funciona</p>
      <h2 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        Três passos entre você e a sua próxima turma
      </h2>

      {/* `<Card>` por fora, `<article>` por dentro — o mesmo arranjo que o
          `<CardComunidade>` do L1 usa. O `<Card>` não tem `asChild` (é
          `<div>` puro, sem Radix Slot, pra não virar client component), e a
          semântica de artigo não se perde por isso. */}
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {PASSOS.map((p) => (
          <Card
            key={p.n}
            className="border-salvia/35 bg-salvia-soft p-7 transition-colors hover:border-salvia"
          >
            <article>
              <p className="font-mono text-sm font-semibold text-salvia-deep">{p.n}</p>
              <h3 className="mt-3 font-display text-2xl font-bold">{p.titulo}</h3>
              <p className="mt-3 leading-relaxed text-petroleo/75">{p.texto}</p>
            </article>
          </Card>
        ))}
      </div>
    </section>
  );
}
