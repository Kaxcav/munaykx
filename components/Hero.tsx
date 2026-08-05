import PlanoPiloto from "./PlanoPiloto";

export default function Hero() {
  return (
    <section id="topo" className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="eyebrow mb-6">Brasília · DF — lista de espera aberta</p>

          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Chegar sozinho é só na{" "}
            <span className="rounded-md bg-lime px-2">primeira vez</span>.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-petroleo/80">
            A MUNAY conecta você às comunidades, eventos e experiências
            esportivas e culturais de Brasília — filtradas por modalidade,
            região, horário e nível. Do primeiro treino à sua nova turma.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#cadastro"
              className="rounded-full bg-petroleo px-7 py-3.5 font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
            >
              Quero participar
            </a>
            <a
              href="#organizador"
              className="rounded-full border-2 border-petroleo/25 px-7 py-3.5 font-semibold transition-colors hover:border-petroleo"
            >
              Organizo uma comunidade
            </a>
          </div>

          <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-petroleo/50">
            Corrida · lutas · yoga · funcional · e o que mais a cidade tiver
          </p>
        </div>

        <div className="justify-self-center lg:justify-self-end">
          <PlanoPiloto />
        </div>
      </div>
    </section>
  );
}
