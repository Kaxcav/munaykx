import { BLOCO_ESCURO, BOTAO_CONTORNO_ESCURO } from "@/components/landing/Escuro";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Os dois lados do marketplace, lado a lado.
 *
 * Briefing 07/08/2026: tom coloquial (item 7) e mais sálvia (item 6). O card
 * do organizador ganhou peso de propósito — a RECOMENDAÇÃO ESTRATÉGICA do
 * briefing diz que Organizadores é a seção que sustenta o ecossistema
 * inteiro ("é o motor"), porque é ela que gera receita direta e traz a
 * oferta que o usuário final vem buscar.
 */
export default function Publicos() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-6">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* B2C */}
        <Card className="border-salvia/35 bg-salvia-soft p-8 md:p-10">
          <p className="eyebrow mb-3">Pra quem quer começar</p>
          <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Não é coragem que falta. É contexto.
          </h3>
          <ul className="mt-6 space-y-3 text-petroleo/80">
            {[
              "Grupo do seu nível, no seu horário, na sua região",
              "Você sabe a vibe antes de ir: quem organiza, como é o treino, quem vai",
              "Começa acompanhado — e a parte difícil simplesmente deixa de existir",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="mt-1 font-bold text-salvia-deep">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          {/* Continua `<a>` com âncora relativa, não `<Link>`: `#cadastro`
              está NESTA página, e o scroll suave do `globals.css` faz o
              trabalho sem passar pelo roteador. Só a classe mudou. */}
          <a href="#cadastro" className={buttonVariants({ className: "mt-8" })}>
            Entrar na lista
          </a>
        </Card>

        {/* B2B/B2S — ver PainelFuncional para a definição do modelo (item 4.1) */}
        <Card className={`p-8 md:p-10 ${BLOCO_ESCURO}`}>
          <p className="eyebrow-dark mb-3">Pra quem já organiza</p>
          <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Sua comunidade merece ser achada.
          </h3>
          <ul className="mt-6 space-y-3 text-areia/85">
            {[
              "Você aparece pra quem está procurando exatamente a sua modalidade",
              "Divulga o rolê e organiza a turma num lugar só",
              "Sem construir tecnologia e sem depender do humor do algoritmo",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="mt-1 font-bold text-lime">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <a
            href="#organizador"
            className={buttonVariants({
              variant: "outline",
              className: `mt-8 ${BOTAO_CONTORNO_ESCURO}`,
            })}
          >
            Quero ser parceiro
          </a>
        </Card>
      </div>
    </section>
  );
}
