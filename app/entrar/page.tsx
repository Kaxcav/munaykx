import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EntrarForm from "@/components/EntrarForm";
import { authDisponivel } from "@/lib/auth";
import { sessaoAtual } from "@/lib/sessao";
import { emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta MUNAY com um link no e-mail — sem senha.",
  robots: { index: false, follow: false },
};

export default async function EntrarPage() {
  // Sem segredo de sessão, `sessaoAtual()` devolve null em vez de lançar —
  // e a página cai no aviso de "ainda não configurado" logo abaixo, que é o
  // que ela já sabia fazer. Antes, lançava antes de chegar nesse aviso.
  const sessao = await sessaoAtual();
  if (sessao) redirect("/minhas-inscricoes");

  // Precisa das duas pontas: segredo de sessão E provedor de e-mail.
  const disponivel = authDisponivel() && emailConfigurado();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-20">
        <p className="eyebrow">Sua conta</p>
        <h1 className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Entrar na MUNAY
        </h1>
        <p className="mt-4 max-w-xl text-petroleo/70">
          Sua conta serve pra acompanhar as inscrições que você já fez. Pra se
          inscrever em um evento você não precisa de conta nenhuma — nunca vai
          precisar.
        </p>

        <div className="mt-10">
          {disponivel ? (
            <EntrarForm disponivel />
          ) : (
            <div className="max-w-md rounded-card border border-petroleo/15 bg-white/70 p-8">
              <p className="font-display text-xl font-bold">
                Acesso por link ainda não está configurado
              </p>
              <p className="mt-2 text-petroleo/70">
                O envio de e-mail depende de configuração no servidor. Enquanto
                isso, você continua se inscrevendo nos eventos normalmente,
                sem conta.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
