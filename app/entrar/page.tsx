import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EntrarForm from "@/components/EntrarForm";
import { Pagina } from "@/components/comum/Pagina";
import { Card } from "@/components/ui/card";
import { authDisponivel } from "@/lib/auth";
import { sessaoAtual } from "@/lib/sessao";
import { emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta MUNAY com um link no e-mail — sem senha.",
  robots: { index: false, follow: false },
};

/**
 * Só caminho relativo same-origin: começa com "/", nunca "//" (que o navegador
 * trata como outro host) nem esquema. Barra open-redirect via `?proximo=`.
 */
function caminhoSeguro(p: string | undefined): string | null {
  if (!p || !p.startsWith("/") || p.startsWith("//")) return null;
  if (p.includes("://") || p.includes("\\")) return null;
  return p;
}

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  const { proximo } = await searchParams;
  // Pra onde ir depois do login: o `?proximo=` validado (ex.: voltar pra
  // comunidade e completar o seguir) ou as inscrições, como sempre.
  const destino = caminhoSeguro(proximo) ?? "/minhas-inscricoes";

  // Sem segredo de sessão, `sessaoAtual()` devolve null em vez de lançar —
  // e a página cai no aviso de "ainda não configurado" logo abaixo, que é o
  // que ela já sabia fazer. Antes, lançava antes de chegar nesse aviso.
  const sessao = await sessaoAtual();
  if (sessao) redirect(destino);

  // Precisa das duas pontas: segredo de sessão E provedor de e-mail.
  const disponivel = authDisponivel() && emailConfigurado();

  return (
    <>
      <Header />
      <Pagina
        eyebrow="Sua conta"
        titulo="Entrar na MUNAY"
        descricao="Sua conta serve pra acompanhar as inscrições que você já fez. Pra se inscrever em um evento você não precisa de conta nenhuma — nunca vai precisar."
      >
        <div className="mt-10">
          {disponivel ? (
            <EntrarForm disponivel callbackURL={destino} />
          ) : (
            <Card className="max-w-md bg-card/70 p-8">
              <p className="font-display text-xl font-bold">
                Acesso por link ainda não está configurado
              </p>
              <p className="mt-2 text-foreground/70">
                O envio de e-mail depende de configuração no servidor. Enquanto
                isso, você continua se inscrevendo nos eventos normalmente,
                sem conta.
              </p>
            </Card>
          )}
        </div>
      </Pagina>
      <Footer />
    </>
  );
}
