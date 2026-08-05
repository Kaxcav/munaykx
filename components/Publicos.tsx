export default function Publicos() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-6">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* B2C */}
        <div className="rounded-card border border-petroleo/10 bg-white/70 p-8 md:p-10">
          <p className="eyebrow mb-3">Pra quem quer começar</p>
          <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Você não precisa de coragem. Precisa de contexto.
          </h3>
          <ul className="mt-6 space-y-3 text-petroleo/80">
            <li className="flex gap-3">
              <span aria-hidden className="mt-1 text-petroleo">✓</span>
              Encontre grupos do seu nível, no seu horário, na sua região
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="mt-1 text-petroleo">✓</span>
              Saiba a vibe antes de ir: quem organiza, como é o treino, quem vai
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="mt-1 text-petroleo">✓</span>
              Comece acompanhado — a parte mais difícil deixa de existir
            </li>
          </ul>
          <a
            href="#cadastro"
            className="mt-8 inline-block rounded-full bg-petroleo px-6 py-3 font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
          >
            Entrar na lista de espera
          </a>
        </div>

        {/* B2B */}
        <div className="rounded-card bg-petroleo p-8 text-areia md:p-10">
          <p className="eyebrow-dark mb-3">Pra quem já organiza</p>
          <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Sua comunidade merece ser encontrada.
          </h3>
          <ul className="mt-6 space-y-3 text-areia/85">
            <li className="flex gap-3">
              <span aria-hidden className="mt-1 text-lime">✓</span>
              Apareça pra quem está procurando exatamente a sua modalidade
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="mt-1 text-lime">✓</span>
              Divulgue eventos e organize sua turma num lugar só
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="mt-1 text-lime">✓</span>
              Sem precisar criar tecnologia própria nem depender só do Instagram
            </li>
          </ul>
          <a
            href="#organizador"
            className="mt-8 inline-block rounded-full border-2 border-areia/30 px-6 py-3 font-semibold text-areia transition-colors hover:border-lime hover:text-lime"
          >
            Quero ser parceiro
          </a>
        </div>
      </div>
    </section>
  );
}
