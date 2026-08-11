import Link from "next/link";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadesDoUsuario, organizacoesDe } from "@/lib/organizacao";
import { Pagina } from "@/components/comum/Pagina";
import { Secao } from "@/components/comum/Secao";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import Copiloto from "@/components/painel/Copiloto";
import EstaSemana from "@/components/painel/EstaSemana";
import { estaSemana } from "@/lib/painel-hoje";
import { iaDisponivel } from "@/lib/ai";
import { sugestoes } from "@/lib/ai/copiloto";

/**
 * `/painel` — as comunidades da organização da pessoa.
 *
 * Quem NÃO organiza nada não vê erro: vê o convite pra cadastrar (RODADA §C).
 * Toda leitura passa por `lib/organizacao.ts` — nenhuma página do painel fala
 * com o Prisma direto.
 */
export default async function PainelHome() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const orgs = await organizacoesDe(sessao.user.id);

  if (orgs.length === 0) {
    return (
      <Pagina eyebrow="Sua conta" titulo="Seu painel">
        <EstadoVazio
          titulo="Você ainda não organiza nenhuma comunidade"
          descricao="Cadastre a sua e, depois de uma conferência rápida da nossa parte, ela entra no ar. A partir daí você gerencia eventos, inscritos e presença por aqui."
          acao={
            <Link href="/painel/nova" className={buttonVariants()}>
              Cadastrar comunidade
            </Link>
          }
        />
      </Pagina>
    );
  }

  const comunidades = await comunidadesDoUsuario(sessao.user.id);
  const semana = await estaSemana(sessao.user.id);

  return (
    <Pagina eyebrow="Sua conta" titulo="Seu painel">
      {/* HOJE / ESTA SEMANA (PR3): a home por frequência de uso — o próximo
          encontro primeiro, com a ação grande à mão. Só aparece quando há o quê
          mostrar (grade cadastrada ou evento futuro); senão, silêncio. */}
      <EstaSemana itens={semana} />

      {/* COPILOTO (ideia #4): só aparece quando a IA está ligada — a UI não
          oferece o que o ambiente não entrega, mesma regra do e-mail. */}
      {iaDisponivel() ? (
        <div className="mt-8">
          <Copiloto exemplos={sugestoes()} />
        </div>
      ) : null}

      <Secao titulo="Minhas comunidades" destaque>
        <ul className="space-y-4">
          {comunidades.map((c) => (
            // `<Card>` é um `<div>`; ele vai DENTRO do `<li>` e não no lugar
            // dele, senão a lista perde a semântica que o leitor de tela usa
            // pra anunciar "item 3 de 7".
            <li key={c.id}>
              <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
                <div>
                  <h3 className="font-display text-xl font-bold">{c.nome}</h3>
                  <p className="mt-1 text-sm text-foreground/70">
                    {c.modalidade} · {c.regiao} · {c._count.events} evento(s) ·{" "}
                    {c._count.membros} seguidor(es)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge
                      variant={
                        c.statusPublicacao === "aprovada" ? "default" : "outline"
                      }
                    >
                      {c.statusPublicacao === "aprovada"
                        ? "no ar"
                        : c.statusPublicacao === "pendente"
                          ? "aguardando aprovação"
                          : "recusada"}
                    </Badge>
                    {!c.ativo ? <Badge variant="outline">pausada</Badge> : null}
                  </div>
                </div>
                <Link
                  href={`/painel/comunidades/${c.slug}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Gerenciar
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      </Secao>
    </Pagina>
  );
}
