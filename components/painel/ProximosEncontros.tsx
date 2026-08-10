import type { OcorrenciaConcreta } from "@/lib/ocorrencias";
import {
  cancelarOcorrenciaAction,
  alterarLocalOcorrenciaAction,
  desfazerExcecaoAction,
} from "@/app/painel/(interno)/comunidades/[slug]/horarios/actions";

/**
 * PRÓXIMOS ENCONTROS — as datas concretas da grade, onde o organizador cancela
 * ou altera UM dia (a "sexta chuvosa"). Sem isto, cancelar um treino por chuva
 * exigiria apagar a grade toda ou criar-e-cancelar um evento — e o dono perde a
 * confiança na primeira sexta molhada. A grade semanal (o padrão) segue
 * intacta; aqui muda só o dia.
 */

/** "2026-09-05" → "05/09". */
function diaMes(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export default function ProximosEncontros({
  ocorrencias,
  slug,
}: {
  ocorrencias: OcorrenciaConcreta[];
  slug: string;
}) {
  if (ocorrencias.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold">Próximos encontros</h2>
      <p className="mt-2 max-w-2xl text-sm text-petroleo/80">
        As próximas datas da sua grade. Choveu, feriado, imprevisto? Cancele ou
        mude o local <strong>só naquele dia</strong> — a grade semanal continua
        como está.
      </p>

      <ul className="mt-4 space-y-2">
        {ocorrencias.map((o) => {
          const rotulo = `${o.diaSemanaRotulo}, ${diaMes(o.dataISO)} às ${o.horaInicio}`;
          return (
            <li
              key={`${o.horarioId}-${o.dataISO}`}
              className="rounded-xl border border-petroleo/10 bg-white/60 px-5 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={
                    o.cancelada
                      ? "font-medium text-petroleo/50 line-through"
                      : "font-medium"
                  }
                >
                  {rotulo}
                </span>

                {o.cancelada ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="rounded-full bg-destructive/10 px-3 py-0.5 text-xs font-semibold text-destructive">
                      Cancelado
                    </span>
                    <DesfazerBotao slug={slug} excecaoId={o.excecaoId!} rotulo="Reativar" />
                  </span>
                ) : o.localAlterado ? (
                  <span className="inline-flex items-center gap-2 text-sm">
                    <span className="text-petroleo/80">
                      Hoje em: <strong>{o.localAlterado}</strong>
                    </span>
                    <DesfazerBotao slug={slug} excecaoId={o.excecaoId!} rotulo="Voltar ao normal" />
                  </span>
                ) : (
                  <AcoesDoDia slug={slug} horarioId={o.horarioId} data={o.dataISO} />
                )}
              </div>

              {o.observacao ? (
                <p className="mt-2 text-sm text-petroleo/80">{o.observacao}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DesfazerBotao({
  slug,
  excecaoId,
  rotulo,
}: {
  slug: string;
  excecaoId: string;
  rotulo: string;
}) {
  return (
    <form action={desfazerExcecaoAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="excecaoId" value={excecaoId} />
      <button
        type="submit"
        className="text-sm font-semibold text-petroleo underline underline-offset-4 hover:opacity-70"
      >
        {rotulo}
      </button>
    </form>
  );
}

/** As duas ações de um dia normal, escondidas atrás de um disclosure pra não
 *  poluir a lista: cancelar (com motivo opcional) e mudar o local. */
function AcoesDoDia({
  slug,
  horarioId,
  data,
}: {
  slug: string;
  horarioId: string;
  data: string;
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold text-petroleo underline underline-offset-4 hover:opacity-70">
        Cancelar ou mudar
      </summary>
      <div className="mt-3 space-y-3 rounded-lg border border-petroleo/10 bg-areia/40 p-4">
        <form action={cancelarOcorrenciaAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="horarioId" value={horarioId} />
          <input type="hidden" name="data" value={data} />
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-semibold">
              Motivo (opcional, aparece pra quem for)
            </span>
            <input
              name="observacao"
              maxLength={200}
              placeholder="Ex.: cancelado por chuva"
              className="w-full rounded-lg border border-petroleo/20 bg-white p-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-petroleo px-4 py-2 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
          >
            Cancelar este dia
          </button>
        </form>

        <form action={alterarLocalOcorrenciaAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="horarioId" value={horarioId} />
          <input type="hidden" name="data" value={data} />
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-semibold">
              Mudar o local só neste dia
            </span>
            <input
              name="localAlterado"
              maxLength={200}
              placeholder="Ex.: hoje a saída é do portão 3"
              className="w-full rounded-lg border border-petroleo/20 bg-white p-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-full border border-petroleo/30 px-4 py-2 text-sm font-semibold transition-colors hover:border-petroleo/60"
          >
            Salvar local
          </button>
        </form>
      </div>
    </details>
  );
}
