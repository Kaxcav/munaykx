import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { formatarDataAdmin } from "@/lib/admin";
import { relatorioPosEvento } from "@/lib/relatorio-evento";
import { Pagina } from "@/components/comum/Pagina";
import { Secao } from "@/components/comum/Secao";
import { Card, CardNumero } from "@/components/ui/card";
import { Aviso } from "@/components/painel/Aviso";

/**
 * RELATÓRIO PÓS-EVENTO — a tela agregada do organizador (interno, LGPD).
 *
 * `relatorioPosEvento` devolve `null` quando o evento não é da pessoa: a página
 * vira **404, nunca 403**, igual ao resto do painel. Só NÚMEROS aqui — nada
 * pessoa a pessoa (a lista nominal vive na tela do evento e no CSV).
 */
export default async function RelatorioEvento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const { id } = await params;
  const rel = await relatorioPosEvento(sessao.user.id, id);
  if (!rel) notFound(); // não é dela (ou não existe): 404

  const { evento, metricas, publico, anterior, passado } = rel;

  return (
    <Pagina
      eyebrow="Relatório"
      titulo="Relatório do encontro"
      voltar={{ href: `/painel/eventos/${evento.id}`, texto: evento.titulo }}
      descricao={
        <span className="tabular-nums">
          {evento.comunidadeNome} · {formatarDataAdmin(evento.startsAt)}
        </span>
      }
    >
      {!passado ? (
        <Aviso className="text-foreground/80">
          Este encontro ainda não aconteceu — os números são{" "}
          <strong>preliminares</strong> e vão se fechar depois do evento
          (principalmente a presença, que depende do check-in).
        </Aviso>
      ) : !metricas.houveCheckin ? (
        <Aviso className="text-foreground/80">
          Você ainda não marcou presença de ninguém. Marque o check-in na{" "}
          <Link href={`/painel/eventos/${evento.id}`} className="underline">
            tela do evento
          </Link>{" "}
          pra ver comparecimento e faltas.
        </Aviso>
      ) : null}

      {/* ── Presença ─────────────────────────────────────────────── */}
      <Secao titulo="Presença" destaque>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CardNumero rotulo="Confirmados" valor={metricas.confirmados} />
          <CardNumero
            rotulo="Presentes"
            valor={metricas.houveCheckin ? metricas.presentes : "—"}
            nota={metricas.houveCheckin ? "check-in marcado" : "sem check-in"}
          />
          <CardNumero
            rotulo="Faltas"
            valor={metricas.houveCheckin ? metricas.faltas : "—"}
            nota={metricas.houveCheckin ? "confirmaram e não vieram" : undefined}
          />
          <CardNumero
            rotulo="Comparecimento"
            valor={
              metricas.houveCheckin ? formatarPct(metricas.taxaComparecimento) : "—"
            }
            destaque
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CardNumero rotulo="Lista de espera" valor={metricas.fila} />
          <CardNumero rotulo="Cancelaram" valor={metricas.cancelados} />
          <CardNumero
            rotulo="Capacidade"
            valor={metricas.capacidade ?? "—"}
            nota={metricas.capacidade ? undefined : "não definida"}
          />
          <CardNumero
            rotulo="Lotação"
            valor={metricas.lotacao !== null ? formatarPct(metricas.lotacao) : "—"}
          />
        </div>
      </Secao>

      {/* ── Público (agregado) ───────────────────────────────────── */}
      <Secao
        titulo="Quem veio"
        destaque
        descricao="Só números — o público em agregado, nunca pessoa a pessoa."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <CardNumero
            rotulo="De primeira vez"
            valor={publico.novos}
            nota="nunca tinham se inscrito"
            destaque
          />
          <CardNumero
            rotulo="Já conheciam"
            valor={publico.retornantes}
            nota="voltaram"
          />
          <CardNumero
            rotulo="Seguidores da comunidade"
            valor={publico.seguidores}
          />
        </div>
      </Secao>

      {/* ── Comparação com o anterior ────────────────────────────── */}
      <Secao
        titulo="Comparado ao encontro anterior"
        destaque
        descricao={
          anterior ? (
            <span className="tabular-nums">
              {anterior.titulo} · {formatarDataAdmin(anterior.startsAt)}
            </span>
          ) : undefined
        }
      >
        {anterior ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Comparativo
              rotulo="Confirmados"
              agora={metricas.confirmados}
              antes={anterior.metricas.confirmados}
            />
            <Comparativo
              rotulo="Presentes"
              agora={metricas.houveCheckin ? metricas.presentes : null}
              antes={anterior.metricas.houveCheckin ? anterior.metricas.presentes : null}
            />
            <Comparativo
              rotulo="Comparecimento"
              agora={metricas.houveCheckin ? metricas.taxaComparecimento : null}
              antes={anterior.metricas.houveCheckin ? anterior.metricas.taxaComparecimento : null}
              percentual
            />
          </div>
        ) : (
          <p className="text-sm text-foreground/70">
            Este é o primeiro encontro da comunidade por aqui — a partir do próximo,
            dá pra comparar a evolução.
          </p>
        )}
      </Secao>

      <p className="mt-10 text-xs text-foreground/50">
        Relatório interno e agregado. Para a lista nominal dos inscritos (nome,
        e-mail), use a{" "}
        <Link href={`/painel/eventos/${evento.id}`} className="underline">
          tela do evento
        </Link>{" "}
        ou o CSV.
      </p>
    </Pagina>
  );
}

/** Formata razão (0–1) como porcentagem inteira. */
function formatarPct(v: number | null): string {
  if (v === null) return "—";
  return `${Math.round(v * 100)}%`;
}

/**
 * Um número agora vs. antes, com a variação. Aceita razões (percentual) ou
 * contagens. `null` em qualquer lado = "sem base pra comparar".
 *
 * Não vira `<CardNumero>` porque ele mostra UM número e este mostra três
 * (agora, antes e o delta) — forçar a peça aqui seria remontar o miolo dela
 * por fora. O que ele reusa é o `<Card>`, que é onde estava a duplicação.
 */
function Comparativo({
  rotulo,
  agora,
  antes,
  percentual,
}: {
  rotulo: string;
  agora: number | null;
  antes: number | null;
  percentual?: boolean;
}) {
  const fmt = (v: number | null) =>
    v === null ? "—" : percentual ? `${Math.round(v * 100)}%` : String(v);

  let delta: { texto: string; cor: string } | null = null;
  if (agora !== null && antes !== null) {
    const diff = percentual ? Math.round(agora * 100) - Math.round(antes * 100) : agora - antes;
    const sufixo = percentual ? " p.p." : "";
    if (diff === 0) delta = { texto: "igual", cor: "text-muted-foreground" };
    else if (diff > 0)
      delta = { texto: `+${diff}${sufixo}`, cor: "text-foreground" };
    else delta = { texto: `${diff}${sufixo}`, cor: "text-destructive" };
  }

  return (
    <Card className="p-6">
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </p>
      <p className="mt-2 font-display text-4xl font-extrabold tabular-nums leading-none">
        {fmt(agora)}
        <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
          antes {fmt(antes)}
        </span>
      </p>
      {delta ? (
        <p className={"mt-1 text-xs font-semibold tabular-nums " + delta.cor}>
          {delta.texto}
        </p>
      ) : null}
    </Card>
  );
}
