import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadeDoUsuario } from "@/lib/organizacao";
import {
  DIAS,
  LIMITE_HORARIOS,
  horariosDaComunidade,
  rotularHorario,
} from "@/lib/horarios";
import { proximasDaComunidade } from "@/lib/ocorrencias";
import { iaDisponivel } from "@/lib/ai";
import { Pagina } from "@/components/comum/Pagina";
import { Secao } from "@/components/comum/Secao";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, SelectNativo } from "@/components/ui/input";
import { Aviso } from "@/components/painel/Aviso";
import { Campo } from "@/components/painel/Campo";
import ProximosEncontros from "@/components/painel/ProximosEncontros";
import GradePorTexto from "@/components/painel/GradePorTexto";
import { adicionarHorarioAction, removerHorarioAction } from "./actions";

/**
 * HORÁRIOS RECORRENTES de uma comunidade — a entrada de dado da FASE 0.
 *
 * `comunidadeDoUsuario` devolve `null` quando não é dela, e a página vira
 * **404, nunca 403** — o mesmo contrato do resto do painel.
 *
 * Por que uma tela só pra isso, em vez de mais campos no form de edição: o
 * horário é uma LISTA (uma comunidade tem vários), e lista com adicionar/remover
 * dentro de um formulário de salvar-tudo vira um form que salva pela metade. A
 * sub-rota também mantém este trabalho longe do form que outra frente pode
 * estar editando ao mesmo tempo.
 */
export default async function HorariosDaComunidade({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const { slug } = await params;
  const com = await comunidadeDoUsuario(sessao.user.id, slug);
  if (!com) notFound(); // não é dela (ou não existe): 404, nunca 403

  const horarios = (await horariosDaComunidade(sessao.user.id, slug)) ?? [];
  const ocorrencias = (await proximasDaComunidade(sessao.user.id, slug)) ?? [];
  const { ok, erro } = await searchParams;
  const cheio = horarios.length >= LIMITE_HORARIOS;

  return (
    <Pagina
      eyebrow="Horários"
      titulo={com.nome}
      voltar={{
        href: `/painel/comunidades/${encodeURIComponent(com.slug)}`,
        texto: "Voltar para a comunidade",
      }}
      descricao={
        <>
          Os dias e horas que se repetem toda semana. É isto que coloca a{" "}
          <strong>{com.regiao}</strong> no mapa por horário — quem procura
          &ldquo;terça 6h&rdquo; só encontra quem cadastrou aqui.
        </>
      }
    >
      <p className="mt-3 max-w-2xl text-sm text-foreground/60">
        O mapa mostra a <strong>região</strong>, nunca o ponto exato de encontro.
        Seu campo de horário escrito à mão continua aparecendo na página da
        comunidade, do jeito que você escreveu.
      </p>

      {ok ? <Aviso>Pronto ✓</Aviso> : null}
      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

      <Secao
        titulo={
          horarios.length === 0
            ? "Nenhum horário ainda"
            : `${horarios.length} ${horarios.length === 1 ? "horário" : "horários"}`
        }
        destaque
      >
        {horarios.length === 0 ? (
          <p className="max-w-2xl text-foreground/70">
            Sem horário cadastrado, a comunidade continua no site normalmente — ela
            só não aparece quando alguém filtra o mapa por dia e hora.
          </p>
        ) : (
          <ul className="space-y-2">
            {horarios.map((h) => (
              <li key={h.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <span className="font-medium tabular-nums">
                    {rotularHorario(h)}
                  </span>
                  <form action={removerHorarioAction}>
                    <input type="hidden" name="slug" value={com.slug} />
                    <input type="hidden" name="horarioId" value={h.id} />
                    <Button
                      type="submit"
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-destructive hover:text-destructive/70"
                    >
                      Remover
                    </Button>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <ProximosEncontros ocorrencias={ocorrencias} slug={com.slug} />

      {/* O normalizador só aparece quando há IA configurada E ainda cabe
          horário. Sem chave, a seção nem renderiza: melhor não existir do que
          existir quebrada — o formulário manual abaixo é o caminho de sempre. */}
      {iaDisponivel() && !cheio ? <GradePorTexto slug={com.slug} /> : null}

      {cheio ? (
        <Aviso className="mt-8 text-foreground/70">
          Você chegou ao limite de {LIMITE_HORARIOS} horários. Remova um para
          adicionar outro.
        </Aviso>
      ) : (
        <Card className="mt-10 p-6">
          <form action={adicionarHorarioAction}>
            <input type="hidden" name="slug" value={com.slug} />
            <h2 className="font-display text-xl font-bold">Adicionar horário</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Campo rotulo="Dia">
                <SelectNativo name="diaSemana" defaultValue={2}>
                  {DIAS.map((d) => (
                    <option key={d.indice} value={d.indice}>
                      {d.nome}
                    </option>
                  ))}
                </SelectNativo>
              </Campo>
              <Campo rotulo="Começa">
                <Input type="time" name="horaInicio" required defaultValue="06:15" />
              </Campo>
              <Campo rotulo="Termina" opcional>
                <Input type="time" name="horaFim" />
              </Campo>
            </div>
            <p className="mt-3 text-xs text-foreground/55">
              Sem hora de término, a gente considera uma hora de duração no mapa.
            </p>
            <Button type="submit" className="mt-5">
              Adicionar
            </Button>
          </form>
        </Card>
      )}
    </Pagina>
  );
}
