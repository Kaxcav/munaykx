import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { EMAIL_CONTATO } from "@/lib/contato";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Quais dados a MUNAY coleta, pra quê, e como pedir a exclusão. LGPD em linguagem simples.",
};

// Fonte única em lib/contato.ts — este endereço é canal do titular de
// dados (LGPD) e não pode divergir do rodapé nem apontar pra domínio morto.

export default function PrivacidadePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-20">
        <p className="eyebrow mb-3">LGPD</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Política de privacidade
        </h1>
        <p className="mt-4 text-petroleo/70">
          Sem juridiquês: isto aqui explica o que coletamos, pra quê, e como
          você tira seus dados daqui. Atualizada em agosto de 2026.
        </p>

        <div className="mt-12 space-y-10">
          <section>
            <h2 className="font-display text-xl font-bold">
              O que coletamos
            </h2>
            <p className="mt-3 text-petroleo/80">
              Só o que você digita nos nossos formulários:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-petroleo/80">
              <li>
                <strong>Lista de espera:</strong> nome, e-mail, WhatsApp
                (opcional) e, se você contar, sua região e o que quer praticar
                — ou o nome da sua comunidade e modalidade, no caso de
                organizadores.
              </li>
              <li>
                <strong>Inscrição em evento (RSVP):</strong> nome, e-mail e
                WhatsApp (opcional).
              </li>
            </ul>
            <p className="mt-3 text-petroleo/80">
              Não pedimos documento, endereço, dado financeiro nem nada
              sensível.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold">Pra que usamos</h2>
            <p className="mt-3 text-petroleo/80">
              Duas finalidades, e só essas: falar com você sobre a MUNAY
              (lançamento, novidades, sua região) e gerenciar inscrições em
              eventos (confirmação, lista de espera, avisos do evento). Nada de
              spam.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold">
              Com quem compartilhamos
            </h2>
            <p className="mt-3 text-petroleo/80">
              Não vendemos nem alugamos seus dados a terceiros. Eles ficam em
              banco de dados próprio, hospedado em provedor de infraestrutura
              (Railway), e só a equipe da MUNAY acessa.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold">Cookies e métricas</h2>
            <p className="mt-3 text-petroleo/80">
              Usamos apenas analytics anônimo e agregado (Umami) pra entender
              quantas pessoas visitam o site e o que funciona — sem cookies de
              rastreamento individual, sem perfil de navegação, sem te seguir
              pela internet.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold">Seus direitos</h2>
            <p className="mt-3 text-petroleo/80">
              A qualquer momento você pode pedir pra ver, corrigir ou{" "}
              <strong>excluir</strong> seus dados. É só mandar um e-mail pra{" "}
              <a
                href={`mailto:${EMAIL_CONTATO}`}
                className="underline underline-offset-4"
              >
                {EMAIL_CONTATO}
              </a>{" "}
              do endereço que você cadastrou. A gente confirma e apaga — sem
              enrolação e sem perguntar o motivo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold">Dúvidas</h2>
            <p className="mt-3 text-petroleo/80">
              Qualquer pergunta sobre esta política:{" "}
              <a
                href={`mailto:${EMAIL_CONTATO}`}
                className="underline underline-offset-4"
              >
                {EMAIL_CONTATO}
              </a>
              . Se algo mudar por aqui, atualizamos esta página.
            </p>
          </section>
        </div>

        <Link
          href="/"
          className="mt-14 inline-block font-mono text-xs uppercase tracking-[0.14em] text-petroleo/60 hover:text-petroleo"
        >
          ← Voltar pro início
        </Link>
      </main>
      <Footer />
    </>
  );
}
