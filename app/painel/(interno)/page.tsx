import Link from "next/link";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadesDoUsuario, organizacoesDe } from "@/lib/organizacao";
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
      <div className="rounded-card border border-petroleo/15 bg-white/70 p-8">
        <p className="eyebrow">Sua conta</p>
        <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight">
          Você ainda não organiza nenhuma comunidade
        </h1>
        <p className="mt-3 max-w-xl text-petroleo/70">
          Cadastre a sua e, depois de uma conferência rápida da nossa parte, ela
          entra no ar. A partir daí você gerencia eventos, inscritos e presença
          por aqui.
        </p>
        <Link
          href="/painel/nova"
          className="mt-6 inline-block rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
        >
          Cadastrar comunidade
        </Link>
      </div>
    );
  }

  const comunidades = await comunidadesDoUsuario(sessao.user.id);
  const semana = await estaSemana(sessao.user.id);

  return (
    <>
      <p className="eyebrow">Sua conta</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
        Seu painel
      </h1>

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

      <h2 className="mt-12 font-display text-2xl font-bold">Minhas comunidades</h2>
      <ul className="mt-6 space-y-4">
        {comunidades.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-petroleo/10 p-6"
          >
            <div>
              <h3 className="font-display text-xl font-bold">{c.nome}</h3>
              <p className="mt-1 text-sm text-petroleo/70">
                {c.modalidade} · {c.regiao} · {c._count.events} evento(s) ·{" "}
                {c._count.membros} seguidor(es)
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-petroleo/50">
                {c.statusPublicacao === "aprovada"
                  ? "no ar"
                  : c.statusPublicacao === "pendente"
                    ? "aguardando aprovação"
                    : "recusada"}
                {!c.ativo ? " · pausada" : ""}
              </p>
            </div>
            <Link
              href={`/painel/comunidades/${c.slug}`}
              className="rounded-full border border-petroleo/20 px-5 py-2 text-sm font-semibold transition-colors hover:border-petroleo/50"
            >
              Gerenciar
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
