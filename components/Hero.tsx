import PlanoPiloto from "./PlanoPiloto";

/**
 * Primeira dobra.
 *
 * BRIEFING 07/08/2026, ITEM 1 — o que SAIU daqui e por quê:
 * a linha "Corrida · lutas · yoga · funcional · e o que mais a cidade tiver"
 * foi removida. Palavras do PO: "o texto está descritivo demais e funciona
 * mais como uma lista de categorias do que como um convite emocional. Não
 * comunica a sofisticação e o movimento que a marca MUNAY quer transmitir
 * logo na primeira dobra."
 *
 * Não foi trocada por outra lista. O lugar dela agora é um convite no tom
 * do item 7 ("Dá uma conferida aí"), e quem mostra a variedade de
 * modalidade passou a ser a cor dos cards da vitrine (item 3) — imagem
 * fazendo o trabalho que o texto fazia mal.
 */
export default function Hero() {
  return (
    <section id="topo" className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="eyebrow mb-6 flex items-center gap-2.5">
            <span aria-hidden className="h-2 w-2 rounded-full bg-salvia" />
            Brasília · DF — a lista já está aberta
          </p>

          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Chegar sozinho é só na{" "}
            <span className="rounded-md bg-lime px-2">primeira vez</span>.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-petroleo/80">
            Tem treino, roda e jogo rolando agora a dez minutos de você — e
            você provavelmente nem sabe. A MUNAY mostra o que já acontece na
            cidade, com a informação que importa: onde é, que horas, quem vai
            e se pega bem chegar sem conhecer ninguém.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#cadastro"
              className="rounded-full bg-petroleo px-7 py-3.5 font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
            >
              Bora, quero entrar
            </a>
            <a
              href="#organizador"
              className="rounded-full border-2 border-salvia bg-salvia-soft px-7 py-3.5 font-semibold text-salvia-deep transition-colors hover:bg-salvia-deep hover:text-areia"
            >
              Eu que organizo
            </a>
          </div>

          <p className="mt-6 max-w-md text-sm text-petroleo/55">
            Dá uma conferida aí. Depois não diz que ninguém te avisou.
          </p>
        </div>

        <div className="justify-self-center lg:justify-self-end">
          <PlanoPiloto />
        </div>
      </div>
    </section>
  );
}
