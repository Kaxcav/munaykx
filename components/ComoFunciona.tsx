const PASSOS = [
  {
    n: "01",
    titulo: "Descubra",
    texto:
      "Filtre por modalidade, região, horário e nível. Veja o que existe perto de você — inclusive o que nunca apareceu no seu feed.",
  },
  {
    n: "02",
    titulo: "Chegue junto",
    texto:
      "Antes de ir, você já sabe como funciona: quem organiza, onde é, que horas começa e se o grupo recebe iniciantes. Sem chegar no escuro.",
  },
  {
    n: "03",
    titulo: "Faça parte",
    texto:
      "Do primeiro treino à rotina: agenda da turma, próximos eventos e avisos num lugar só. Comunidade de verdade, não grupo perdido.",
  },
];

export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-20">
      <p className="eyebrow mb-3">Como funciona</p>
      <h2 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        Três passos entre você e a sua próxima turma
      </h2>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {PASSOS.map((p) => (
          <article
            key={p.n}
            className="rounded-card border border-petroleo/10 bg-white/70 p-7"
          >
            <p className="font-mono text-sm text-petroleo/50">{p.n}</p>
            <h3 className="mt-3 font-display text-2xl font-bold">{p.titulo}</h3>
            <p className="mt-3 leading-relaxed text-petroleo/75">{p.texto}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
