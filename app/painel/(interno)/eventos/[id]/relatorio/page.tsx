import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { formatarDataAdmin } from "@/lib/admin";
import { relatorioPosEvento } from "@/lib/relatorio-evento";

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
    <>
      <Link
        href={`/painel/eventos/${evento.id}`}
        className="font-mono text-xs uppercase tracking-wider text-petroleo/60 hover:text-petroleo"
      >
        ← {evento.titulo}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
        Relatório do encontro
      </h1>
      <p className="mt-2 text-sm text-petroleo/70">
        {evento.comunidadeNome} · {formatarDataAdmin(evento.startsAt)}
      </p>

      {!passado ? (
        <p className="mt-6 rounded-xl border border-petroleo/15 bg-white/70 p-4 text-sm text-petroleo/80">
          Este encontro ainda não aconteceu — os números são <strong>preliminares</strong> e vão se
          fechar depois do evento (principalmente a presença, que depende do check-in).
        </p>
      ) : !metricas.houveCheckin ? (
        <p className="mt-6 rounded-xl border border-petroleo/15 bg-white/70 p-4 text-sm text-petroleo/80">
          Você ainda não marcou presença de ninguém. Marque o check-in na{" "}
          <Link href={`/painel/eventos/${evento.id}`} className="underline">
            tela do evento
          </Link>{" "}
          pra ver comparecimento e faltas.
        </p>
      ) : null}

      {/* ── Presença ─────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Presença</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Cartao rotulo="Confirmados" valor={metricas.confirmados} />
          <Cartao
            rotulo="Presentes"
            valor={metricas.houveCheckin ? metricas.presentes : "—"}
            dica={metricas.houveCheckin ? "check-in marcado" : "sem check-in"}
          />
          <Cartao
            rotulo="Faltas"
            valor={metricas.houveCheckin ? metricas.faltas : "—"}
            dica={metricas.houveCheckin ? "confirmaram e não vieram" : undefined}
          />
          <Cartao
            rotulo="Comparecimento"
            valor={
              metricas.houveCheckin ? formatarPct(metricas.taxaComparecimento) : "—"
            }
            destaque
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Cartao rotulo="Lista de espera" valor={metricas.fila} />
          <Cartao rotulo="Cancelaram" valor={metricas.cancelados} />
          <Cartao
            rotulo="Capacidade"
            valor={metricas.capacidade ?? "—"}
            dica={metricas.capacidade ? undefined : "não definida"}
          />
          <Cartao
            rotulo="Lotação"
            valor={metricas.lotacao !== null ? formatarPct(metricas.lotacao) : "—"}
          />
        </div>
      </section>

      {/* ── Público (agregado) ───────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Quem veio</h2>
        <p className="mt-1 text-sm text-petroleo/60">
          Só números — o público em agregado, nunca pessoa a pessoa.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Cartao
            rotulo="De primeira vez"
            valor={publico.novos}
            dica="nunca tinham se inscrito"
            destaque
          />
          <Cartao rotulo="Já conheciam" valor={publico.retornantes} dica="voltaram" />
          <Cartao rotulo="Seguidores da comunidade" valor={publico.seguidores} />
        </div>
      </section>

      {/* ── Comparação com o anterior ────────────────────────────── */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Comparado ao encontro anterior</h2>
        {anterior ? (
          <>
            <p className="mt-1 text-sm text-petroleo/60">
              {anterior.titulo} · {formatarDataAdmin(anterior.startsAt)}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          </>
        ) : (
          <p className="mt-3 text-sm text-petroleo/70">
            Este é o primeiro encontro da comunidade por aqui — a partir do próximo, dá pra
            comparar a evolução.
          </p>
        )}
      </section>

      <p className="mt-10 text-xs text-petroleo/50">
        Relatório interno e agregado. Para a lista nominal dos inscritos (nome, e-mail), use a{" "}
        <Link href={`/painel/eventos/${evento.id}`} className="underline">
          tela do evento
        </Link>{" "}
        ou o CSV.
      </p>
    </>
  );
}

function Cartao({
  rotulo,
  valor,
  dica,
  destaque,
}: {
  rotulo: string;
  valor: number | string;
  dica?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border p-4 " +
        (destaque ? "border-petroleo/20 bg-petroleo text-areia" : "border-petroleo/10 bg-white/70")
      }
    >
      <p
        className={
          "font-mono text-[0.65rem] uppercase tracking-wider " +
          (destaque ? "text-areia/70" : "text-petroleo/50")
        }
      >
        {rotulo}
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold leading-none">{valor}</p>
      {dica ? (
        <p className={"mt-1 text-xs " + (destaque ? "text-areia/70" : "text-petroleo/55")}>{dica}</p>
      ) : null}
    </div>
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
    if (diff === 0) delta = { texto: "igual", cor: "text-petroleo/50" };
    else if (diff > 0)
      delta = { texto: `+${diff}${sufixo}`, cor: "text-petroleo" };
    else delta = { texto: `${diff}${sufixo}`, cor: "text-destructive" };
  }

  return (
    <div className="rounded-2xl border border-petroleo/10 bg-white/70 p-4">
      <p className="font-mono text-[0.65rem] uppercase tracking-wider text-petroleo/50">{rotulo}</p>
      <p className="mt-1 font-display text-2xl font-extrabold leading-none">
        {fmt(agora)}
        <span className="ml-2 align-middle text-sm font-normal text-petroleo/50">
          antes {fmt(antes)}
        </span>
      </p>
      {delta ? <p className={"mt-1 text-xs font-semibold " + delta.cor}>{delta.texto}</p> : null}
    </div>
  );
}
